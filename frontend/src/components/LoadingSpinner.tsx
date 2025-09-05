import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'purple' | 'pink';
  className?: string;
  fullScreen?: boolean;
  message?: string;
  variant?: 'spinner' | 'pulse' | 'music';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'purple',
  className = '',
  fullScreen = true,
  message,
  variant = 'music'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    white: 'text-gray-900 dark:text-white',
    purple: 'text-purple-500',
    pink: 'text-pink-500'
  };

  const LoadingIcon = () => {
    switch (variant) {
      case 'spinner':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={`${sizeClasses[size]} ${colorClasses[color]}`}
          >
            <Loader2 className="w-full h-full" />
          </motion.div>
        );
      
      case 'pulse':
        return (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className={`${sizeClasses[size]} ${colorClasses[color]}`}
          >
            <div className="w-full h-full rounded-full bg-current" />
          </motion.div>
        );
      
      case 'music':
      default:
        return (
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`${sizeClasses[size]} ${colorClasses[color]}`}
            >
              <Music className="w-full h-full" />
            </motion.div>
            
            {/* Music bars animation */}
            <div className="flex items-end space-x-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-1 bg-current ${colorClasses[color]}`}
                  animate={{
                    height: [8, 20, 8],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>
        );
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 dark:border-white/10 p-8 shadow-2xl"
    >
      <div className="flex flex-col items-center space-y-6">
        <LoadingIcon />
        
        <div className="text-center">
          <motion.h3 
            className="text-gray-900 dark:text-white font-semibold mb-2 text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {message || 'Processing...'}
          </motion.h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Our AI is analyzing your input
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-purple-400 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  if (!fullScreen) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingSpinner;
