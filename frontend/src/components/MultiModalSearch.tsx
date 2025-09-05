import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image, Mic, Filter, X, Sliders, History, Sparkles, Upload, Volume2 } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { showToast } from './Toast';

interface SearchFilters {
  genres?: string[];
  mood?: string[];
  tempo?: { min?: number; max?: number };
  energy?: { min?: number; max?: number };
  danceability?: { min?: number; max?: number };
  valence?: { min?: number; max?: number };
  year?: { min?: number; max?: number };
  duration?: { min?: number; max?: number };
}

interface MultiModalSearchProps {
  onSearch: (searchData: any) => void;
  isLoading: boolean;
  suggestions: any[];
  searchHistory: any[];
}

export default function MultiModalSearch({ 
  onSearch, 
  isLoading, 
  suggestions, 
  searchHistory 
}: MultiModalSearchProps) {
  const [searchType, setSearchType] = useState<'text' | 'image_text' | 'image_audio' | 'text_audio' | 'combined'>('text');
  const [textQuery, setTextQuery] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {
    if (!textQuery && !description && !imageFile && !audioFile) {
      showToast.warning('Please provide at least one search input');
      return;
    }

    const searchData = {
      type: searchType,
      text: textQuery,
      description,
      image: imageFile,
      audio: audioFile,
      filters,
      limit: 20
    };

    showToast.info('Starting your music discovery...');
    onSearch(searchData);
  }, [searchType, textQuery, description, imageFile, audioFile, filters, onSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    showToast.success('Filters cleared');
  };

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    showToast.success('Image uploaded successfully');
  };

  const handleAudioUpload = (file: File) => {
    setAudioFile(file);
    showToast.success('Audio file uploaded successfully');
  };

  const removeFile = (type: 'image' | 'audio') => {
    if (type === 'image') {
      setImageFile(null);
      setImagePreview(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      showToast.info('Image removed');
    } else {
      setAudioFile(null);
      if (audioInputRef.current) audioInputRef.current.value = '';
      showToast.info('Audio file removed');
    }
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof SearchFilters];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  const searchTypeOptions = [
    { id: 'text', label: 'Text Only', icon: Search, description: 'Search with words and descriptions' },
    { id: 'image_text', label: 'Image + Text', icon: Image, description: 'Combine visual and textual search' },
    { id: 'image_audio', label: 'Image + Audio', icon: Mic, description: 'Upload image and audio sample' },
    { id: 'text_audio', label: 'Text + Audio', icon: Volume2, description: 'Describe with words and audio' },
    { id: 'combined', label: 'All Combined', icon: Sparkles, description: 'Ultimate multi-modal search' }
  ];

  return (
    <motion.div 
      className="w-full max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Search Type Selector */}
      <Card variant="glass" className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          Choose Your Search Method
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {searchTypeOptions.map(({ id, label, icon: Icon, description }) => (
            <motion.button
              key={id}
              onClick={() => setSearchType(id as any)}
              className={`p-4 rounded-xl transition-all duration-200 text-center space-y-2 ${
                searchType === id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                  : 'bg-white/10 dark:bg-black/10 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'
              }`}
              whileHover={{ scale: searchType === id ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="h-6 w-6 mx-auto" />
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs opacity-80">{description}</div>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Main Search Interface */}
      <Card variant="glass" className="p-6">
        <div className="space-y-6">
          {/* Text Input */}
          <AnimatePresence>
            {(searchType === 'text' || searchType === 'image_text' || searchType === 'text_audio' || searchType === 'combined') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search Query
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="Enter song name, artist, or describe what you're looking for..."
                    className="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  
                  {/* Search Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 backdrop-blur-sm border border-gray-200 dark:border-white/20 rounded-lg mt-1 max-h-40 overflow-y-auto z-10 shadow-xl"
                      >
                        {suggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              setTextQuery(suggestion.query);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <span>{suggestion.query}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{suggestion.category}</span>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description Input */}
          <AnimatePresence>
            {(searchType === 'image_text' || searchType === 'combined') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the mood, genre, or feeling you're looking for..."
                  rows={3}
                  className="w-full bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* File Uploads */}
          <AnimatePresence>
            {(searchType !== 'text') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Image Upload */}
                {(searchType === 'image_text' || searchType === 'image_audio' || searchType === 'combined') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Upload Image
                    </label>
                    <div className="relative">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                      <motion.button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-300 dark:border-white/30 rounded-lg p-6 text-center hover:border-purple-400 dark:hover:border-purple-400 transition-all duration-200 group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {imageFile ? (
                          <div className="space-y-4">
                            {imagePreview && (
                              <motion.img
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={imagePreview}
                                alt="Preview"
                                className="w-24 h-24 object-cover rounded-lg mx-auto shadow-lg"
                              />
                            )}
                            <div className="space-y-2">
                              <Upload className="h-6 w-6 mx-auto text-green-500" />
                              <p className="text-green-600 dark:text-green-400 font-medium">{imageFile.name}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile('image');
                                }}
                                className="text-red-500 border-red-300 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Image className="h-8 w-8 mx-auto text-gray-400 group-hover:text-purple-500 transition-colors" />
                            <div>
                              <p className="text-gray-600 dark:text-gray-400 font-medium">Click to upload image</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                            </div>
                          </div>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Audio Upload */}
                {(searchType === 'image_audio' || searchType === 'text_audio' || searchType === 'combined') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Upload Audio
                    </label>
                    <div className="relative">
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(file);
                        }}
                        className="hidden"
                      />
                      <motion.button
                        onClick={() => audioInputRef.current?.click()}
                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-300 dark:border-white/30 rounded-lg p-6 text-center hover:border-purple-400 dark:hover:border-purple-400 transition-all duration-200 group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {audioFile ? (
                          <div className="space-y-3">
                            <Mic className="h-8 w-8 mx-auto text-green-500" />
                            <div className="space-y-2">
                              <p className="text-green-600 dark:text-green-400 font-medium">{audioFile.name}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile('audio');
                                }}
                                className="text-red-500 border-red-300 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Mic className="h-8 w-8 mx-auto text-gray-400 group-hover:text-purple-500 transition-colors" />
                            <div>
                              <p className="text-gray-600 dark:text-gray-400 font-medium">Click to upload audio</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">MP3, WAV, FLAC up to 25MB</p>
                            </div>
                          </div>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="h-4 w-4" />}
                className={activeFiltersCount > 0 ? 'border-purple-500 text-purple-600' : ''}
              >
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
                leftIcon={<History className="h-4 w-4" />}
              >
                History
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={handleSearch}
              loading={isLoading}
              disabled={!textQuery && !description && !imageFile && !audioFile}
              leftIcon={<Search className="h-4 w-4" />}
              size="lg"
              pulse={!isLoading && Boolean(textQuery || description || imageFile || audioFile)}
            >
              {isLoading ? 'Discovering...' : 'Search Music'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card variant="glass" className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  Advanced Filters
                </h3>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    leftIcon={<X className="h-4 w-4" />}
                    className="text-red-500 border-red-300 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Genre Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Genres</label>
                  <select
                    multiple
                    value={filters.genres || []}
                    onChange={(e) => handleFilterChange('genres', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
                  >
                    {['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'blues', 'folk', 'reggae'].map(genre => (
                      <option key={genre} value={genre} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tempo Range */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tempo (BPM)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.tempo?.min || ''}
                      onChange={(e) => handleFilterChange('tempo', { ...filters.tempo, min: parseInt(e.target.value) || undefined })}
                      className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.tempo?.max || ''}
                      onChange={(e) => handleFilterChange('tempo', { ...filters.tempo, max: parseInt(e.target.value) || undefined })}
                      className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Energy Range */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Energy (0-1)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      placeholder="Min"
                      value={filters.energy?.min || ''}
                      onChange={(e) => handleFilterChange('energy', { ...filters.energy, min: parseFloat(e.target.value) || undefined })}
                      className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      placeholder="Max"
                      value={filters.energy?.max || ''}
                      onChange={(e) => handleFilterChange('energy', { ...filters.energy, max: parseFloat(e.target.value) || undefined })}
                      className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/30 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search History */}
      <AnimatePresence>
        {showHistory && searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Searches
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchHistory.slice(0, 10).map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setTextQuery(item.query);
                      setShowHistory(false);
                      showToast.info('Search query applied from history');
                    }}
                    className="w-full text-left p-4 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transition-all duration-200 border border-gray-200 dark:border-white/10 group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-gray-800 dark:text-gray-200 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{item.query}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.results_count} results</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
