import { SpotifyService } from '../../services/spotifyService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;
  
  beforeEach(() => {
    spotifyService = new SpotifyService();
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
  });

  describe('getAccessToken (private method via searchMusic)', () => {
    it('should retrieve and use access token', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'mock_access_token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockSearchResponse = {
        data: {
          tracks: {
            items: [],
            total: 0
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
      
      await spotifyService.searchMusic('test');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Authentication failed'));
      
      await expect(spotifyService.searchMusic('test')).rejects.toThrow('Failed to authenticate with Spotify');
    });
  });

  describe('searchMusic', () => {
    it('should search tracks by query', async () => {
      const mockToken = 'mock_token';
      const mockTokenResponse = {
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockSearchResponse = {
        data: {
          tracks: {
            items: [
              {
                id: 'track1',
                name: 'Test Song',
                artists: [{ name: 'Test Artist' }],
                album: { name: 'Test Album' },
                duration_ms: 180000,
                preview_url: 'http://preview.url',
                external_urls: { spotify: 'http://spotify.url' }
              }
            ],
            total: 1
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
      
      const results = await spotifyService.searchMusic('test query');
      
      expect(results.results).toHaveLength(1);
      expect(results.results[0]).toMatchObject({
        id: 'track1',
        title: 'Test Song',
        artist: 'Test Artist'
      });
      expect(results.total).toBe(1);
      expect(results.query).toBe('test query');
      expect(typeof results.processing_time).toBe('number');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/search',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'test query',
            type: 'track'
          }),
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_token'
          })
        })
      );
    });

    it('should handle search errors gracefully', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockRejectedValueOnce(new Error('Search failed'));
      
      await expect(spotifyService.searchMusic('test')).rejects.toThrow('Failed to search music on Spotify');
    });

    it('should handle empty search results', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockEmptyResponse = {
        data: {
          tracks: {
            items: [],
            total: 0
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockEmptyResponse);
      
      const results = await spotifyService.searchMusic('nonexistent');
      
      expect(results.results).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should limit results correctly', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockSearchResponse = {
        data: {
          tracks: {
            items: [],
            total: 0
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
      
      await spotifyService.searchMusic('test', 5);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/search',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 5
          })
        })
      );
    });

    it('should enforce maximum limit of 50', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockSearchResponse = {
        data: {
          tracks: {
            items: [],
            total: 0
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
      
      await spotifyService.searchMusic('test', 100);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/search',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 50 // Should be capped at 50
          })
        })
      );
    });
  });

  describe('getTrack', () => {
    it('should retrieve track by ID', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      const mockTrackResponse = {
        data: {
          id: 'track1',
          name: 'Test Song',
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Test Album' },
          duration_ms: 180000,
          preview_url: 'http://preview.url',
          external_urls: { spotify: 'http://spotify.url' }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockResolvedValueOnce(mockTrackResponse);
      
      const track = await spotifyService.getTrack('track1');
      
      expect(track).toMatchObject({
        id: 'track1',
        title: 'Test Song',
        artist: 'Test Artist'
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/tracks/track1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token'
          })
        })
      );
    });

    it('should return null for invalid track ID', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.get.mockRejectedValueOnce(new Error('Track not found'));
      
      const track = await spotifyService.getTrack('invalid_id');
      
      expect(track).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Spotify API is accessible', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      
      const isHealthy = await spotifyService.healthCheck();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false when Spotify API is not accessible', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const isHealthy = await spotifyService.healthCheck();
      
      expect(isHealthy).toBe(false);
    });
  });
});
