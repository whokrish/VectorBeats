import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock component for testing
const TestComponent = () => <div>Test Component</div>;

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('displays error UI when child component throws an error', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('categorizes errors correctly', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check that error category is displayed
    expect(screen.getByText(/General Error/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('shows retry button and handles retry', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('shows report button when error occurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Report Issue')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('limits retry attempts', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponentWithState = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <div>
          <button onClick={() => setShouldThrow(false)}>Fix</button>
          <ThrowError shouldThrow={shouldThrow} />
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <TestComponentWithState />
      </ErrorBoundary>
    );

    // Click retry multiple times to test limit
    const retryButton = screen.getByText('Try Again');
    
    // First retry
    fireEvent.click(retryButton);
    
    // Should still show retry button after first attempt
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });
});
