import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Monitor,
  MousePointer,
  Settings,
  Mic,
  Check,
  FileVideo,
  Minus,
  ChevronDown
} from 'lucide-react';
import { showToast } from './Toast';

// Custom Select Component with proper theming
interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  className?: string;
}

function CustomSelect({ value, onChange, options, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors duration-150 ${
                  option.value === value 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

interface DemoRecorderProps {
  isVisible: boolean;
  onToggle: () => void;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
}

interface RecordingSettings {
  includeAudio: boolean;
  includeScreen: boolean;
  quality: 'low' | 'medium' | 'high';
  format: 'mp4';
  frameRate: 30 | 60;
}

export default function DemoVideoRecorder({ isVisible, onToggle }: DemoRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordedBlob: null,
    recordedUrl: null
  });
  
  const [settings, setSettings] = useState<RecordingSettings>({
    includeAudio: true,
    includeScreen: true,
    quality: 'medium',
    format: 'mp4',
    frameRate: 30
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStreamOptions = () => {
    const videoOptions = {
      width: settings.quality === 'low' ? 720 : settings.quality === 'medium' ? 1080 : 1440,
      height: settings.quality === 'low' ? 480 : settings.quality === 'medium' ? 720 : 900,
      frameRate: settings.frameRate
    };

    return {
      video: settings.includeScreen ? {
        mediaSource: 'screen',
        ...videoOptions
      } : videoOptions,
      audio: settings.includeAudio
    };
  };

  const startRecording = async () => {
    try {
      let stream: MediaStream;
      
      if (settings.includeScreen) {
        // Screen recording
        stream = await navigator.mediaDevices.getDisplayMedia(getStreamOptions());
        
        // Add microphone audio if requested
        if (settings.includeAudio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];
            stream.addTrack(audioTrack);
          } catch (audioError) {
            console.warn('Could not access microphone:', audioError);
            showToast.warning('Screen recording started without microphone access');
          }
        }
      } else {
        // Camera recording
        stream = await navigator.mediaDevices.getUserMedia(getStreamOptions());
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: `video/${settings.format}`
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: `video/${settings.format}` 
        });
        const url = URL.createObjectURL(blob);
        
        setRecordingState(prev => ({
          ...prev,
          recordedBlob: blob,
          recordedUrl: url,
          isRecording: false,
          isPaused: false
        }));
        
        showToast.success('Recording completed successfully!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0
      }));

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

      showToast.success('Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      showToast.error('Could not start recording. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      if (recordingState.isPaused) {
        mediaRecorderRef.current.resume();
        setRecordingState(prev => ({ ...prev, isPaused: false }));
        showToast.info('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        setRecordingState(prev => ({ ...prev, isPaused: true }));
        showToast.info('Recording paused');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const downloadRecording = () => {
    if (recordingState.recordedBlob && recordingState.recordedUrl) {
      const a = document.createElement('a');
      a.href = recordingState.recordedUrl;
      a.download = `vectorbeats-demo-${new Date().toISOString().slice(0, 16)}.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast.success('Demo video downloaded');
    }
  };

  const clearRecording = () => {
    if (recordingState.recordedUrl) {
      URL.revokeObjectURL(recordingState.recordedUrl);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      recordedBlob: null,
      recordedUrl: null
    });
    
    showToast.info('Recording cleared');
  };

  const generateHighlightsReel = async () => {
    setIsProcessing(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    showToast.success('Highlights reel generated! Check your downloads.');
  };

  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onToggle}
        className="fixed bottom-32 right-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40"
        title="Video Recorder"
      >
        <Video className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-4 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-lg">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Video Recorder</h2>
                <p className="text-gray-400">Record your VectorBeats demonstration</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Minus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Recording Area */}
          <div className="flex-1 p-6">
            {/* Recording Status */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                {recordingState.isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-medium">
                      {recordingState.isPaused ? 'PAUSED' : 'RECORDING'}
                    </span>
                  </div>
                )}
                
                <div className="text-3xl font-mono text-white">
                  {formatTime(recordingState.duration)}
                </div>
              </div>
              
              {recordingState.recordedUrl && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Check className="h-5 w-5" />
                    <span>Recording completed ({formatTime(recordingState.duration)})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 mb-8">
              {!recordingState.isRecording && !recordingState.recordedBlob ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg transition-all duration-300"
                >
                  <Video className="h-5 w-5" />
                  Start Recording
                </button>
              ) : recordingState.isRecording ? (
                <>
                  <button
                    onClick={pauseRecording}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg transition-all duration-300"
                  >
                    {recordingState.isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    {recordingState.isPaused ? 'Resume' : 'Pause'}
                  </button>
                  
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition-all duration-300"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </button>
                </>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={downloadRecording}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-3 rounded-lg transition-all duration-300"
                  >
                    <Download className="h-5 w-5" />
                    Download
                  </button>
                  
                  
                  <button
                    onClick={clearRecording}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-all duration-300"
                  >
                    Record Again
                  </button>
                </div>
              )}
            </div>

            {/* Recording Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Quick Recording Options
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSettings(prev => ({ ...prev, includeScreen: true, includeAudio: true }));
                      startRecording();
                    }}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-white">Screen + Audio</div>
                    <div className="text-sm text-gray-400">Record screen with microphone</div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSettings(prev => ({ ...prev, includeScreen: true, includeAudio: false }));
                      startRecording();
                    }}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-white">Screen Only</div>
                    <div className="text-sm text-gray-400">Silent screen recording</div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSettings(prev => ({ ...prev, includeScreen: false, includeAudio: true }));
                      startRecording();
                    }}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-white">Camera + Audio</div>
                    <div className="text-sm text-gray-400">Record yourself with audio</div>
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  Recording Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Start with the homepage for context</li>
                  <li>• Show image upload → music discovery flow</li>
                  <li>• Demonstrate audio recording features</li>
                  <li>• Highlight unique vector search technology</li>
                  <li>• Keep demo under 2 minutes for best impact</li>
                  <li>• Speak clearly if including audio narration</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-white/10 p-6 bg-white/5"
              >
                <h3 className="font-semibold text-white mb-4">Recording Settings</h3>
                
                <div className="space-y-6">
                  {/* Audio */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeAudio}
                        onChange={(e) => setSettings(prev => ({ ...prev, includeAudio: e.target.checked }))}
                        className="rounded"
                      />
                      <Mic className="h-4 w-4 text-gray-400" />
                      <span className="text-white">Include Audio</span>
                    </label>
                  </div>

                  {/* Screen */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeScreen}
                        onChange={(e) => setSettings(prev => ({ ...prev, includeScreen: e.target.checked }))}
                        className="rounded"
                      />
                      <Monitor className="h-4 w-4 text-gray-400" />
                      <span className="text-white">Screen Recording</span>
                    </label>
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-white mb-2">Quality</label>
                    <CustomSelect
                      value={settings.quality}
                      onChange={(value) => setSettings(prev => ({ ...prev, quality: value as 'low' | 'medium' | 'high' }))}
                      options={[
                        { value: 'low', label: 'Low (720p)' },
                        { value: 'medium', label: 'Medium (1080p)' },
                        { value: 'high', label: 'High (1440p)' }
                      ]}
                    />
                  </div>

                  {/* Frame Rate */}
                  <div>
                    <label className="block text-white mb-2">Frame Rate</label>
                    <CustomSelect
                      value={settings.frameRate}
                      onChange={(value) => setSettings(prev => ({ ...prev, frameRate: Number(value) as 30 | 60 }))}
                      options={[
                        { value: 30, label: '30 FPS' },
                        { value: 60, label: '60 FPS' }
                      ]}
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-white mb-2">Format</label>
                    <CustomSelect
                      value={settings.format}
                      onChange={(value) => setSettings(prev => ({ ...prev, format: value as 'mp4' }))}
                      options={[
                        { value: 'mp4', label: 'MP4' }
                      ]}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
