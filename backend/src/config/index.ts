import dotenv from 'dotenv';
import { AppConfig, SpotifyConfig, QdrantConfig } from '../types/config';

// Load environment variables
dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

export const spotifyConfig: SpotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID || '',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
};

export const qdrantConfig: QdrantConfig = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  musicCollection: process.env.MUSIC_COLLECTION || 'music_vectors',
  imageCollection: process.env.IMAGE_COLLECTION || 'image_vectors',
};

// Validation function
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missingVars.join(', ')}`
    );
    console.warn('Some features may not work properly.');
  }

  console.log('✅ Configuration loaded successfully');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🚀 Port: ${config.port}`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`🤖 ML Service URL: ${config.mlServiceUrl}`);
};
