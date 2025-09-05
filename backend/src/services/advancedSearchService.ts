import { SearchFilters, MultiModalSearchRequest, SearchMusicResponse, MusicResult, SearchRankingOptions, SearchSuggestion, SearchHistoryItem } from '../types';
import { mlService } from './mlService';
import { spotifyService } from './spotifyService';

export class AdvancedSearchService {
  private searchHistory: SearchHistoryItem[] = [];
  private popularQueries: Map<string, number> = new Map();

  // Multi-modal search combining different input types
  async multiModalSearch(request: MultiModalSearchRequest): Promise<SearchMusicResponse> {
    const startTime = Date.now();
    let allResults: MusicResult[] = [];
    const searchMetadata = {
      search_type: request.type,
      filters_applied: request.filters,
      ranking_method: 'weighted_hybrid',
      vector_similarity: true,
      total_matches: 0
    };

    try {
      switch (request.type) {
        case 'image_text':
          allResults = await this.searchImageWithText(request);
          break;
        case 'image_audio':
          allResults = await this.searchImageWithAudio(request);
          break;
        case 'text_audio':
          allResults = await this.searchTextWithAudio(request);
          break;
        case 'combined':
          allResults = await this.searchCombinedModalities(request);
          break;
        default:
          throw new Error(`Unsupported search type: ${request.type}`);
      }

      // Apply filters
      if (request.filters) {
        allResults = this.applyFilters(allResults, request.filters);
      }

      // Rank and sort results
      allResults = this.rankResults(allResults, {
        weights: {
          similarity: 0.4,
          popularity: 0.3,
          recency: 0.2,
          mood_match: 0.1
        }
      });

      // Apply pagination
      const offset = request.offset || 0;
      const limit = request.limit || 10;
      const paginatedResults = allResults.slice(offset, offset + limit);

      searchMetadata.total_matches = allResults.length;
      
      const processingTime = Date.now() - startTime;

      // Store in search history
      this.addToSearchHistory(request, paginatedResults.length, processingTime);

      return {
        results: paginatedResults,
        total: allResults.length,
        query: this.buildQueryString(request),
        processing_time: processingTime,
        search_metadata: searchMetadata
      };

    } catch (error) {
      console.error('Multi-modal search error:', error);
      throw new Error('Failed to perform multi-modal search');
    }
  }

  // Search combining image and text description
  private async searchImageWithText(request: MultiModalSearchRequest): Promise<MusicResult[]> {
    const promises: Promise<MusicResult[]>[] = [];

    // Image-based search
    if (request.image) {
      promises.push(mlService.processImageForMusicSearch(request.image).then(res => res.results));
    }

    // Text-based search
    if (request.text || request.description) {
      const textQuery = request.text || request.description || '';
      promises.push(spotifyService.searchMusic(textQuery).then(res => res.results));
    }

    const results = await Promise.all(promises);
    return this.combineAndDeduplicateResults(results);
  }

  // Search combining image and audio
  private async searchImageWithAudio(request: MultiModalSearchRequest): Promise<MusicResult[]> {
    const promises: Promise<MusicResult[]>[] = [];

    // Image-based search
    if (request.image) {
      promises.push(mlService.processImageForMusicSearch(request.image).then(res => res.results));
    }

    // Audio-based search
    if (request.audio) {
      promises.push(mlService.processAudioForHumming(request.audio).then(res => res.matches));
    }

    const results = await Promise.all(promises);
    return this.combineAndDeduplicateResults(results);
  }

  // Search combining text and audio
  private async searchTextWithAudio(request: MultiModalSearchRequest): Promise<MusicResult[]> {
    const promises: Promise<MusicResult[]>[] = [];

    // Text-based search
    if (request.text || request.description) {
      const textQuery = request.text || request.description || '';
      promises.push(spotifyService.searchMusic(textQuery).then(res => res.results));
    }

    // Audio-based search
    if (request.audio) {
      promises.push(mlService.processAudioForHumming(request.audio).then(res => res.matches));
    }

    const results = await Promise.all(promises);
    return this.combineAndDeduplicateResults(results);
  }

