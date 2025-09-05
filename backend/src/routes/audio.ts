import { Router, Request, Response } from 'express';
import { uploadAudio, handleMulterError } from '../middleware/upload';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { mlService } from '../services/mlService';
import { spotifyService } from '../services/spotifyService';
import { ApiResponse, UploadResponse, HumAnalysisResult } from '../types';

const router = Router();

// Upload and process audio for humming/singing recognition
router.post(
  '/hum',
  uploadAudio.single('audio'),
  handleMulterError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    try {
      console.log('Processing audio file:', {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      // Process audio file for humming recognition
      const audioAnalysis: any = await mlService.processAudioForHumming(req.file.path);

      console.log('ML Service analysis result:', audioAnalysis);

      // The ML service returns audio analysis but not song matches
      // We need to create a HumAnalysisResult with matches
      let matches: any[] = [];
      
      // Try to find similar songs using the embeddings if available
      if (audioAnalysis.embeddings && audioAnalysis.embeddings.length > 0) {
        try {
          // Use the ML service vector search to find similar songs
          const similarSongs = await mlService.vectorSearch({
            embeddings: audioAnalysis.embeddings,
            collection: 'music_vectors',
            limit: 10,
            threshold: 0.6
          });
          
          matches = similarSongs.map((song: any) => ({
            id: song.id || Math.random().toString(),
            title: song.metadata?.title || song.metadata?.name || 'Unknown Title',
            artist: song.metadata?.artist || 'Unknown Artist',
            album: song.metadata?.album,
            genre: song.metadata?.genre,
            duration: song.metadata?.duration || song.metadata?.duration_ms,
            preview_url: song.metadata?.preview_url,
            external_urls: song.metadata?.external_urls || 
              (song.metadata?.spotify_url ? { spotify: song.metadata.spotify_url } : {
                spotify: `https://open.spotify.com/search/${encodeURIComponent(
                  `${song.metadata?.title || song.metadata?.name || ''} ${song.metadata?.artist || ''}`
                ).trim()}`
              }),
            similarity_score: song.score || song.confidence,
            confidence: song.score || song.confidence
          }));
          
          console.log(`Found ${matches.length} similar songs using vector search`);
        } catch (vectorSearchError) {
          console.warn('Vector search failed:', vectorSearchError);
          // Continue with empty matches - we'll provide a fallback below
        }
      }
      
      // If no matches found, provide some fallback suggestions based on mood analysis
      if (matches.length === 0 && audioAnalysis.metadata?.mood_analysis) {
        console.log('No vector matches found, using mood-based fallback');
        try {
          const moodQuery = audioAnalysis.metadata.mood_analysis.mood || 'relaxing';
          const spotifyResults = await spotifyService.searchMusic(`${moodQuery} music`, 5);
          
          if (spotifyResults.results) {
            matches = spotifyResults.results.map((track: any) => ({
              ...track,
              similarity_score: 0.3, // Lower confidence for fallback results
              confidence: 0.3,
              fallback: true
            }));
            console.log(`Using ${matches.length} mood-based fallback songs`);
          }
        } catch (fallbackError) {
          console.warn('Mood-based fallback failed:', fallbackError);
        }
      }

      const analysisResult: HumAnalysisResult = {
        matches,
        confidence: matches.length > 0 ? Math.max(...matches.map(m => m.confidence || 0)) : 0,
        processing_time: audioAnalysis.processing_time || 0,
        audio_features: {
          tempo: audioAnalysis.metadata?.tempo,
          key: audioAnalysis.metadata?.key,
          energy: audioAnalysis.metadata?.energy_level,
          mood: audioAnalysis.metadata?.mood_analysis?.mood,
          mood_confidence: audioAnalysis.metadata?.mood_analysis?.mood_confidence,
          embedding_dimensions: audioAnalysis.metadata?.embedding_dimensions,
          duration: audioAnalysis.metadata?.duration
        } as any
      };

      const uploadResponse: UploadResponse = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedAt: new Date().toISOString()
      };

      const response: ApiResponse<{
        upload: UploadResponse;
        analysis: HumAnalysisResult;
      }> = {
        success: true,
        data: {
          upload: uploadResponse,
          analysis: analysisResult
        },
        message: 'Audio uploaded and processed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Audio processing error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        mlServiceUrl: process.env.ML_SERVICE_URL
      });
      throw new AppError(`Failed to process audio for music recognition: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  })
);

// Analyze audio features
router.post(
  '/analyze',
  uploadAudio.single('audio'),
  handleMulterError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    try {
      // Extract audio features
      const features = await mlService.extractAudioFeatures(req.file.path);

      const uploadResponse: UploadResponse = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedAt: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        data: {
          upload: uploadResponse,
          features
        },
        message: 'Audio features extracted successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Audio analysis error:', error);
      throw new AppError('Failed to extract audio features', 500);
    }
  })
);

export default router;
