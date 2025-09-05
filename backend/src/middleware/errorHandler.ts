import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';
import { config } from '../config';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error details in development
  if (config.nodeEnv === 'development') {
    console.error('🚨 Error Details:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    console.error('🚨 Error:', err.message);
  }

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request entity too large';
  }

  const errorResponse: ErrorResponse = {
    error: message,
    ...(config.nodeEnv === 'development' && {
      message: err.message,
      details: {
        stack: err.stack,
        name: err.name,
        code: err.code
      }
    })
  };

  res.status(statusCode).json(errorResponse);
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`
  });
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? '🔴' : '🟢';
    
    console.log(
      `${logLevel} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
    
    if (req.body && Object.keys(req.body).length > 0 && config.nodeEnv === 'development') {
      console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
    }
  });
  
  next();
};

// Rate limiting helper
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  const requests = new Map();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.timestamp < windowStart) {
        requests.delete(key);
      }
    }
    
    // Get current count for this client
    const clientRequests = Array.from(requests.values()).filter(
      r => r.clientId === clientId && r.timestamp > windowStart
    );
    
    if (clientRequests.length >= max) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: message
      });
      return;
    }
    
    // Record this request
    requests.set(`${clientId}-${now}`, {
      clientId,
      timestamp: now
    });
    
    next();
  };
};
