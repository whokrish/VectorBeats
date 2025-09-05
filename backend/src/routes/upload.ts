import { Router, Request, Response } from 'express';
import path from 'path';
import sharp from 'sharp';
import { uploadImage, handleMulterError } from '../middleware/upload';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { spotifyService } from '../services/spotifyService';
import { ApiResponse, UploadResponse, SearchMusicResponse } from '../types';

const router = Router();

// Upload image endpoint for music discovery
router.post(
  '/image',
  uploadImage.single('image'),
  handleMulterError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    try {
      // Process image with Sharp for optimization
      const processedImagePath = req.file.path.replace(
        path.extname(req.file.path), 
        '-processed.jpg'
      );
      
      await sharp(req.file.path)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(processedImagePath);

      let musicResults: SearchMusicResponse;

      try {
        // Try to use ML service for image analysis
        const FormData = require('form-data');
        const fs = require('fs');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(processedImagePath));
        
        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/process-image`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!mlResponse.ok) {
          throw new Error(`ML service responded with status: ${mlResponse.status}`);
        }
        
        const mlResult = await mlResponse.json() as {
          success: boolean;
          embeddings: number[];
          metadata: any;
        };
        
        // Use embeddings to search for similar music
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        const similarityResponse = await fetch(`${process.env.ML_SERVICE_URL}/find-similar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embeddings: mlResult.embeddings,
            collection: 'music_vectors',
            limit: 10,
            threshold: 0.7
          }),
          signal: controller2.signal
        });
        
        clearTimeout(timeoutId2);
        
        if (!similarityResponse.ok) {
          throw new Error('Failed to find similar music');
        }
        
        const similarityResult = await similarityResponse.json() as {
          success: boolean;
          results: Array<{
            id: string;
            score: number;
            metadata: any;
          }>;
          total_results: number;
        };
        
        // Convert vector results to music response format
        if (similarityResult.results && similarityResult.results.length > 0) {
          musicResults = {
            results: similarityResult.results.map((result) => ({
              id: result.id,
              title: result.metadata.title || result.metadata.name || 'Unknown Title',
              artist: result.metadata.artist || 'Unknown Artist',
              album: result.metadata.album,
              genre: result.metadata.genre,
              duration: result.metadata.duration_ms,
              preview_url: result.metadata.preview_url,
              external_urls: result.metadata.spotify_url 
                ? { spotify: result.metadata.spotify_url }
                : { 
                    spotify: `https://open.spotify.com/search/${encodeURIComponent(
                      `${result.metadata.title || result.metadata.name || ''} ${result.metadata.artist || ''}`
                    ).trim()}`
                  },
              similarity_score: result.score
            })),
            total: similarityResult.total_results || similarityResult.results.length,
            query: 'image_search',
            processing_time: 0,
            search_metadata: {
              search_type: 'vector_similarity',
              vector_similarity: true,
              total_matches: similarityResult.total_results || similarityResult.results.length,
              actual_query: 'image vector similarity search'
            }
          };
        } else {
          // No vector results, fall back to Spotify
          throw new Error('No vector results found');
        }
        
      } catch (mlError) {
        // ML service is not available or failed, use Spotify fallback
        console.log('ML service not available, using Spotify fallback:', mlError instanceof Error ? mlError.message : mlError);
        
        // Generate mood-based search queries based on common image themes
        const moodQueries = [
          'chill ambient music',
          'peaceful relaxing music', 
          'uplifting positive music',
          'atmospheric instrumental',
          'indie alternative music'
        ];
        
        const randomQuery = moodQueries[Math.floor(Math.random() * moodQueries.length)];
        musicResults = await spotifyService.searchMusic(randomQuery, 10);
        
        // Add a note that this is a fallback result with the actual search query
        musicResults.search_metadata = {
          search_type: 'image_fallback',
          vector_similarity: false,
          total_matches: musicResults.total,
          actual_query: randomQuery
        };
      }

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
        musicResults: SearchMusicResponse;
      }> = {
        success: true,
        data: {
          upload: uploadResponse,
          musicResults
        },
        message: 'Image uploaded and processed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Image processing error:', error);
      throw new AppError('Failed to process image for music discovery', 500);
    }
  })
);

export default router;
