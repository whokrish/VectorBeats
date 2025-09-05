import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock IntersectionObserver
(global as any).IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
(global as any).ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock PerformanceObserver
(global as any).PerformanceObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  },
});

// Mock URL.createObjectURL
(global as any).URL.createObjectURL = vi.fn(() => 'mock-url');
(global as any).URL.revokeObjectURL = vi.fn();

// Mock Audio constructor
(global as any).Audio = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  duration: 100,
  currentTime: 0,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
}));

// Mock Image constructor
(global as any).Image = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  width: 100,
  height: 100,
  onload: null,
  onerror: null,
  src: '',
}));

// Mock fetch for testing
(global as any).fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
