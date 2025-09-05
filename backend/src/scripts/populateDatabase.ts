import { SpotifyService } from '../services/spotifyService';
import { mlService } from '../services/mlService';
import fs from 'fs/promises';
import path from 'path';

interface PopulationConfig {
  batchSize: number;
  maxTracks: number;
  delayBetweenBatches: number;
  genres: string[];
  minPopularity: number;
  resumeFrom?: number;
}

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
  audio_features?: any;
  popularity: number;
  release_date: string;
  embedding?: number[];
  mood_tags: string[];
  energy_level: 'low' | 'medium' | 'high';
}

interface PopulationProgress {
  currentBatch: number;
  totalProcessed: number;
  successfullyProcessed: number;
  errors: number;
  lastGenre: string;
  startTime: number;
  estimatedCompletion?: number;
}

export class MusicDatabasePopulator {
  private spotifyService: SpotifyService;
  private progressFile: string;
  private backupDir: string;
  private config: PopulationConfig;

  constructor(config: PopulationConfig) {
    this.spotifyService = new SpotifyService();
    this.config = config;
    this.progressFile = path.join(process.cwd(), 'data', 'population_progress.json');
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
  }

  // Main population method
  async populateDatabase(): Promise<void> {
    console.log('🎵 Starting music database population...');
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Load or create progress
    let progress = await this.loadProgress();
    
    try {
      for (const genre of this.config.genres) {
        if (progress.lastGenre && this.config.genres.indexOf(genre) < this.config.genres.indexOf(progress.lastGenre)) {
          console.log(`⏭️  Skipping ${genre} (already processed)`);
          continue;
        }

        console.log(`🎶 Processing genre: ${genre}`);
        progress.lastGenre = genre;
        
        await this.processGenre(genre, progress);
        
        if (progress.totalProcessed >= this.config.maxTracks) {
          console.log('✅ Maximum tracks reached');
          break;
        }
      }

      console.log('🎉 Database population completed successfully!');
      await this.generateSummaryReport(progress);

    } catch (error) {
      console.error('❌ Error during population:', error);
      await this.saveProgress(progress);
      throw error;
    }
  }

  // Process tracks for a specific genre
  private async processGenre(genre: string, progress: PopulationProgress): Promise<void> {
    let offset = this.config.resumeFrom || 0;
    let hasMoreTracks = true;

    while (hasMoreTracks && progress.totalProcessed < this.config.maxTracks) {
      try {
        console.log(`📦 Fetching batch ${progress.currentBatch + 1} for ${genre} (offset: ${offset})`);
        
        // Fetch tracks from Spotify
        const searchQuery = `genre:${genre}`;
        const spotifyTracks = await this.spotifyService.searchMusic(
          searchQuery,
          this.config.batchSize
        );

        if (spotifyTracks.results.length === 0) {
          console.log(`✅ No more tracks for ${genre}`);
          hasMoreTracks = false;
          break;
        }

        // Filter tracks by popularity
        const filteredTracks = spotifyTracks.results.filter(
          track => (track.popularity || 0) >= this.config.minPopularity
        );

        console.log(`🔍 Processing ${filteredTracks.length} tracks from batch`);

        // Process tracks in parallel (with concurrency limit)
        const processedTracks = await this.processBatch(filteredTracks, genre);
        
        // Store in vector database
        if (processedTracks.length > 0) {
          await this.storeInVectorDatabase(processedTracks);
          progress.successfullyProcessed += processedTracks.length;
        }

        // Update progress
        progress.currentBatch++;
        progress.totalProcessed += filteredTracks.length;
        offset += this.config.batchSize;

        // Save progress periodically
        await this.saveProgress(progress);
        
        // Create backup every 100 batches
        if (progress.currentBatch % 100 === 0) {
          await this.createBackup(progress);
        }

        // Rate limiting delay
        await this.delay(this.config.delayBetweenBatches);

        // Update ETA
        this.updateETA(progress);

      } catch (error) {
        console.error(`❌ Error processing batch for ${genre}:`, error);
        progress.errors++;
        
        // Continue with next batch on error
        offset += this.config.batchSize;
        progress.currentBatch++;
        
        await this.saveProgress(progress);
      }
    }
  }

