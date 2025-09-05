import request from 'supertest';
import express from 'express';
import cors from 'cors';
import uploadRoutes from '../../routes/upload';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import fs from 'fs';
import path from 'path';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Routes
  app.use('/api/upload', uploadRoutes);
  
  // Error handling
  app.use(errorHandler);
  app.use('*', notFoundHandler);
  
  return app;
};

describe('Upload API Integration Tests', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
    
    // Ensure test upload directory exists
    const testUploadDir = './uploads/test';
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test files
    const testUploadDir = './uploads/test';
    if (fs.existsSync(testUploadDir)) {
      const files = fs.readdirSync(testUploadDir);
      files.forEach(file => {
        const filePath = path.join(testUploadDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  describe('POST /api/upload/image', () => {
    it('should upload and process an image successfully', async () => {
      // Create a small test image buffer (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE
      ]);

      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', testImageBuffer, 'test-image.png')
        .field('description', 'A sunset over the ocean')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          filename: expect.stringMatching(/^image-\d+-\d+\.png$/),
          originalName: 'test-image.png',
          size: expect.any(Number),
          analysis: expect.objectContaining({
            processing_time: expect.any(Number)
          })
        })
      });
    });

    it('should reject files that are too large', async () => {
      // Create a buffer larger than the limit (simulate 15MB file)
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024, 0);
      
      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', largeBuffer, 'large-image.png')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('File too large')
      });
    });

    it('should reject invalid file types', async () => {
      const textBuffer = Buffer.from('This is not an image');
      
      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', textBuffer, 'not-an-image.txt')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid file type')
      });
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/upload/image')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('No image file provided')
      });
    });

    it('should handle ML service failures gracefully', async () => {
      // Mock ML service to be unavailable
      jest.mock('../../services/mlService', () => ({
        processImage: jest.fn().mockRejectedValue(new Error('ML service unavailable'))
      }));

      const testImageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // Minimal PNG header
      
      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to process image')
      });
    });
  });

  describe('POST /api/upload/audio', () => {
    it('should upload and process audio successfully', async () => {
      // Create a minimal WAV header
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // ChunkSize
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size
        0x01, 0x00,             // AudioFormat
        0x01, 0x00,             // NumChannels
        0x44, 0xAC, 0x00, 0x00, // SampleRate
        0x88, 0x58, 0x01, 0x00, // ByteRate
        0x02, 0x00,             // BlockAlign
        0x10, 0x00,             // BitsPerSample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Subchunk2Size
      ]);

      const response = await request(app)
        .post('/api/upload/audio')
        .attach('audio', wavHeader, 'test-audio.wav')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          filename: expect.stringMatching(/^audio-\d+-\d+\.wav$/),
          originalName: 'test-audio.wav',
          size: expect.any(Number),
          analysis: expect.objectContaining({
            processing_time: expect.any(Number)
          })
        })
      });
    });

    it('should reject invalid audio formats', async () => {
      const textBuffer = Buffer.from('This is not audio');
      
      const response = await request(app)
        .post('/api/upload/audio')
        .attach('audio', textBuffer, 'not-audio.txt')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid file type')
      });
    });

    it('should handle audio files that are too long', async () => {
      // Simulate a very long audio file
      const longAudioBuffer = Buffer.alloc(50 * 1024 * 1024, 0); // 50MB
      
      const response = await request(app)
        .post('/api/upload/audio')
        .attach('audio', longAudioBuffer, 'long-audio.wav')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('File too large')
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Route not found'
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/upload/image')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid JSON')
      });
    });

    it('should handle server errors gracefully', async () => {
      // Force an error by sending invalid data
      const response = await request(app)
        .post('/api/upload/image')
        .field('invalid', 'data')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      // Add health endpoint to test app
      app.get('/api/health', (_req, res) => {
        res.json({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          service: 'VectorBeats Backend Test',
          version: '1.0.0'
        });
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        service: 'VectorBeats Backend Test',
        version: '1.0.0'
      });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/upload/image')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple concurrent requests', async () => {
      const testImageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      
      // Send multiple requests concurrently
      const promises = Array(5).fill(0).map(() =>
        request(app)
          .post('/api/upload/image')
          .attach('image', testImageBuffer, 'test-image.png')
      );

      const responses = await Promise.allSettled(promises);
      
      // At least some should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      expect(successful.length).toBeGreaterThan(0);
    });
  });
});
