import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

// Import configuration
import { config, validateConfig } from './config';

// Import middleware
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler';

// Import services
import { initializeRealTimeService } from './services/realTimeService';

// Import routes
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import audioRoutes from './routes/audio';

// Validate configuration on startup
validateConfig();

const app = express();
const server = createServer(app);
const PORT = config.port;

// Initialize real-time service
const realTimeService = initializeRealTimeService(server);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(morgan('combined'));
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audio', audioRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'VectorBeats Backend',
    version: '1.0.0',
    realTime: {
      connectedUsers: realTimeService.getUserCount(),
      activeSessions: realTimeService.getActiveSessionCount()
    }
  });
});

// Global error handling
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

server.listen(PORT, () => {
  console.log(`🚀 VectorBeats Backend running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${config.frontendUrl}`);
  console.log(`🤖 ML Service URL: ${config.mlServiceUrl}`);
  console.log(`📁 Upload Directory: ${config.uploadDir}`);
  console.log(`🎵 Environment: ${config.nodeEnv}`);
  console.log(`🔌 WebSocket server initialized`);
});