  // Process a batch of tracks
  private async processBatch(tracks: any[], genre: string): Promise<TrackData[]> {
    const processedTracks: TrackData[] = [];
    const concurrencyLimit = 5; // Process 5 tracks at a time
    
    for (let i = 0; i < tracks.length; i += concurrencyLimit) {
      const batch = tracks.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (track) => {
        try {
          return await this.processTrack(track, genre);
        } catch (error) {
          console.error(`Error processing track ${track.title}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Filter out null results and add to processed tracks
      batchResults.forEach(result => {
        if (result) {
          processedTracks.push(result);
        }
      });
    }

    return processedTracks;
  }

  // Process individual track
  private async processTrack(spotifyTrack: any, genre: string): Promise<TrackData | null> {
    try {
      console.log(`🎤 Processing: ${spotifyTrack.title} by ${spotifyTrack.artist}`);

      // Get audio features from Spotify
      const audioFeatures = await this.spotifyService.getAudioFeatures(spotifyTrack.id);
      
      // Generate mood tags based on audio features
      const moodTags = this.generateMoodTags(audioFeatures);
      
      // Determine energy level
      const energyLevel = this.categorizeEnergyLevel(audioFeatures?.energy || 0.5);

      // Extract audio features using ML service (if preview available)
      let embedding: number[] | undefined;
      if (spotifyTrack.preview_url) {
        try {
          const mlFeatures = await mlService.extractAudioFeatures(spotifyTrack.preview_url);
          // Convert audio features to embedding vector
          embedding = this.audioFeaturesToEmbedding(mlFeatures.features);
        } catch (error) {
          console.warn(`Could not extract ML features for ${spotifyTrack.title}`);
        }
      }

      const trackData: TrackData = {
        id: spotifyTrack.id,
        title: spotifyTrack.title,
        artist: spotifyTrack.artist,
        album: spotifyTrack.album || 'Unknown Album',
        genre: genre,
        duration: spotifyTrack.duration || 0,
        preview_url: spotifyTrack.preview_url,
        external_urls: spotifyTrack.external_urls || { spotify: '' },
        audio_features: audioFeatures,
        popularity: spotifyTrack.popularity || 0,
        release_date: spotifyTrack.release_date || new Date().toISOString(),
        embedding,
        mood_tags: moodTags,
        energy_level: energyLevel
      };

      return trackData;

    } catch (error) {
      console.error(`Failed to process track ${spotifyTrack.title}:`, error);
      return null;
    }
  }

  // Generate mood tags based on audio features
  private generateMoodTags(audioFeatures: any): string[] {
    if (!audioFeatures) return ['unknown'];

    const tags: string[] = [];
    
    // Valence-based moods
    if (audioFeatures.valence > 0.7) {
      tags.push('happy', 'uplifting', 'positive');
    } else if (audioFeatures.valence < 0.3) {
      tags.push('sad', 'melancholic', 'introspective');
    } else {
      tags.push('neutral', 'balanced');
    }

    // Energy-based moods
    if (audioFeatures.energy > 0.7) {
      tags.push('energetic', 'intense', 'powerful');
    } else if (audioFeatures.energy < 0.3) {
      tags.push('calm', 'peaceful', 'relaxing');
    }

    // Danceability-based moods
    if (audioFeatures.danceability > 0.7) {
      tags.push('danceable', 'groovy', 'rhythmic');
    }

    // Acousticness-based moods
    if (audioFeatures.acousticness > 0.7) {
      tags.push('acoustic', 'organic', 'intimate');
    }

    // Instrumentalness-based moods
    if (audioFeatures.instrumentalness > 0.7) {
      tags.push('instrumental', 'ambient', 'atmospheric');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  // Categorize energy level
  private categorizeEnergyLevel(energy: number): 'low' | 'medium' | 'high' {
    if (energy < 0.33) return 'low';
    if (energy < 0.66) return 'medium';
    return 'high';
  }

  // Convert audio features to embedding vector
  private audioFeaturesToEmbedding(features: any): number[] {
    // Create a fixed-size embedding from audio features
    return [
      features.tempo || 120,
      features.energy || 0.5,
      features.danceability || 0.5,
      features.valence || 0.5,
      features.acousticness || 0.5,
      features.instrumentalness || 0.5,
      features.liveness || 0.5,
      features.speechiness || 0.5,
      features.loudness || -10
    ].map(val => typeof val === 'number' ? val : 0);
  }

  // Store tracks in vector database
  private async storeInVectorDatabase(tracks: TrackData[]): Promise<void> {
    try {
      console.log(`💾 Storing ${tracks.length} tracks in vector database...`);
      
      // Create vectors for Qdrant
      const vectors = tracks.map(track => ({
        id: track.id,
        vector: track.embedding || this.audioFeaturesToEmbedding(track.audio_features || {}),
        payload: {
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: track.genre,
          mood_tags: track.mood_tags,
          energy_level: track.energy_level,
          popularity: track.popularity,
          duration: track.duration,
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          audio_features: track.audio_features,
          release_date: track.release_date
        }
      }));

      // Store in ML service (which handles Qdrant)
      await mlService.vectorSearch(vectors, 'music_database');
      
      console.log(`✅ Successfully stored ${tracks.length} tracks`);

    } catch (error) {
      console.error('❌ Error storing tracks in vector database:', error);
      throw error;
    }
  }

  // Progress management
  private async loadProgress(): Promise<PopulationProgress> {
    try {
      const data = await fs.readFile(this.progressFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Create new progress if file doesn't exist
      const newProgress: PopulationProgress = {
        currentBatch: 0,
        totalProcessed: 0,
        successfullyProcessed: 0,
        errors: 0,
        lastGenre: '',
        startTime: Date.now()
      };
      
      await this.saveProgress(newProgress);
      return newProgress;
    }
  }

  private async saveProgress(progress: PopulationProgress): Promise<void> {
    try {
      await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  // Backup and restore
  private async createBackup(progress: PopulationProgress): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
      
      const backupData = {
        progress,
        timestamp: Date.now(),
        config: this.config
      };

      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`💾 Backup created: ${backupFile}`);

      // Keep only last 10 backups
      await this.cleanupOldBackups();

    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .sort()
        .reverse();

      // Keep only the 10 most recent backups
      for (const file of backupFiles.slice(10)) {
        await fs.unlink(path.join(this.backupDir, file));
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Utility methods
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      path.dirname(this.progressFile),
      this.backupDir
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateETA(progress: PopulationProgress): void {
    const elapsed = Date.now() - progress.startTime;
    const rate = progress.totalProcessed / elapsed; // tracks per ms
    const remaining = this.config.maxTracks - progress.totalProcessed;
    
    if (rate > 0) {
      progress.estimatedCompletion = Date.now() + (remaining / rate);
      
      const eta = new Date(progress.estimatedCompletion);
      console.log(`⏱️  ETA: ${eta.toLocaleString()}`);
    }
  }

  // Reporting
  private async generateSummaryReport(progress: PopulationProgress): Promise<void> {
    const report = {
      summary: {
        totalProcessed: progress.totalProcessed,
        successfullyProcessed: progress.successfullyProcessed,
        errors: progress.errors,
        successRate: (progress.successfullyProcessed / progress.totalProcessed * 100).toFixed(2) + '%',
        totalTime: this.formatDuration(Date.now() - progress.startTime),
        averageTimePerTrack: ((Date.now() - progress.startTime) / progress.totalProcessed).toFixed(2) + 'ms'
      },
      genres: this.config.genres,
      config: this.config,
      timestamp: new Date().toISOString()
    };

    const reportFile = path.join(process.cwd(), 'data', 'population_report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Population Summary:');
    console.log(`✅ Total processed: ${report.summary.totalProcessed}`);
    console.log(`✅ Successful: ${report.summary.successfullyProcessed}`);
    console.log(`❌ Errors: ${report.summary.errors}`);
    console.log(`📈 Success rate: ${report.summary.successRate}`);
    console.log(`⏱️  Total time: ${report.summary.totalTime}`);
    console.log(`📄 Report saved to: ${reportFile}`);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  // Restore from backup
  async restoreFromBackup(backupFile: string): Promise<void> {
    try {
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf-8'));
      await this.saveProgress(backupData.progress);
      console.log(`✅ Restored from backup: ${backupFile}`);
    } catch (error) {
      console.error('❌ Error restoring from backup:', error);
      throw error;
    }
  }
}

// CLI script for running the population
export async function runPopulation(): Promise<void> {
  const config: PopulationConfig = {
    batchSize: 50,
    maxTracks: 10000,
    delayBetweenBatches: 1000, // 1 second
    minPopularity: 30,
    genres: [
      'rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop',
      'country', 'blues', 'reggae', 'folk', 'indie', 'metal',
      'r&b', 'soul', 'funk', 'disco', 'house', 'techno',
      'ambient', 'punk', 'grunge', 'ska', 'latin', 'world'
    ]
  };

  const populator = new MusicDatabasePopulator(config);
  
  try {
    await populator.populateDatabase();
  } catch (error) {
    console.error('Population failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPopulation();
}