  // Search combining all modalities
  private async searchCombinedModalities(request: MultiModalSearchRequest): Promise<MusicResult[]> {
    const promises: Promise<MusicResult[]>[] = [];

    // Image-based search
    if (request.image) {
      promises.push(mlService.processImageForMusicSearch(request.image).then(res => res.results));
    }

    // Audio-based search
    if (request.audio) {
      promises.push(mlService.processAudioForHumming(request.audio).then(res => res.matches));
    }

    // Text-based search
    if (request.text || request.description) {
      const textQuery = request.text || request.description || '';
      promises.push(spotifyService.searchMusic(textQuery).then(res => res.results));
    }

    const results = await Promise.all(promises);
    return this.combineAndDeduplicateResults(results);
  }

  // Combine and deduplicate results from multiple sources
  private combineAndDeduplicateResults(resultSets: MusicResult[][]): MusicResult[] {
    const combined: Map<string, MusicResult> = new Map();
    const trackScores: Map<string, number[]> = new Map();

    resultSets.forEach((results) => {
      results.forEach((track, trackIndex) => {
        const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
        
        if (!combined.has(key)) {
          combined.set(key, { ...track });
          trackScores.set(key, []);
        }

        // Boost score based on appearing in multiple result sets
        const currentScores = trackScores.get(key) || [];
        const score = track.similarity_score || (1 - trackIndex / results.length);
        currentScores.push(score);
        trackScores.set(key, currentScores);

        // Update the track with boosted similarity score
        const existingTrack = combined.get(key)!;
        const avgScore = currentScores.reduce((a, b) => a + b, 0) / currentScores.length;
        const multiModalBoost = currentScores.length > 1 ? 1.2 : 1.0;
        
        existingTrack.similarity_score = avgScore * multiModalBoost;
      });
    });

    return Array.from(combined.values()).sort((a, b) => 
      (b.similarity_score || 0) - (a.similarity_score || 0)
    );
  }

