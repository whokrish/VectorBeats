import { useEffect, useState, useCallback, useRef, createElement } from 'react';

// Performance metrics interface
export interface PerformanceMetrics {
  // Timing metrics
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;

  // Custom metrics
  searchResponseTime: number;
  uploadProcessingTime: number;
  audioAnalysisTime: number;
  imageProcessingTime: number;

  // Resource metrics
  memoryUsage: number;
  bundleSize: number;
  networkRequests: number;
  failedRequests: number;

  // User interaction metrics
  searchCount: number;
  uploadCount: number;
  errorCount: number;
  sessionDuration: number;
}

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private sessionStart = Date.now();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
    this.collectInitialMetrics();
  }

  private initializeObservers() {
    // Web Vitals observer
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEventTiming;
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.metrics.cumulativeLayoutShift = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.fetchStart;
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    }
  }

  private collectInitialMetrics() {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Initial counters
    this.metrics.searchCount = 0;
    this.metrics.uploadCount = 0;
    this.metrics.errorCount = 0;
    this.metrics.networkRequests = 0;
    this.metrics.failedRequests = 0;
  }

  // Record custom metrics
  recordSearchTime(duration: number) {
    this.metrics.searchResponseTime = duration;
    this.metrics.searchCount = (this.metrics.searchCount || 0) + 1;
  }

  recordUploadTime(duration: number) {
    this.metrics.uploadProcessingTime = duration;
    this.metrics.uploadCount = (this.metrics.uploadCount || 0) + 1;
  }

  recordAudioAnalysisTime(duration: number) {
    this.metrics.audioAnalysisTime = duration;
  }

  recordImageProcessingTime(duration: number) {
    this.metrics.imageProcessingTime = duration;
  }

  recordNetworkRequest(success: boolean) {
    this.metrics.networkRequests = (this.metrics.networkRequests || 0) + 1;
    if (!success) {
      this.metrics.failedRequests = (this.metrics.failedRequests || 0) + 1;
    }
  }

  recordError() {
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
  }

  // Get current metrics
  getMetrics(): Partial<PerformanceMetrics> {
    // Update session duration
    this.metrics.sessionDuration = Date.now() - this.sessionStart;

    // Update memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    return { ...this.metrics };
  }

  // Generate performance report
  generateReport(): {
    summary: string;
    recommendations: string[];
    metrics: Partial<PerformanceMetrics>;
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    let summary = '';

    // Analyze Web Vitals
    if (metrics.largestContentfulPaint) {
      if (metrics.largestContentfulPaint > 2500) {
        recommendations.push('Optimize images and reduce bundle size to improve LCP');
        summary += 'Poor LCP performance. ';
      } else if (metrics.largestContentfulPaint > 1200) {
        summary += 'Fair LCP performance. ';
      } else {
        summary += 'Good LCP performance. ';
      }
    }

    if (metrics.firstInputDelay) {
      if (metrics.firstInputDelay > 100) {
        recommendations.push('Reduce JavaScript execution time to improve FID');
        summary += 'Poor FID performance. ';
      } else {
        summary += 'Good FID performance. ';
      }
    }

    if (metrics.cumulativeLayoutShift) {
      if (metrics.cumulativeLayoutShift > 0.25) {
        recommendations.push('Minimize layout shifts by setting image dimensions');
        summary += 'Poor CLS score. ';
      } else if (metrics.cumulativeLayoutShift > 0.1) {
        summary += 'Fair CLS score. ';
      } else {
        summary += 'Good CLS score. ';
      }
    }

    // Analyze custom metrics
    if (metrics.searchResponseTime && metrics.searchResponseTime > 3000) {
      recommendations.push('Optimize search algorithms and caching');
    }

    if (metrics.uploadProcessingTime && metrics.uploadProcessingTime > 10000) {
      recommendations.push('Implement progressive upload and chunking');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50) {
      recommendations.push('Monitor memory leaks and optimize data structures');
    }

    if (metrics.failedRequests && metrics.networkRequests) {
      const failureRate = metrics.failedRequests / metrics.networkRequests;
      if (failureRate > 0.05) {
        recommendations.push('Implement better error handling and retry mechanisms');
      }
    }

    return {
      summary: summary || 'Performance metrics collected successfully.',
      recommendations,
      metrics
    };
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Performance optimization utilities
export class PerformanceOptimizer {
  // Debounce function for expensive operations
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: number;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func.apply(null, args), delay);
    }) as T;
  }

  // Throttle function for frequent events
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  }

  // Memoization for expensive calculations
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    cacheSize: number = 10
  ): T {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = func.apply(null, args);
      
      // Limit cache size
      if (cache.size >= cacheSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, result);
      return result;
    }) as T;
  }

  // Lazy loading with intersection observer
  static createLazyLoader(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  // Virtual scrolling for large lists
  static calculateVisibleItems(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ): { start: number; end: number; offset: number } {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);
    const offset = start * itemHeight;

    return { start, end, offset };
  }

  // Image optimization
  static optimizeImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitorRef = useRef<PerformanceMonitor>();

  useEffect(() => {
    monitorRef.current = PerformanceMonitor.getInstance();
    setIsMonitoring(true);

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(monitorRef.current!.getMetrics());
    }, 5000);

    return () => {
      clearInterval(interval);
      monitorRef.current?.cleanup();
    };
  }, []);

  const recordOperation = useCallback((
    type: 'search' | 'upload' | 'audio' | 'image' | 'error',
    duration?: number
  ) => {
    if (!monitorRef.current) return;

    switch (type) {
      case 'search':
        if (duration) monitorRef.current.recordSearchTime(duration);
        break;
      case 'upload':
        if (duration) monitorRef.current.recordUploadTime(duration);
        break;
      case 'audio':
        if (duration) monitorRef.current.recordAudioAnalysisTime(duration);
        break;
      case 'image':
        if (duration) monitorRef.current.recordImageProcessingTime(duration);
        break;
      case 'error':
        monitorRef.current.recordError();
        break;
    }
  }, []);

  const recordNetworkRequest = useCallback((success: boolean) => {
    monitorRef.current?.recordNetworkRequest(success);
  }, []);

  const generateReport = useCallback(() => {
    return monitorRef.current?.generateReport();
  }, []);

  const getRecommendations = useCallback(() => {
    const report = generateReport();
    return report?.recommendations || [];
  }, [generateReport]);

  return {
    metrics,
    isMonitoring,
    recordOperation,
    recordNetworkRequest,
    generateReport,
    getRecommendations
  };
};

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const PerformanceWrapper = (props: P) => {
    const mountTime = useRef(Date.now());

    useEffect(() => {
      // Record component mount time
      const renderTime = Date.now() - mountTime.current;
      console.log(`${componentName} rendered in ${renderTime}ms`);
      
      return () => {
        // Record component unmount time
        const totalTime = Date.now() - mountTime.current;
        console.log(`${componentName} was mounted for ${totalTime}ms`);
      };
    }, []);

    return createElement(WrappedComponent, props);
  };

  return PerformanceWrapper;
};

// Performance timing decorator
export const measurePerformance = (
  _target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;
      console.log(`${propertyName} executed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${propertyName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };

  return descriptor;
};
