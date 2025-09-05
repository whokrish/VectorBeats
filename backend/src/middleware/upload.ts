import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// Ensure upload directory exists
const ensureUploadDir = (uploadPath: string) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
};

// Storage configuration for different file types
const createStorage = (subDir: string) => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = path.join(config.uploadDir, subDir);
      ensureUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
  });
};

// File filter for images
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image format. Allowed formats: ${allowedMimes.join(', ')}`));
  }
};

// File filter for audio
const audioFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/webm'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid audio format. Allowed formats: ${allowedMimes.join(', ')}`));
  }
};

// Image upload middleware
export const uploadImage = multer({
  storage: createStorage('images'),
  fileFilter: imageFilter,
  limits: {
    fileSize: config.maxFileSize, // 10MB
    files: 1
  }
});

// Audio upload middleware
export const uploadAudio = multer({
  storage: createStorage('audio'),
  fileFilter: audioFilter,
  limits: {
    fileSize: config.maxFileSize * 2, // 20MB for audio files
    files: 1
  }
});

// Error handling middleware for multer
export const handleMulterError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          error: 'File too large',
          message: `Maximum file size is ${config.maxFileSize / (1024 * 1024)}MB`
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          error: 'Too many files',
          message: 'Only one file is allowed'
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          error: 'Unexpected file field',
          message: 'Invalid file field name'
        });
        return;
      default:
        res.status(400).json({
          error: 'File upload error',
          message: err.message
        });
        return;
    }
  }
  
  if (err.message.includes('Invalid')) {
    res.status(400).json({
      error: 'Invalid file type',
      message: err.message
    });
    return;
  }
  
  next(err);
};
