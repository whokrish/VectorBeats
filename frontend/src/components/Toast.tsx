import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

// Custom toast notifications
export const showToast = {
  success: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.5 }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-green-500/90 backdrop-blur-sm border border-green-400/50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-green-400/50">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:text-green-100 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    ));
  },

  error: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.5 }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-red-500/90 backdrop-blur-sm border border-red-400/50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-red-400/50">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    ));
  },

  warning: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.5 }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-yellow-500/90 backdrop-blur-sm border border-yellow-400/50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-yellow-400/50">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:text-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    ));
  },

  info: (message: string) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.5 }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-blue-500/90 backdrop-blur-sm border border-blue-400/50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-blue-400/50">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    ));
  },
};

export const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    />
  );
};
