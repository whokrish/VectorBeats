import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Clock,
  Headphones,
  Copy,
  Check,
  ImageIcon
} from 'lucide-react';
import { demoImages, demoAudioClips, type DemoImage, type DemoAudio } from '../utils/demoConfig';
import { showToast } from './Toast';

interface DemoGalleryProps {
  onImageSelect: (image: DemoImage) => void;
  onAudioSelect: (audio: DemoAudio) => void;
  onMusicSelect?: (track: any) => void;
}

type TabType = 'images' | 'audio' | 'music';

export default function DemoGallery({ onImageSelect, onAudioSelect }: DemoGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('images');
  const [selectedImage, setSelectedImage] = useState<DemoImage | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<DemoAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Load audio durations when component mounts
  useEffect(() => {
    const loadAudioDurations = async () => {
      const durations: Record<string, number> = {};
      
      for (const audio of demoAudioClips) {
        try {
          const audioElement = document.createElement('audio');
          audioElement.src = audio.path;
          
          await new Promise((resolve, reject) => {
            audioElement.onloadedmetadata = () => {
              durations[audio.id] = Math.round(audioElement.duration);
              resolve(audioElement.duration);
            };
            audioElement.onerror = reject;
            audioElement.load();
          });
        } catch (error) {
          console.warn(`Could not load duration for ${audio.path}:`, error);
          durations[audio.id] = audio.duration; // fallback to config value
        }
      }
      
      setAudioDurations(durations);
    };
    
    loadAudioDurations();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        const audio = document.getElementById(`audio-${isPlaying}`) as HTMLAudioElement;
        if (audio) {
          audio.pause();
          audio.remove();
        }
      }
    };
  }, [isPlaying]);

  const handleImageSelect = (image: DemoImage) => {
    setSelectedImage(image);
    // Scroll to bottom of content area after a brief delay to allow state update
    setTimeout(() => {
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTo({ 
          top: contentAreaRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleAudioSelect = (audio: DemoAudio) => {
    setSelectedAudio(audio);
    // Scroll to bottom of content area after a brief delay to allow state update
    setTimeout(() => {
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTo({ 
          top: contentAreaRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleUseExample = () => {
    if (selectedImage && activeTab === 'images') {
      onImageSelect(selectedImage);
      setSelectedImage(null);
      showToast.success(`Using example image: ${selectedImage.name}`);
    } else if (selectedAudio && activeTab === 'audio') {
      onAudioSelect(selectedAudio);
      setSelectedAudio(null);
      showToast.success(`Using example audio: ${selectedAudio.name}`);
    }
  };

  const handlePlayAudio = async (audioId: string, audioPath: string, name: string) => {
    if (isPlaying === audioId) {
      // Stop current audio
      const audio = document.getElementById(`audio-${audioId}`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsPlaying(null);
      return;
    }

    try {
      // Stop any currently playing audio
      if (isPlaying) {
        const currentAudio = document.getElementById(`audio-${isPlaying}`) as HTMLAudioElement;
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // Create or get audio element
      let audio = document.getElementById(`audio-${audioId}`) as HTMLAudioElement;
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = `audio-${audioId}`;
        audio.src = audioPath;
        audio.preload = 'auto';
        document.body.appendChild(audio);
        
        // Add load event to debug
        audio.onloadedmetadata = () => {
          console.log(`Audio loaded: ${audioPath}, duration: ${audio.duration}s`);
        };
      }

      setIsPlaying(audioId);
      
      // Set up event listeners
      audio.onended = () => {
        setIsPlaying(null);
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', e, 'Path:', audioPath);
        showToast.error(`Could not play audio file: ${audioPath}`);
        setIsPlaying(null);
      };

      // Play the audio
      await audio.play();
      showToast.info(`Playing: ${name}`);
    } catch (error) {
      console.error('Audio playback error:', error);
      showToast.error(`Could not play audio preview: ${error}`);
      setIsPlaying(null);
    }
  };

  const handleCopyPath = async (path: string, name: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedId(path);
      showToast.success(`Copied path for ${name}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      showToast.error('Could not copy path');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nature': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'urban': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'emotions': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'activities': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'art': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const tabs = [
    { id: 'images', label: 'Example Images', icon: ImageIcon, count: demoImages.length },
    { id: 'audio', label: 'Sample Audio', icon: Headphones, count: demoAudioClips.length },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Demo Gallery</h3>
          <div className="text-sm text-gray-400">Pre-loaded examples for quick testing</div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={contentAreaRef} className="p-6 overflow-y-auto flex-1">
        <AnimatePresence mode="wait">
          {/* Images Tab */}
          {activeTab === 'images' && (
            <motion.div
              key="images"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoImages.map((image) => (
                  <motion.div
                    key={image.id}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-white/5 border rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${selectedImage?.id === image.id
                        ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'border-white/10 hover:border-white/20'
                      }`}
                    onClick={() => handleImageSelect(image)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={image.path} alt={image.name} style={{ objectFit: "cover", height: "100%", width: "100%" }} />
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs border ${getCategoryColor(image.category)}`}>
                          {image.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-2">{image.name}</h4>
                      <p className="text-sm text-gray-400 mb-3">{image.description}</p>

                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Expected Moods:</div>
                          <div className="flex flex-wrap gap-1">
                            {image.expectedMoods.slice(0, 3).map((mood) => (
                              <span key={mood} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                {mood}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Expected Genres:</div>
                          <div className="flex flex-wrap gap-1">
                            {image.expectedGenres.slice(0, 2).map((genre) => (
                              <span key={genre} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedImage && (
                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Selected: {selectedImage.name}</h4>
                      <p className="text-sm text-gray-400">This image will be used for music discovery</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyPath(selectedImage.path, selectedImage.name)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      >
                        {copiedId === selectedImage.path ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleUseExample}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                      >
                        Use This Image
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demoAudioClips.map((audio) => (
                  <motion.div
                    key={audio.id}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-white/5 border rounded-lg p-4 cursor-pointer transition-all duration-300 ${selectedAudio?.id === audio.id
                        ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'border-white/10 hover:border-white/20'
                      }`}
                    onClick={() => handleAudioSelect(audio)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg">
                        <Headphones className="h-6 w-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{audio.name}</h4>
                        <p className="text-sm text-gray-400 mb-3">{audio.description}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Genre:</div>
                            <div className="text-white capitalize">{audio.genre}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Tempo:</div>
                            <div className="text-white">{audio.tempo} BPM</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            {audioDurations[audio.id] || audio.duration}s
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAudio(audio.id, audio.path, audio.name);
                            }}
                            className={`ml-auto p-1 rounded transition-colors ${isPlaying === audio.id
                                ? 'bg-green-500 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                          >
                            {isPlaying === audio.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedAudio && (
                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Selected: {selectedAudio.name}</h4>
                      <p className="text-sm text-gray-400">This audio will be used for similarity matching</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyPath(selectedAudio.path, selectedAudio.name)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      >
                        {copiedId === selectedAudio.path ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleUseExample}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                      >
                        Use This Audio
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
