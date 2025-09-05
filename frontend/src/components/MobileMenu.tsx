import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface MobileMenuProps {
  navItems: Array<{
    to: string;
    icon: React.ComponentType<any>;
    label: string;
  }>;
  children?: React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ navItems, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="md:hidden">
      {/* Mobile Menu Button */}
      <motion.button
        onClick={toggleMenu}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={toggleMenu}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Navigation
                    </h2>
                    <motion.button
                      onClick={toggleMenu}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-6">
                  <div className="space-y-2">
                    {navItems.map((item, index) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <motion.div
                          key={item.to}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Link
                            to={item.to}
                            onClick={toggleMenu}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                            <span className="font-medium">{item.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="activeIndicator"
                                className="ml-auto w-2 h-2 bg-white rounded-full"
                              />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </nav>

                {/* Additional Content */}
                {children && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    {children}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
