import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

export interface EdgeCaseConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackValue?: any;
  enableLogging?: boolean;
}

// Comprehensive edge case handling utilities
export class EdgeCaseHandler {
  /**
   * Handle empty or null API responses
   */
  static handleEmptyResponse<T>(
    response: T | null | undefined,
    fallback: T,
    context: string = 'API response'
  ): T {
    if (response === null || response === undefined) {
      console.warn(`${context}: Received null/undefined response, using fallback`);
      return fallback;
    }

    // Handle empty arrays
    if (Array.isArray(response) && response.length === 0) {
      console.info(`${context}: Received empty array`);
      return fallback;
    }

    // Handle empty objects
    if (typeof response === 'object' && response !== null && Object.keys(response).length === 0) {
      console.info(`${context}: Received empty object`);
      return fallback;
    }

    return response;
  }

  /**
   * Handle API failures with retries and fallbacks
   */
  static async handleApiFailure<T>(
    apiCall: () => Promise<T>,
    options: EdgeCaseConfig = {}
  ): Promise<T | null> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
      fallbackValue = null,
      enableLogging = true
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        // Race between the API call and timeout
        const result = await Promise.race([apiCall(), timeoutPromise]);
        
        if (enableLogging && attempt > 1) {
          console.info(`API call succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (enableLogging) {
          console.warn(`API call failed on attempt ${attempt}/${maxRetries}:`, lastError.message);
        }

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          if (enableLogging) {
            console.error('Non-retryable error encountered:', lastError.message);
          }
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
        }
      }
    }

    if (enableLogging) {
      console.error(`All ${maxRetries} API call attempts failed:`, lastError?.message);
    }

    return fallbackValue;
  }

  /**
   * Check if an error should not be retried
   */
  private static isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('400') || // Bad request
      message.includes('401') || // Unauthorized
      message.includes('403') || // Forbidden
      message.includes('404') || // Not found
      message.includes('422') || // Unprocessable entity
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    );
  }

  /**
   * Handle file upload edge cases
   */
  static validateFileUpload(file: File | null): {
    isValid: boolean;
    error?: string;
    sanitizedName?: string;
  } {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    // Check file size
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeLimit = maxSize / (1024 * 1024);
      return { isValid: false, error: `File size exceeds ${sizeLimit}MB limit` };
    }

    // Validate file name
    const sanitizedName = this.sanitizeFileName(file.name);
    if (!sanitizedName) {
      return { isValid: false, error: 'Invalid file name' };
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    const extension = sanitizedName.toLowerCase().substring(sanitizedName.lastIndexOf('.'));
    if (suspiciousExtensions.includes(extension)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    return { isValid: true, sanitizedName };
  }

  /**
   * Sanitize file names to prevent security issues
   */
  private static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }

    return fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace unsafe characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }

  /**
   * Handle search edge cases
   */
  static validateSearchQuery(query: string): {
    isValid: boolean;
    sanitized?: string;
    error?: string;
  } {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Search query is required' };
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Search query cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { isValid: false, error: 'Search query is too long (max 500 characters)' };
    }

    // Check for potential injection attempts
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmed)) {
        return { isValid: false, error: 'Search query contains invalid content' };
      }
    }

    // Sanitize the query
    const sanitized = trimmed
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .replace(/\s+/g, ' '); // Normalize whitespace

    return { isValid: true, sanitized };
  }

  /**
   * Handle network connectivity issues
   */
  static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Try to fetch a small resource
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle browser compatibility issues
   */
  static checkBrowserCompatibility(): {
    isSupported: boolean;
    missingFeatures: string[];
  } {
    const missingFeatures: string[] = [];

    // Check for required APIs
    if (!window.fetch) {
      missingFeatures.push('Fetch API');
    }

    if (!window.File || !window.FileReader) {
      missingFeatures.push('File API');
    }

    if (!window.URL || !window.URL.createObjectURL) {
      missingFeatures.push('URL API');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      missingFeatures.push('Media Devices API');
    }

    if (!window.localStorage) {
      missingFeatures.push('Local Storage');
    }

    return {
      isSupported: missingFeatures.length === 0,
      missingFeatures
    };
  }
}

// React hook for handling edge cases
export const useEdgeCaseHandler = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [browserSupport] = useState(EdgeCaseHandler.checkBrowserCompatibility());
  const retryTimeoutsRef = useRef<Map<string, number>>(new Map());

  // Monitor network status
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const handleWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId: string,
    options: EdgeCaseConfig = {}
  ): Promise<T | null> => {
    // Clear any existing timeout for this operation
    const existingTimeout = retryTimeoutsRef.current.get(operationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    try {
      // Check network connectivity first
      if (!isOnline) {
        toast.error('No internet connection. Please check your network.');
        return null;
      }

      // Check browser compatibility
      if (!browserSupport.isSupported) {
        toast.error(`Browser not supported. Missing: ${browserSupport.missingFeatures.join(', ')}`);
        return null;
      }

      const result = await EdgeCaseHandler.handleApiFailure(operation, options);
      
      if (result === null) {
        toast.error('Operation failed after multiple attempts. Please try again later.');
      }

      return result;
    } catch (error) {
      console.error(`Operation ${operationId} failed:`, error);
      toast.error('An unexpected error occurred. Please try again.');
      return null;
    }
  }, [isOnline, browserSupport]);

  const handleFileUpload = useCallback(async (
    file: File | null,
    uploadFunction: (file: File) => Promise<any>
  ): Promise<any> => {
    // Validate file
    const validation = EdgeCaseHandler.validateFileUpload(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'File validation failed');
      return null;
    }

    if (!file) return null;

    // Handle upload with retries
    return handleWithRetry(
      () => uploadFunction(file),
      `upload-${file.name}`,
      { maxRetries: 3, timeout: 60000 }
    );
  }, [handleWithRetry]);

  const handleSearch = useCallback(async (
    query: string,
    searchFunction: (sanitizedQuery: string) => Promise<any>
  ): Promise<any> => {
    // Validate and sanitize query
    const validation = EdgeCaseHandler.validateSearchQuery(query);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid search query');
      return null;
    }

    if (!validation.sanitized) return null;

    // Handle search with retries
    return handleWithRetry(
      () => searchFunction(validation.sanitized!),
      `search-${Date.now()}`,
      { maxRetries: 2, timeout: 15000 }
    );
  }, [handleWithRetry]);

  const handleEmptyResults = useCallback((
    results: any[],
    searchType: string,
    suggestions?: string[]
  ) => {
    if (!results || results.length === 0) {
      let message = `No ${searchType} results found.`;
      
      if (suggestions && suggestions.length > 0) {
        message += ` Try: ${suggestions.join(', ')}`;
      }
      
      toast.error(message, { duration: 5000 });
      return true;
    }
    return false;
  }, []);

  const handlePartialResults = useCallback((
    results: any[],
    expectedCount: number,
    searchType: string
  ) => {
    if (results.length < expectedCount) {
      toast(`Found ${results.length} ${searchType} results. Some results may be unavailable.`, {
        icon: '⚠️',
        duration: 4000
      });
    }
  }, []);

  // Cleanup timeouts on unmount
  useState(() => {
    return () => {
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  });

  return {
    isOnline,
    browserSupport,
    handleWithRetry,
    handleFileUpload,
    handleSearch,
    handleEmptyResults,
    handlePartialResults,
    validateFile: EdgeCaseHandler.validateFileUpload,
    validateQuery: EdgeCaseHandler.validateSearchQuery,
    checkNetworkConnectivity: EdgeCaseHandler.checkNetworkConnectivity
  };
};

// Error recovery strategies
export const errorRecoveryStrategies = {
  /**
   * Retry with exponential backoff
   */
  exponentialBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Max retries reached:', error);
          return null;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  },

  /**
   * Circuit breaker pattern
   */
  circuitBreaker: (() => {
    const failures = new Map<string, { count: number; lastFailure: number }>();
    const FAILURE_THRESHOLD = 5;
    const RESET_TIMEOUT = 60000; // 1 minute

    return async <T>(
      operation: () => Promise<T>,
      operationId: string
    ): Promise<T | null> => {
      const now = Date.now();
      const failureInfo = failures.get(operationId);

      // Check if circuit is open
      if (failureInfo && 
          failureInfo.count >= FAILURE_THRESHOLD && 
          now - failureInfo.lastFailure < RESET_TIMEOUT) {
        console.warn(`Circuit breaker open for ${operationId}`);
        return null;
      }

      try {
        const result = await operation();
        // Reset failure count on success
        failures.delete(operationId);
        return result;
      } catch (error) {
        // Increment failure count
        const current = failures.get(operationId) || { count: 0, lastFailure: 0 };
        failures.set(operationId, {
          count: current.count + 1,
          lastFailure: now
        });
        throw error;
      }
    };
  })(),

  /**
   * Graceful degradation
   */
  gracefulDegradation: <T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T | null>,
    fallbackMessage?: string
  ): Promise<T | null> => {
    return primaryOperation().catch(async (error) => {
      console.warn('Primary operation failed, using fallback:', error.message);
      
      if (fallbackMessage) {
        toast(fallbackMessage, { icon: '⚠️' });
      }
      
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error('Fallback operation also failed:', fallbackError);
        return null;
      }
    });
  }
};
