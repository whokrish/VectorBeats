import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InputSanitizer,
  FileValidator,
  RateLimiter,
  useValidation
} from '../validation';
import { renderHook } from '@testing-library/react';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string) => input.replace(/<script>/g, ''))
  }
}));

describe('Validation Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InputSanitizer', () => {
    it('sanitizes HTML content', () => {
      const maliciousInput = 'Hello <script>alert("xss")</script> World';
      const sanitized = InputSanitizer.sanitizeHtml(maliciousInput);
      
      expect(sanitized).toBe('Hello  World');
      expect(sanitized).not.toContain('<script>');
    });

    it('sanitizes search queries', () => {
      expect(InputSanitizer.sanitizeSearchQuery('The Beatles')).toBe('The Beatles');
      expect(InputSanitizer.sanitizeSearchQuery('  Rock  music  ')).toBe('Rock music');
      expect(InputSanitizer.sanitizeSearchQuery('Test<script>')).toBe('Test');
      expect(InputSanitizer.sanitizeSearchQuery('')).toBe('');
      expect(InputSanitizer.sanitizeSearchQuery(null as any)).toBe('');
    });

    it('sanitizes filenames', () => {
      expect(InputSanitizer.sanitizeFilename('test file.mp3')).toBe('test_file.mp3');
      expect(InputSanitizer.sanitizeFilename('file<>?.txt')).toBe('file___.txt');
      expect(InputSanitizer.sanitizeFilename('')).toBe('unnamed_file');
      expect(InputSanitizer.sanitizeFilename(null as any)).toBe('unnamed_file');
    });

    it('sanitizes descriptions', () => {
      const description = 'This is a test description.';
      expect(InputSanitizer.sanitizeDescription(description)).toBe(description);
      expect(InputSanitizer.sanitizeDescription('<script>alert("xss")</script>')).toBe('');
      expect(InputSanitizer.sanitizeDescription('')).toBe('');
    });

    it('validates and sanitizes email addresses', () => {
      expect(InputSanitizer.sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(InputSanitizer.sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
      expect(InputSanitizer.sanitizeEmail('invalid-email')).toBe(null);
      expect(InputSanitizer.sanitizeEmail('')).toBe(null);
    });

    it('sanitizes SQL input', () => {
      expect(InputSanitizer.sanitizeSqlInput("SELECT * FROM users")).toBe('FROM users');
      expect(InputSanitizer.sanitizeSqlInput("username'; DROP TABLE users;--")).toBe("username'  TABLE users");
      expect(InputSanitizer.sanitizeSqlInput("normal text")).toBe('normal text');
    });

    it('sanitizes numeric input', () => {
      expect(InputSanitizer.sanitizeNumber('123')).toBe(123);
      expect(InputSanitizer.sanitizeNumber('123.45')).toBe(123.45);
      expect(InputSanitizer.sanitizeNumber('invalid')).toBe(null);
      expect(InputSanitizer.sanitizeNumber(Infinity)).toBe(null);
      expect(InputSanitizer.sanitizeNumber(50, 0, 100)).toBe(50);
      expect(InputSanitizer.sanitizeNumber(-10, 0, 100)).toBe(0);
      expect(InputSanitizer.sanitizeNumber(150, 0, 100)).toBe(100);
    });
  });

  describe('FileValidator', () => {
    it('validates file types correctly', async () => {
      // Create mock files with correct headers
      const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const jpegFile = new File([jpegHeader], 'test.jpg', { type: 'image/jpeg' });

      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      const pngFile = new File([pngHeader], 'test.png', { type: 'image/png' });

      const textFile = new File(['text'], 'test.txt', { type: 'text/plain' });

      expect(await FileValidator.validateFileType(jpegFile, 'image')).toBe(true);
      expect(await FileValidator.validateFileType(pngFile, 'image')).toBe(true);
      expect(await FileValidator.validateFileType(textFile, 'image')).toBe(false);
    });

    it('validates image content', async () => {
      // Mock Image constructor
      const mockImage = {
        width: 100,
        height: 100,
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      global.Image = vi.fn(() => mockImage) as any;
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      const promise = FileValidator.validateImageContent(file);
      
      // Simulate successful image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await promise;
      expect(result.isValid).toBe(true);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('validates audio content', async () => {
      // Mock Audio constructor
      const mockAudio = {
        duration: 60, // 1 minute
        onloadedmetadata: null as any,
        onerror: null as any,
        src: ''
      };

      global.Audio = vi.fn(() => mockAudio) as any;

      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });

      const promise = FileValidator.validateAudioContent(file);
      
      // Simulate successful audio load
      setTimeout(() => {
        if (mockAudio.onloadedmetadata) mockAudio.onloadedmetadata();
      }, 0);

      const result = await promise;
      expect(result.isValid).toBe(true);
      expect(result.duration).toBe(60);
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      // Clear rate limiter state
      (RateLimiter as any).requests.clear();
    });

    it('allows requests within limit', () => {
      const result1 = RateLimiter.checkRateLimit('user1', 2, 1000);
      const result2 = RateLimiter.checkRateLimit('user1', 2, 1000);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('blocks requests exceeding limit', () => {
      const result1 = RateLimiter.checkRateLimit('user1', 1, 1000);
      const result2 = RateLimiter.checkRateLimit('user1', 1, 1000);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
      expect(result2.resetTime).toBeDefined();
    });

    it('resets after time window', () => {
      // Set a very short window for testing
      const result1 = RateLimiter.checkRateLimit('user1', 1, 10); // 10ms window
      expect(result1.allowed).toBe(true);

      const result2 = RateLimiter.checkRateLimit('user1', 1, 10);
      expect(result2.allowed).toBe(false);

      // Wait and try again (in a real scenario, this would be handled differently)
      setTimeout(() => {
        const result3 = RateLimiter.checkRateLimit('user1', 1, 10);
        expect(result3.allowed).toBe(true);
      }, 20);
    });
  });

  describe('useValidation hook', () => {
    it('validates search queries', () => {
      const { result } = renderHook(() => useValidation());

      expect(result.current.validateSearchQuery('The Beatles')).toEqual({ isValid: true });
      expect(result.current.validateSearchQuery('')).toEqual({ 
        isValid: false, 
        error: 'Search query cannot be empty' 
      });
      expect(result.current.validateSearchQuery('a'.repeat(501))).toEqual({ 
        isValid: false, 
        error: 'Search query is too long' 
      });
    });

    it('provides sanitization functions', () => {
      const { result } = renderHook(() => useValidation());

      expect(result.current.sanitizeInput('  test  ')).toBe('test');
      expect(result.current.sanitizeDescription('Test description')).toBe('Test description');
    });
  });
});
