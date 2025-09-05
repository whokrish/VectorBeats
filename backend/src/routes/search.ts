import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { spotifyService } from '../services/spotifyService';
import { mlService } from '../services/mlService';
import { advancedSearchService } from '../services/advancedSearchService';
import { ApiResponse, SearchMusicResponse, SearchQuery, MultiModalSearchRequest } from '../types';

const router = Router();

// Search for music using text query
router.get(
  '/music',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = 10, offset = 0 } = req.query;

    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400);
    }

    const searchQuery: SearchQuery = {
      query: query.trim(),
      limit: parseInt(limit as string, 10) || 10,
      offset: parseInt(offset as string, 10) || 0
    };

    if (searchQuery.limit! > 50) {
      throw new AppError('Limit cannot exceed 50', 400);
    }

    try {
      // Search using Spotify API with enhanced features
      const spotifyResults = await spotifyService.searchMusicWithFeatures(
        searchQuery.query,
        searchQuery.limit
      );

      const response: ApiResponse<SearchMusicResponse> = {
        success: true,
        data: spotifyResults,
        message: 'Music search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Music search error:', error);
      throw new AppError('Failed to search for music', 500);
    }
  })
);

// Search music by image
router.post(
  '/music-by-image',
  asyncHandler(async (req: Request, res: Response) => {
    const { imagePath } = req.body;

    if (!imagePath) {
      throw new AppError('Image path is required', 400);
    }

    try {
      // Call ML service to get music from image
      const musicResults = await mlService.processImageForMusicSearch(imagePath);

      const response: ApiResponse<SearchMusicResponse> = {
        success: true,
        data: musicResults,
        message: 'Image-based music search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Image search error:', error);
      throw new AppError('Failed to search music by image', 500);
    }
  })
);

// Search music by audio/humming
router.post(
  '/music-by-audio',
  asyncHandler(async (req: Request, res: Response) => {
    const { audioPath } = req.body;

    if (!audioPath) {
      throw new AppError('Audio path is required', 400);
    }

    try {
      // Call ML service to analyze humming/singing
      const analysisResult = await mlService.processAudioForHumming(audioPath);

      const response: ApiResponse = {
        success: true,
        data: analysisResult,
        message: 'Audio-based music search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Audio search error:', error);
      throw new AppError('Failed to search music by audio', 500);
    }
  })
);

// Search music by mood/text description
router.post(
  '/music-by-mood',
  asyncHandler(async (req: Request, res: Response) => {
    const { mood, description } = req.body;

    if (!mood && !description) {
      throw new AppError('Mood or description is required', 400);
    }

    try {
      const searchQuery = mood || description;
      
      // Use Spotify API for mood-based search with enhanced features
      const spotifyResults = await spotifyService.searchMusicWithFeatures(searchQuery);

      const response: ApiResponse<SearchMusicResponse> = {
        success: true,
        data: spotifyResults,
        message: 'Mood-based music search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Mood search error:', error);
      throw new AppError('Failed to search music by mood', 500);
    }
  })
);

// Multi-modal search endpoint
router.post(
  '/multimodal',
  asyncHandler(async (req: Request, res: Response) => {
    const request: MultiModalSearchRequest = req.body;

    if (!request.type) {
      throw new AppError('Search type is required', 400);
    }

    if (!request.image && !request.audio && !request.text && !request.description) {
      throw new AppError('At least one input (image, audio, or text) is required', 400);
    }

    try {
      const results = await advancedSearchService.multiModalSearch(request);

      const response: ApiResponse<SearchMusicResponse> = {
        success: true,
        data: results,
        message: 'Multi-modal search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Multi-modal search error:', error);
      throw new AppError('Failed to perform multi-modal search', 500);
    }
  })
);

// Advanced search with filters
router.post(
  '/advanced',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, filters, limit = 20, offset = 0 } = req.body;

    if (!query) {
      throw new AppError('Search query is required', 400);
    }

    try {
      const multiModalRequest: MultiModalSearchRequest = {
        type: 'combined',
        text: query,
        filters,
        limit: Math.min(limit, 50),
        offset
      };

      const results = await advancedSearchService.multiModalSearch(multiModalRequest);

      const response: ApiResponse<SearchMusicResponse> = {
        success: true,
        data: results,
        message: 'Advanced search completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Advanced search error:', error);
      throw new AppError('Failed to perform advanced search', 500);
    }
  })
);

// Search suggestions endpoint
router.get(
  '/suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string') {
      throw new AppError('Query parameter is required', 400);
    }

    try {
      const suggestions = await advancedSearchService.getSearchSuggestions(
        query,
        parseInt(limit as string, 10) || 10
      );

      const response: ApiResponse = {
        success: true,
        data: { suggestions },
        message: 'Search suggestions retrieved successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Search suggestions error:', error);
      throw new AppError('Failed to get search suggestions', 500);
    }
  })
);

// Search history endpoint
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 50 } = req.query;

    try {
      const history = advancedSearchService.getSearchHistory(
        parseInt(limit as string, 10) || 50
      );

      const response: ApiResponse = {
        success: true,
        data: { history },
        message: 'Search history retrieved successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('Search history error:', error);
      throw new AppError('Failed to get search history', 500);
    }
  })
);

export default router;
