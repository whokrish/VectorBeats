import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  EdgeCaseHandler,
  useEdgeCaseHandler,
  errorRecoveryStrategies
} from '../edgeCaseHandling';

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  }
}));

// Mock fetch for testing
global.fetch = vi.fn();

describe('Edge Case Handling Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('EdgeCaseHandler', () => {
    describe('handleEmptyResponse', () => {
      it('returns response when valid', () => {
        const validResponse = { data: 'test' };
        const fallback = { data: 'fallback' };
        const result = EdgeCaseHandler.handleEmptyResponse(validResponse, fallback);
        expect(result).toBe(validResponse);
      });

      it('returns fallback for null/undefined', () => {
        const fallback = { data: 'fallback' };
        
        expect(EdgeCaseHandler.handleEmptyResponse(null, fallback)).toBe(fallback);
        expect(EdgeCaseHandler.handleEmptyResponse(undefined, fallback)).toBe(fallback);
      });

      it('returns fallback for empty arrays', () => {
        const fallback = ['fallback'];
        const result = EdgeCaseHandler.handleEmptyResponse([], fallback);
        expect(result).toBe(fallback);
      });
    });

    describe('handleApiFailure', () => {
      it('succeeds on first attempt', async () => {
        const successFn = vi.fn().mockResolvedValue('success');
        
        const result = await EdgeCaseHandler.handleApiFailure(successFn);
        
        expect(result).toBe('success');
        expect(successFn).toHaveBeenCalledTimes(1);
      });

      it('retries on failure and eventually succeeds', async () => {
        const retryFn = vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValue('success');
        
        const result = await EdgeCaseHandler.handleApiFailure(retryFn, {
          maxRetries: 3,
          retryDelay: 10
        });
        
        expect(result).toBe('success');
        expect(retryFn).toHaveBeenCalledTimes(3);
      });

      it('returns null after max retries', async () => {
        const failFn = vi.fn().mockRejectedValue(new Error('persistent failure'));
        
        const result = await EdgeCaseHandler.handleApiFailure(failFn, {
          maxRetries: 2,
          retryDelay: 10
        });
        
        expect(result).toBe(null);
        expect(failFn).toHaveBeenCalledTimes(2);
      });
    });

    describe('checkBrowserCompatibility', () => {
      it('detects supported features', () => {
        // Mock browser APIs
        global.MediaRecorder = vi.fn() as any;
        global.AudioContext = vi.fn() as any;
        global.File = vi.fn() as any;
        global.FileReader = vi.fn() as any;
        global.fetch = vi.fn();

        const compatibility = EdgeCaseHandler.checkBrowserCompatibility();
        
        expect(compatibility.isSupported).toBe(true);
        expect(compatibility.missingFeatures).toHaveLength(0);
      });

      it('detects missing features', () => {
        // Remove APIs to simulate old browser
        delete (global as any).MediaRecorder;
        delete (global as any).AudioContext;
        delete (global as any).webkitAudioContext;

        const compatibility = EdgeCaseHandler.checkBrowserCompatibility();
        
        expect(compatibility.isSupported).toBe(false);
        expect(compatibility.missingFeatures).toContain('MediaRecorder');
        expect(compatibility.missingFeatures).toContain('AudioContext');
      });
    });

    describe('validateFileUpload', () => {
      it('validates valid files', () => {
        const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(validFile, 'size', { value: 1024 }); // 1KB
        
        const result = EdgeCaseHandler.validateFileUpload(validFile);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedName).toBeDefined();
      });

      it('rejects oversized files', () => {
        const largeFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' });
        Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB
        
        const result = EdgeCaseHandler.validateFileUpload(largeFile);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('size exceeds');
      });

      it('rejects null files', () => {
        const result = EdgeCaseHandler.validateFileUpload(null);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No file selected');
      });

      it('rejects empty files', () => {
        const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
        Object.defineProperty(emptyFile, 'size', { value: 0 });
        
        const result = EdgeCaseHandler.validateFileUpload(emptyFile);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('File is empty');
      });
    });

    describe('validateSearchQuery', () => {
      it('validates normal search queries', () => {
        const result = EdgeCaseHandler.validateSearchQuery('The Beatles');
        
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('The Beatles');
      });

      it('rejects empty queries', () => {
        const result = EdgeCaseHandler.validateSearchQuery('');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Search query is required');
      });

      it('rejects queries that are too long', () => {
        const longQuery = 'a'.repeat(501);
        const result = EdgeCaseHandler.validateSearchQuery(longQuery);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too long');
      });
    });

    describe('checkNetworkConnectivity', () => {
      it('detects online status', async () => {
        // Mock fetch success
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200
        });

        const isOnline = await EdgeCaseHandler.checkNetworkConnectivity();
        expect(isOnline).toBe(true);
      });

      it('detects offline status', async () => {
        // Mock fetch failure
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const isOnline = await EdgeCaseHandler.checkNetworkConnectivity();
        expect(isOnline).toBe(false);
      });
    });
  });

  describe('useEdgeCaseHandler hook', () => {
    it('provides browser compatibility info', () => {
      global.MediaRecorder = vi.fn() as any;
      global.AudioContext = vi.fn() as any;

      const { result } = renderHook(() => useEdgeCaseHandler());

      expect(result.current.browserSupport.isSupported).toBe(true);
    });

    it('handles operations with retry', async () => {
      let attemptCount = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const { result } = renderHook(() => useEdgeCaseHandler());

      await act(async () => {
        const response = await result.current.handleWithRetry(mockFn, 'test-operation', { maxRetries: 3 });
        expect(response).toBe('success');
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('validates files correctly', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validFile, 'size', { value: 1024 });

      const { result } = renderHook(() => useEdgeCaseHandler());

      const validation = result.current.validateFile(validFile);

      expect(validation.isValid).toBe(true);
    });

    it('checks network connectivity', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const { result } = renderHook(() => useEdgeCaseHandler());

      await act(async () => {
        const isOnline = await result.current.checkNetworkConnectivity();
        expect(isOnline).toBe(true);
      });
    });
  });

  describe('errorRecoveryStrategies', () => {
    it('provides exponential backoff strategy', async () => {
      const mockRetryFn = vi.fn().mockResolvedValue('recovered');
      
      const recovery = await errorRecoveryStrategies.exponentialBackoff(mockRetryFn, 2, 10);
      
      expect(recovery).toBe('recovered');
      expect(mockRetryFn).toHaveBeenCalled();
    });

    it('provides circuit breaker strategy', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await errorRecoveryStrategies.circuitBreaker(mockFn, 'test-operation');
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('provides graceful degradation strategy', async () => {
      const primaryFn = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackFn = vi.fn().mockResolvedValue('fallback result');
      
      const result = await errorRecoveryStrategies.gracefulDegradation(
        primaryFn, 
        fallbackFn, 
        'Operation failed, using fallback'
      );
      
      expect(result).toBe('fallback result');
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).toHaveBeenCalled();
    });
  });
});
