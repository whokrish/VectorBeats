import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-7 bg-gray-300 dark:bg-gray-600 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
        animate={{
          x: theme === 'dark' ? 28 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
      >
        <motion.div
          initial={false}
          animate={{
            scale: theme === 'dark' ? 0 : 1,
            rotate: theme === 'dark' ? -180 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Sun className="w-3 h-3 text-yellow-500" />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{
            scale: theme === 'dark' ? 1 : 0,
            rotate: theme === 'dark' ? 0 : 180,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Moon className="w-3 h-3 text-blue-400" />
        </motion.div>
      </motion.div>
    </motion.button>
  );
};
