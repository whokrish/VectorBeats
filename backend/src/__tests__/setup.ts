import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment values
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.UPLOAD_DIR = './uploads/test';
process.env.ML_SERVICE_URL = 'http://localhost:8001';
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';

// Mock console methods in test environment to reduce noise
const consoleMocks = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

Object.assign(global.console, consoleMocks);
