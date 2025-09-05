import axios from 'axios';
import { config } from '../config';
import { SearchMusicResponse, MusicResult, AudioProcessingResult, HumAnalysisResult } from '../types';

export class MLServiceClient {
  private baseURL: string;

  constructor() {
    this.baseURL = config.mlServiceUrl;
  }

  // Process uploaded image for music search
  async processImageForMusicSearch(imagePath: string): Promise<SearchMusicResponse> {
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${this.baseURL}/process-image`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000, // 30 seconds
        }
      );

      return response.data;
    } catch (error) {
      console.error('ML Service - Image processing error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('ML Service response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error('Failed to process image for music search');
    }
  }

  // Process audio for humming/singing recognition
  async processAudioForHumming(audioPath: string): Promise<HumAnalysisResult> {
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));

      const response = await axios.post(
        `${this.baseURL}/process-audio`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 60000, // 60 seconds for audio processing
        }
      );

      return response.data;
    } catch (error) {
      console.error('ML Service - Audio processing error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('ML Service response error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      throw new Error('Failed to process audio for humming recognition');
    }
  }

  // Extract audio features
  async extractAudioFeatures(audioPath: string): Promise<AudioProcessingResult> {
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));

      const response = await axios.post(
        `${this.baseURL}/extract-features`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('ML Service - Feature extraction error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('ML Service response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error('Failed to extract audio features');
    }
  }

  // Vector similarity search
  async vectorSearch(query: any, collection: string = 'music_vectors'): Promise<MusicResult[]> {
    try {
      const response = await axios.post(
        `${this.baseURL}/vector-search`,
        {
          query,
          collection,
          limit: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('ML Service - Vector search error:', error);
      throw new Error('Failed to perform vector search');
    }
  }

  // Health check for ML service
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('ML Service - Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const mlService = new MLServiceClient();
