import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'gradient' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = true,
  clickable = false,
  onClick,
  variant = 'default',
  size = 'md',
}) => {
  const variants = {
    default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg',
    glass: 'bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-xl',
    gradient: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800 shadow-lg',
    minimal: 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm',
  };

  const sizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const cardVariants = {
    idle: { 
      scale: 1, 
      y: 0,
      boxShadow: variant === 'glass' 
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        : '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    },
    hover: { 
      scale: hover ? 1.02 : 1, 
      y: hover ? -5 : 0,
      boxShadow: variant === 'glass'
        ? '0 35px 60px -12px rgba(0, 0, 0, 0.4)'
        : '0 20px 40px -4px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.1)',
      transition: {
        duration: 0.2,
        ease: "easeOut" as const
      }
    },
    tap: { 
      scale: clickable ? 0.98 : 1,
      transition: {
        duration: 0.1
      }
    },
  };

  const baseClasses = `
    rounded-xl transition-all duration-300
    ${variants[variant]}
    ${sizes[size]}
    ${clickable ? 'cursor-pointer' : ''}
    ${className}
  `;

  return (
    <motion.div
      className={baseClasses}
      variants={cardVariants}
      initial="idle"
      whileHover={hover ? "hover" : "idle"}
      whileTap={clickable ? "tap" : "idle"}
      onClick={onClick}
      layout
    >
      {/* Gradient overlay for glass cards */}
      {variant === 'glass' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}
      
      {/* Shine effect on hover */}
      {hover && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            transform: 'translateX(-100%)',
          }}
          whileHover={{
            transform: 'translateX(100%)',
            transition: { duration: 0.6, ease: "easeInOut" }
          }}
        />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
