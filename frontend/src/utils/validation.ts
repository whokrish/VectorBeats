import Joi from 'joi';
import DOMPurify from 'dompurify';

// File validation schemas
export const fileValidationSchemas = {
  image: Joi.object({
    filename: Joi.string().required(),
    mimetype: Joi.string().valid(
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ).required(),
    size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB
    buffer: Joi.binary().required()
  }),

  audio: Joi.object({
    filename: Joi.string().required(),
    mimetype: Joi.string().valid(
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/webm',
      'audio/m4a'
    ).required(),
    size: Joi.number().max(50 * 1024 * 1024).required(), // 50MB
    buffer: Joi.binary().required()
  })
};

// Text input validation schemas
export const textValidationSchemas = {
  searchQuery: Joi.string()
    .min(1)
    .max(500)
    .pattern(/^[\w\s\-.,!?()'"]*$/) // Allow common punctuation but prevent XSS
    .required()
    .messages({
      'string.pattern.base': 'Search query contains invalid characters',
      'string.min': 'Search query must not be empty',
      'string.max': 'Search query must be less than 500 characters'
    }),

  description: Joi.string()
    .max(1000)
    .pattern(/^[\w\s\-.,!?()'"]*$/)
    .optional()
    .messages({
      'string.pattern.base': 'Description contains invalid characters',
      'string.max': 'Description must be less than 1000 characters'
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .optional(),

  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional(),

  feedback: Joi.string()
    .max(2000)
    .pattern(/^[\w\s\-.,!?()'"]*$/)
    .optional()
};

// API request validation schemas
export const apiValidationSchemas = {
  uploadImage: Joi.object({
    description: textValidationSchemas.description
  }),

  uploadAudio: Joi.object({
    description: textValidationSchemas.description
  }),

  searchMusic: Joi.object({
    query: textValidationSchemas.searchQuery,
    limit: Joi.number().min(1).max(50).default(10),
    offset: Joi.number().min(0).default(0)
  }),

  reportError: Joi.object({
    errorId: Joi.string().pattern(/^err_\d+_[a-z0-9]+$/).required(),
    message: Joi.string().max(1000).required(),
    stack: Joi.string().max(5000).optional(),
    url: Joi.string().uri().required(),
    userAgent: Joi.string().max(500).required(),
    category: Joi.string().valid('network', 'loading', 'permission', 'unknown').required()
  })
};

// Sanitization functions
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }

  /**
   * Sanitize text input for search queries
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 500); // Limit length
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed_file';
    }

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize description text
   */
  static sanitizeDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }

    return this.sanitizeHtml(description)
      .trim()
      .substring(0, 1000);
  }

  /**
   * Validate and sanitize email address
   */
  static sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(sanitized) ? sanitized : null;
  }

  /**
   * Remove potential SQL injection patterns
   */
  static sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
    ];

    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate and sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input);
    
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return min;
    }

    if (max !== undefined && num > max) {
      return max;
    }

    return num;
  }
}

