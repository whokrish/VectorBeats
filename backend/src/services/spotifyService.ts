import axios from 'axios';
import { spotifyConfig } from '../config';
import { MusicResult, SearchMusicResponse } from '../types';

export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.accessToken = null;
    this.tokenExpiration = 0;
  }

  // Get Spotify access token using client credentials flow
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.accessToken && now < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiration to 5 minutes before actual expiration
      this.tokenExpiration = now + (response.data.expires_in - 300) * 1000;

      return this.accessToken!;
    } catch (error) {
      console.error('Spotify - Failed to get access token:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  // Search for music on Spotify
  async searchMusic(query: string, limit: number = 10): Promise<SearchMusicResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const startTime = Date.now();

      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          q: query,
          type: 'track',
          limit: Math.min(limit, 50), // Spotify max is 50
          market: 'US',
        },
      });

      const tracks = response.data.tracks.items;
      const results: MusicResult[] = tracks.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        duration: track.duration_ms,
        preview_url: track.preview_url,
        external_urls: {
          spotify: track.external_urls.spotify,
        },
        popularity: track.popularity,
        release_date: track.album.release_date,
      }));

      return {
        results,
        total: response.data.tracks.total,
        query,
        processing_time: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Spotify - Search error:', error);
      throw new Error('Failed to search music on Spotify');
    }
  }

  // Enhanced search with audio features
  async searchMusicWithFeatures(query: string, limit: number = 10): Promise<SearchMusicResponse> {
    try {
      const basicResults = await this.searchMusic(query, limit);
      
      // Fetch audio features for tracks that have them
      const enhancedResults = await Promise.all(
        basicResults.results.map(async (track) => {
          try {
            const audioFeatures = await this.getAudioFeatures(track.id);
            return {
              ...track,
              audio_features: audioFeatures ? {
                tempo: audioFeatures.tempo,
                key: this.getKeyString(audioFeatures.key),
                mode: audioFeatures.mode === 1 ? 'major' : 'minor',
                time_signature: audioFeatures.time_signature,
                loudness: audioFeatures.loudness,
                energy: audioFeatures.energy,
                danceability: audioFeatures.danceability,
                valence: audioFeatures.valence,
                acousticness: audioFeatures.acousticness,
                instrumentalness: audioFeatures.instrumentalness,
                liveness: audioFeatures.liveness,
                speechiness: audioFeatures.speechiness,
              } : undefined
            };
          } catch (error) {
            // If audio features fetch fails, return track without features
            return track;
          }
        })
      );

      return {
        ...basicResults,
        results: enhancedResults
      };
    } catch (error) {
      console.error('Spotify - Enhanced search error:', error);
      throw new Error('Failed to search music with features on Spotify');
    }
  }

  // Helper to convert Spotify key numbers to strings
  private getKeyString(key: number): string {
    const keys = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
    return keys[key] || 'Unknown';
  }

  // Get track details by ID
  async getTrack(trackId: string): Promise<MusicResult | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            market: 'US',
          },
        }
      );

      const track = response.data;
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        duration: track.duration_ms,
        preview_url: track.preview_url,
        external_urls: {
          spotify: track.external_urls.spotify,
        },
      };
    } catch (error) {
      console.error('Spotify - Get track error:', error);
      return null;
    }
  }

  // Get audio features for a track
  async getAudioFeatures(trackId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Spotify - Get audio features error:', error);
      return null;
    }
  }

  // Search for similar tracks based on audio features
  async getRecommendations(seedTracks: string[], limit: number = 10): Promise<MusicResult[]> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        'https://api.spotify.com/v1/recommendations',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            seed_tracks: seedTracks.slice(0, 5).join(','), // Max 5 seeds
            limit: Math.min(limit, 100),
            market: 'US',
          },
        }
      );

      return response.data.tracks.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        duration: track.duration_ms,
        preview_url: track.preview_url,
        external_urls: {
          spotify: track.external_urls.spotify,
        },
      }));
    } catch (error) {
      console.error('Spotify - Get recommendations error:', error);
      return [];
    }
  }

  // Health check for Spotify API
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const spotifyService = new SpotifyService();