  // Apply filters to search results
  private applyFilters(results: MusicResult[], filters: SearchFilters): MusicResult[] {
    return results.filter(track => {
      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        const trackGenres = [track.genre, ...(track.genre_tags || [])].filter(Boolean);
        if (!trackGenres.some(genre => 
          filters.genres!.some(filterGenre => 
            genre?.toLowerCase().includes(filterGenre.toLowerCase())
          )
        )) {
          return false;
        }
      }

      // Mood filter
      if (filters.mood && filters.mood.length > 0) {
        const trackMoods = track.mood_tags || [];
        if (!trackMoods.some(mood => 
          filters.mood!.some(filterMood => 
            mood.toLowerCase().includes(filterMood.toLowerCase())
          )
        )) {
          return false;
        }
      }

      // Audio feature filters
      const features = track.audio_features;
      if (features) {
        if (filters.tempo) {
          const tempo = features.tempo || 0;
          if (filters.tempo.min && tempo < filters.tempo.min) return false;
          if (filters.tempo.max && tempo > filters.tempo.max) return false;
        }

        if (filters.energy) {
          const energy = features.energy || 0;
          if (filters.energy.min && energy < filters.energy.min) return false;
          if (filters.energy.max && energy > filters.energy.max) return false;
        }

        if (filters.danceability) {
          const danceability = features.danceability || 0;
          if (filters.danceability.min && danceability < filters.danceability.min) return false;
          if (filters.danceability.max && danceability > filters.danceability.max) return false;
        }

        if (filters.valence) {
          const valence = features.valence || 0;
          if (filters.valence.min && valence < filters.valence.min) return false;
          if (filters.valence.max && valence > filters.valence.max) return false;
        }
      }

      // Duration filter
      if (filters.duration && track.duration) {
        const durationMs = track.duration;
        if (filters.duration.min && durationMs < filters.duration.min * 1000) return false;
        if (filters.duration.max && durationMs > filters.duration.max * 1000) return false;
      }

      // Year filter (if release_date is available)
      if (filters.year && track.release_date) {
        const year = new Date(track.release_date).getFullYear();
        if (filters.year.min && year < filters.year.min) return false;
        if (filters.year.max && year > filters.year.max) return false;
      }

      return true;
    });
  }

  // Rank results using weighted scoring
  private rankResults(results: MusicResult[], options: SearchRankingOptions): MusicResult[] {
    const weights = options.weights || {
      similarity: 0.4,
      popularity: 0.3,
      recency: 0.2,
      mood_match: 0.1
    };

    return results.map(track => {
      let rankingScore = 0;

      // Similarity score
      if (track.similarity_score) {
        rankingScore += track.similarity_score * weights.similarity!;
      }

      // Popularity score
      if (track.popularity) {
        rankingScore += (track.popularity / 100) * weights.popularity!;
      }

      // Recency score (boost newer tracks slightly)
      if (track.release_date) {
        const releaseYear = new Date(track.release_date).getFullYear();
        const currentYear = new Date().getFullYear();
        const recencyScore = Math.max(0, 1 - (currentYear - releaseYear) / 50);
        rankingScore += recencyScore * weights.recency!;
      }

      // Mood match score (based on audio features alignment)
      if (track.audio_features) {
        const moodScore = this.calculateMoodMatchScore(track.audio_features);
        rankingScore += moodScore * weights.mood_match!;
      }

      track.ranking_score = rankingScore;
      return track;
    }).sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));
  }

  // Calculate mood match score based on audio features
  private calculateMoodMatchScore(features: any): number {
    // This could be enhanced with ML models, but for now use simple heuristics
    const valence = features.valence || 0.5;
    const energy = features.energy || 0.5;
    const danceability = features.danceability || 0.5;
    
    // Balanced tracks get higher mood match scores
    const balance = 1 - Math.abs(0.5 - (valence + energy + danceability) / 3);
    return balance;
  }

  // Generate search suggestions based on history and popularity
  async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Add popular queries
    const popularMatches = Array.from(this.popularQueries.entries())
      .filter(([q]) => q.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([q, count]) => ({
        query: q,
        type: 'text' as const,
        category: 'Popular',
        popularity_score: count
      }));

    suggestions.push(...popularMatches);

    // Add mood suggestions
    const moodSuggestions = this.getMoodSuggestions(query);
    suggestions.push(...moodSuggestions);

    // Add genre suggestions
    const genreSuggestions = this.getGenreSuggestions(query);
    suggestions.push(...genreSuggestions);

    return suggestions.slice(0, limit);
  }

  // Get search history
  getSearchHistory(limit: number = 50): SearchHistoryItem[] {
    return this.searchHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Add item to search history
  private addToSearchHistory(request: MultiModalSearchRequest, resultsCount: number, processingTime: number): void {
    const query = this.buildQueryString(request);
    
    const historyItem: SearchHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      type: this.getSearchType(request),
      filters: request.filters,
      results_count: resultsCount,
      timestamp: new Date().toISOString(),
      processing_time: processingTime
    };

    this.searchHistory.unshift(historyItem);
    
    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(0, 100);
    }

    // Update popular queries
    const currentCount = this.popularQueries.get(query) || 0;
    this.popularQueries.set(query, currentCount + 1);
  }

  // Build query string from request
  private buildQueryString(request: MultiModalSearchRequest): string {
    const parts: string[] = [];
    
    if (request.text) parts.push(request.text);
    if (request.description) parts.push(request.description);
    if (request.image) parts.push('[Image]');
    if (request.audio) parts.push('[Audio]');
    
    return parts.join(' + ') || 'Multi-modal search';
  }

  // Get search type from request
  private getSearchType(request: MultiModalSearchRequest): 'text' | 'image' | 'audio' | 'multimodal' {
    const hasText = !!(request.text || request.description);
    const hasImage = !!request.image;
    const hasAudio = !!request.audio;
    
    const modalityCount = [hasText, hasImage, hasAudio].filter(Boolean).length;
    
    if (modalityCount > 1) return 'multimodal';
    if (hasImage) return 'image';
    if (hasAudio) return 'audio';
    return 'text';
  }

  // Get mood-based suggestions
  private getMoodSuggestions(query: string): SearchSuggestion[] {
    const moods = [
      'happy', 'sad', 'energetic', 'calm', 'romantic', 'aggressive',
      'peaceful', 'uplifting', 'melancholic', 'dreamy', 'intense',
      'relaxing', 'motivational', 'nostalgic', 'mysterious'
    ];

    return moods
      .filter(mood => mood.includes(query.toLowerCase()))
      .map(mood => ({
        query: mood,
        type: 'mood' as const,
        category: 'Mood',
        popularity_score: 0.5
      }));
  }

  // Get genre-based suggestions
  private getGenreSuggestions(query: string): SearchSuggestion[] {
    const genres = [
      'rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop',
      'country', 'blues', 'reggae', 'folk', 'indie', 'metal',
      'R&B', 'soul', 'funk', 'disco', 'house', 'techno'
    ];

    return genres
      .filter(genre => genre.includes(query.toLowerCase()))
      .map(genre => ({
        query: genre,
        type: 'genre' as const,
        category: 'Genre',
        popularity_score: 0.7
      }));
  }
}

// Singleton instance
export const advancedSearchService = new AdvancedSearchService();