// File validation utilities for browser environment
export class FileValidator {
  private static readonly MAGIC_NUMBERS = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
    gif: [0x47, 0x49, 0x46],
    webp: [0x52, 0x49, 0x46, 0x46], // First 4 bytes of RIFF
    wav: [0x52, 0x49, 0x46, 0x46], // RIFF header
    mp3: [0x49, 0x44, 0x33], // ID3 tag
    ogg: [0x4F, 0x67, 0x67, 0x53] // OggS
  };

  /**
   * Validate file type by checking magic numbers
   */
  static async validateFileType(file: File, expectedType: 'image' | 'audio'): Promise<boolean> {
    if (!file || file.size < 4) {
      return false;
    }

    try {
      const arrayBuffer = await file.slice(0, 12).arrayBuffer();
      const header = Array.from(new Uint8Array(arrayBuffer));

      if (expectedType === 'image') {
        return (
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.jpeg) ||
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.png) ||
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.gif) ||
          (this.checkMagicNumbers(header, this.MAGIC_NUMBERS.webp) && 
           new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(8, 12))) === 'WEBP')
        );
      }

      if (expectedType === 'audio') {
        return (
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.wav) ||
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.mp3) ||
          this.checkMagicNumbers(header, this.MAGIC_NUMBERS.ogg)
        );
      }

      return false;
    } catch (error) {
      console.error('Error validating file type:', error);
      return false;
    }
  }

  private static checkMagicNumbers(header: number[], magicNumbers: number[]): boolean {
    return magicNumbers.every((byte, index) => header[index] === byte);
  }

  /**
   * Validate image dimensions and quality
   */
  static validateImageContent(file: File): Promise<{
    isValid: boolean;
    width?: number;
    height?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          
          // Check for reasonable dimensions
          if (img.width < 1 || img.height < 1) {
            resolve({ isValid: false, error: 'Invalid image dimensions' });
            return;
          }

          if (img.width > 10000 || img.height > 10000) {
            resolve({ isValid: false, error: 'Image dimensions too large' });
            return;
          }

          resolve({
            isValid: true,
            width: img.width,
            height: img.height
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ isValid: false, error: 'Failed to load image' });
        };

        img.src = url;
      } catch (error) {
        resolve({ isValid: false, error: 'Failed to validate image' });
      }
    });
  }

  /**
   * Validate audio duration and quality
   */
  static validateAudioContent(file: File): Promise<{
    isValid: boolean;
    duration?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        const url = URL.createObjectURL(file);

        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          
          // Check for reasonable duration (max 5 minutes for humming)
          if (audio.duration < 0.1) {
            resolve({ isValid: false, error: 'Audio too short' });
            return;
          }

          if (audio.duration > 300) { // 5 minutes
            resolve({ isValid: false, error: 'Audio too long (max 5 minutes)' });
            return;
          }

          resolve({
            isValid: true,
            duration: audio.duration
          });
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ isValid: false, error: 'Failed to load audio' });
        };

        audio.src = url;
      } catch (error) {
        resolve({ isValid: false, error: 'Failed to validate audio' });
      }
    });
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  /**
   * Check if request is within rate limits
   */
  static checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000 // 1 minute
  ): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this identifier
    const userRequests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    // Check if within limit
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + windowMs;
      return { allowed: false, resetTime };
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return { allowed: true };
  }

  private static cleanup() {
    const now = Date.now();
    const cutoff = now - 300000; // 5 minutes

    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > cutoff);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Client-side validation hook
export const useValidation = () => {
  const validateSearchQuery = (query: string): { isValid: boolean; error?: string } => {
    const sanitized = InputSanitizer.sanitizeSearchQuery(query);
    if (!sanitized) {
      return { isValid: false, error: 'Search query cannot be empty' };
    }
    if (sanitized.length > 500) {
      return { isValid: false, error: 'Search query is too long' };
    }
    return { isValid: true };
  };

  const validateFile = async (file: File, type: 'image' | 'audio'): Promise<{ isValid: boolean; error?: string }> => {
    // Check file size
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for audio
    if (file.size > maxSize) {
      return { isValid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
    }

    // Check file type
    const isValidType = await FileValidator.validateFileType(file, type);
    if (!isValidType) {
      return { isValid: false, error: 'Invalid file type' };
    }

    // Additional validation based on type
    if (type === 'image') {
      const imageValidation = await FileValidator.validateImageContent(file);
      if (!imageValidation.isValid) {
        return { isValid: false, error: imageValidation.error };
      }
    } else if (type === 'audio') {
      const audioValidation = await FileValidator.validateAudioContent(file);
      if (!audioValidation.isValid) {
        return { isValid: false, error: audioValidation.error };
      }
    }

    return { isValid: true };
  };

  return {
    validateSearchQuery,
    validateFile,
    sanitizeInput: InputSanitizer.sanitizeSearchQuery,
    sanitizeDescription: InputSanitizer.sanitizeDescription
  };
};
