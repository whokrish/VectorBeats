import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Info,
  Clock,
  Target,
  Zap,
  TrendingUp,
  Music,
  Image as ImageIcon,
  Mic,
  FileText,
  X,
  Check
} from 'lucide-react';
import { showToast } from './Toast';

// Import demo configuration - we'll create this as a separate module
import { 
  demoScenarios, 
  performanceMetrics, 
  type DemoScenario, 
  type DemoStep 
} from '../utils/demoConfig';

interface DemoModeProps {
  isActive: boolean;
  onToggle: () => void;
  onScenarioComplete?: (scenarioId: string) => void;
}

interface DemoState {
  currentScenario: DemoScenario | null;
  currentStepIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  showMetrics: boolean;
  completedSteps: number[];
  progress: number;
}

export default function DemoMode({ isActive, onToggle, onScenarioComplete }: DemoModeProps) {
  const [demoState, setDemoState] = useState<DemoState>({
    currentScenario: null,
    currentStepIndex: 0,
    isPlaying: false,
    isPaused: false,
    showMetrics: false,
    completedSteps: [],
    progress: 0
  });

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Auto-advance demo steps
  useEffect(() => {
    if (demoState.isPlaying && !demoState.isPaused && demoState.currentScenario) {
      const timer = setTimeout(() => {
        nextStep();
      }, 3000); // 3 seconds per step

      return () => clearTimeout(timer);
    }
  }, [demoState.isPlaying, demoState.isPaused, demoState.currentStepIndex]);

  // Calculate progress
  useEffect(() => {
    if (demoState.currentScenario) {
      const progress = (demoState.currentStepIndex / demoState.currentScenario.steps.length) * 100;
      setDemoState(prev => ({ ...prev, progress }));
    }
  }, [demoState.currentStepIndex, demoState.currentScenario]);

  const startScenario = (scenarioId: string) => {
    const scenario = demoScenarios.find((s: DemoScenario) => s.id === scenarioId);
    if (scenario) {
      setDemoState({
        currentScenario: scenario,
        currentStepIndex: 0,
        isPlaying: true,
        isPaused: false,
        showMetrics: false,
        completedSteps: [],
        progress: 0
      });
      setSelectedScenarioId(scenarioId);
      showToast.info(`Starting demo: ${scenario.title}`);
    }
  };

  const nextStep = () => {
    if (demoState.currentScenario && demoState.currentStepIndex < demoState.currentScenario.steps.length - 1) {
      setDemoState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        completedSteps: [...prev.completedSteps, prev.currentStepIndex]
      }));
    } else if (demoState.currentScenario) {
      // Demo completed
      completeDemo();
    }
  };

  const previousStep = () => {
    if (demoState.currentStepIndex > 0) {
      setDemoState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        completedSteps: prev.completedSteps.filter(step => step !== prev.currentStepIndex - 1)
      }));
    }
  };

  const pauseDemo = () => {
    setDemoState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetDemo = () => {
    setDemoState(prev => ({
      ...prev,
      currentStepIndex: 0,
      isPlaying: false,
      isPaused: false,
      completedSteps: [],
      progress: 0
    }));
  };

  const completeDemo = () => {
    if (demoState.currentScenario) {
      showToast.success(`Demo completed: ${demoState.currentScenario.title}`);
      onScenarioComplete?.(demoState.currentScenario.id);
      setDemoState(prev => ({ ...prev, showMetrics: true, isPlaying: false }));
    }
  };

  const getStepIcon = (action: DemoStep['action']) => {
    switch (action) {
      case 'upload_image': return <ImageIcon className="h-4 w-4" />;
      case 'record_audio': return <Mic className="h-4 w-4" />;
      case 'search_text': return <FileText className="h-4 w-4" />;
      case 'view_results': return <Target className="h-4 w-4" />;
      case 'play_audio': return <Music className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: DemoStep['action']) => {
    switch (action) {
      case 'upload_image': return 'text-blue-400';
      case 'record_audio': return 'text-red-400';
      case 'search_text': return 'text-green-400';
      case 'view_results': return 'text-purple-400';
      case 'play_audio': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!isActive) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50"
      >
        <Play className="h-6 w-6" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">VectorBeats Demo</h2>
                <p className="text-gray-400">Interactive guided tour</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scenario Selection */}
          {!demoState.currentScenario && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Choose a Demo Scenario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demoScenarios.map((scenario: DemoScenario) => (
                    <motion.div
                      key={scenario.id}
                      whileHover={{ scale: 1.02 }}
                      className={`bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:bg-white/10 ${
                        selectedScenarioId === scenario.id ? 'ring-2 ring-purple-500' : ''
                      }`}
                      onClick={() => startScenario(scenario.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{scenario.title}</h4>
                        <div className={`px-2 py-1 rounded text-xs ${
                          scenario.category === 'beginner' ? 'bg-green-500/20 text-green-400' :
                          scenario.category === 'advanced' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {scenario.category}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{scenario.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(scenario.estimatedTime / 60)}m {scenario.estimatedTime % 60}s
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {scenario.steps.length} steps
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics Preview */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Platform Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {performanceMetrics.map((metric: any, index: number) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-400 text-sm">{metric.label}</div>
                        {metric.trend && (
                          <TrendingUp className={`h-4 w-4 ${
                            metric.trend === 'up' ? 'text-green-400' :
                            metric.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {metric.value}{metric.unit}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Demo */}
          {demoState.currentScenario && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-white">{demoState.currentScenario.title}</h3>
                  <div className="text-sm text-gray-400">
                    Step {demoState.currentStepIndex + 1} of {demoState.currentScenario.steps.length}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${demoState.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Current Step */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-2 rounded-lg bg-white/10 ${getActionColor(demoState.currentScenario.steps[demoState.currentStepIndex]?.action)}`}>
                    {getStepIcon(demoState.currentScenario.steps[demoState.currentStepIndex]?.action)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-lg mb-2">
                      {demoState.currentScenario.steps[demoState.currentStepIndex]?.title}
                    </h4>
                    <p className="text-gray-400">
                      {demoState.currentScenario.steps[demoState.currentStepIndex]?.description}
                    </p>
                    {demoState.currentScenario.steps[demoState.currentStepIndex]?.expectedResult && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Check className="h-4 w-4" />
                          Expected Result: {demoState.currentScenario.steps[demoState.currentStepIndex].expectedResult}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={previousStep}
                    disabled={demoState.currentStepIndex === 0}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all duration-300"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    onClick={pauseDemo}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-2 rounded-lg transition-all duration-300"
                  >
                    {demoState.isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!demoState.currentScenario || demoState.currentStepIndex >= demoState.currentScenario.steps.length - 1}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all duration-300"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetDemo}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setDemoState(prev => ({ ...prev, currentScenario: null }))}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Exit Demo
                  </button>
                </div>
              </div>

              {/* Steps Overview */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Demo Progress</h4>
                <div className="space-y-2">
                  {demoState.currentScenario.steps.map((step: DemoStep, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                        index === demoState.currentStepIndex ? 'bg-purple-500/20 border border-purple-500/30' :
                        demoState.completedSteps.includes(index) ? 'bg-green-500/10 border border-green-500/30' :
                        'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className={`p-1 rounded ${getActionColor(step.action)}`}>
                        {getStepIcon(step.action)}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm ${
                          index === demoState.currentStepIndex ? 'text-white font-medium' :
                          demoState.completedSteps.includes(index) ? 'text-green-400' :
                          'text-gray-400'
                        }`}>
                          {step.title}
                        </div>
                      </div>
                      {demoState.completedSteps.includes(index) && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics (shown after demo completion) */}
          {demoState.showMetrics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-white">Demo Performance Results</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {performanceMetrics.slice(0, 4).map((metric: any, index: number) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-white">{metric.value}{metric.unit}</div>
                    <div className="text-sm text-gray-400">{metric.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
