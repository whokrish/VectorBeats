import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Database, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Activity,
  Gauge,
  RefreshCw,
  X
} from 'lucide-react';
import { performanceMetrics, type PerformanceMetric } from '../utils/demoConfig';

interface PerformanceDisplayProps {
  isVisible: boolean;
  onToggle: () => void;
  realTimeUpdates?: boolean;
}

interface LiveMetric extends PerformanceMetric {
  currentValue: string | number;
  isUpdating: boolean;
}

export default function PerformanceDisplay({ 
  isVisible, 
  onToggle, 
  realTimeUpdates = false 
}: PerformanceDisplayProps) {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize live metrics
  useEffect(() => {
    const initialMetrics = performanceMetrics.map(metric => ({
      ...metric,
      currentValue: metric.value,
      isUpdating: false
    }));
    setLiveMetrics(initialMetrics);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setLiveMetrics(prev => prev.map(metric => {
        // Randomly update some metrics
        if (Math.random() > 0.7) {
          let newValue = metric.value;
          
          if (typeof metric.value === 'number') {
            // Add small random variation
            const variation = (Math.random() - 0.5) * 0.1 * metric.value;
            newValue = Math.max(0, metric.value + variation);
            
            // Round based on the original value
            if (metric.value > 100) {
              newValue = Math.round(newValue);
            } else {
              newValue = Math.round(newValue * 10) / 10;
            }
          }
          
          return {
            ...metric,
            currentValue: newValue,
            isUpdating: true
          };
        }
        
        return {
          ...metric,
          isUpdating: false
        };
      }));
      
      // Reset updating flag after animation
      setTimeout(() => {
        setLiveMetrics(prev => prev.map(metric => ({
          ...metric,
          isUpdating: false
        })));
      }, 1000);
    }, 3000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update all metrics with slight variations
    setLiveMetrics(prev => prev.map(metric => {
      let newValue = metric.value;
      
      if (typeof metric.value === 'number') {
        const variation = (Math.random() - 0.5) * 0.05 * metric.value;
        newValue = Math.max(0, metric.value + variation);
        
        if (metric.value > 100) {
          newValue = Math.round(newValue);
        } else {
          newValue = Math.round(newValue * 10) / 10;
        }
      }
      
      return {
        ...metric,
        currentValue: newValue,
        isUpdating: true
      };
    }));
    
    setIsRefreshing(false);
    
    // Reset updating flags
    setTimeout(() => {
      setLiveMetrics(prev => prev.map(metric => ({
        ...metric,
        isUpdating: false
      })));
    }, 1000);
  };

  const getMetricIcon = (label: string) => {
    if (label.includes('Speed') || label.includes('Time')) return Clock;
    if (label.includes('Database') || label.includes('Size')) return Database;
    if (label.includes('Accuracy') || label.includes('Quality')) return Target;
    if (label.includes('Response')) return Activity;
    return BarChart3;
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      case 'stable': return Minus;
      default: return Minus;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'stable': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onToggle}
        className="fixed bottom-20 right-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40"
        title="Show Performance Metrics"
      >
        <Gauge className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="fixed top-20 right-6 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl z-40 max-h-[80vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Performance Metrics</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Real-time system stats</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onToggle}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Hide Metrics"
            >
              <X className='h-4 w-4'/>
            </button>
          </div>
        </div>
   
      </div>

      {/* Metrics Grid */}
      <div className="p-4 space-y-4">
        {liveMetrics.map((metric, index) => {
          const IconComponent = getMetricIcon(metric.label);
          const TrendIcon = getTrendIcon(metric.trend);
          const trendColor = getTrendColor(metric.trend);
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                metric.isUpdating
                  ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{metric.label}</span>
                </div>
                
                {metric.trend && (
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              <div className="flex items-baseline gap-1 mb-2">
                <motion.span
                  key={metric.currentValue.toString()}
                  initial={metric.isUpdating ? { scale: 1.1, color: '#60a5fa' } : false}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                >
                  {metric.currentValue}
                </motion.span>
                {metric.unit && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">{metric.unit}</span>
                )}
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-500 leading-relaxed">
                {metric.description}
              </p>
              
              {/* Performance Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: typeof metric.currentValue === 'number' 
                        ? `${Math.min(100, (metric.currentValue / (metric.value as number)) * 100)}%`
                        : '75%'
                    }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">99.8%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Uptime</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">
              {liveMetrics.filter(m => m.trend === 'up').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Improving</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
