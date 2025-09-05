import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  pulse = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg shadow-gray-500/25',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white',
    ghost: 'text-purple-500 hover:bg-purple-500/10',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    loading: { scale: 1 },
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };

  const getAnimateValue = () => {
    if (loading) return "loading";
    if (pulse) return pulseAnimation;
    return "idle";
  };

  return (
    <motion.button
      className={baseClasses}
      variants={buttonVariants}
      initial="idle"
      whileHover={!disabled && !loading ? "hover" : "idle"}
      whileTap={!disabled && !loading ? "tap" : "idle"}
      animate={getAnimateValue()}
      disabled={disabled || loading}
      {...props}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300"
        style={{
          background: variant === 'primary' 
            ? 'linear-gradient(45deg, rgba(168, 85, 247, 0.4), rgba(236, 72, 153, 0.4))'
            : 'rgba(255, 255, 255, 0.1)'
        }}
        whileHover={{ opacity: 0.2 }}
      />

      {/* Loading spinner */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mr-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
        </motion.div>
      )}

      {/* Left icon */}
      {leftIcon && !loading && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mr-2"
        >
          {leftIcon}
        </motion.div>
      )}

      {/* Button text */}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: loading ? 0.7 : 1 }}
        className="relative z-10"
      >
        {children}
      </motion.span>

      {/* Right icon */}
      {rightIcon && !loading && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2"
        >
          {rightIcon}
        </motion.div>
      )}

      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 4, opacity: [0, 1, 0] }}
        transition={{ duration: 0.6 }}
      />
    </motion.button>
  );
};
