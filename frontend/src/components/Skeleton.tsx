import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  animation?: 'pulse' | 'wave' | 'shimmer';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular',
  animation = 'shimmer'
}) => {
  const baseClasses = 'bg-gradient-to-r from-gray-300/20 via-gray-200/30 to-gray-300/20 dark:from-gray-700/20 dark:via-gray-600/30 dark:to-gray-700/20';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded',
    card: 'rounded-lg h-48'
  };

  const shimmerAnimation = {
    x: ['-100%', '100%'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };

  const pulseAnimation = {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className} relative overflow-hidden`}>
      {animation === 'shimmer' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={shimmerAnimation}
        />
      )}
      {animation === 'pulse' && (
        <motion.div
          className="absolute inset-0"
          animate={pulseAnimation}
        />
      )}
    </div>
  );
};

export const MusicCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="w-16" />
        <Skeleton variant="rectangular" className="w-20 h-8 rounded" />
      </div>
    </div>
  );
};

export const SearchResultsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-48 h-6" />
        <Skeleton variant="text" className="w-24 h-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <MusicCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <Skeleton variant="text" className="w-80 h-10 mx-auto" />
        <Skeleton variant="text" className="w-64 h-6 mx-auto" />
      </div>
      
      <div className="max-w-md mx-auto">
        <Skeleton variant="rectangular" className="w-full h-40 rounded-lg" />
      </div>
      
      <SearchResultsSkeleton />
    </div>
  );
};
