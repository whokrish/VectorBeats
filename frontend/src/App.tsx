import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Music, Home as HomeIcon, Search, History, HelpCircle, Play, Image as ImageIcon, BarChart3, Video } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Contexts and Providers
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { ToastContainer, showToast } from './components/Toast'

// Components
import Home from './components/Home'
import ImageUpload from './components/ImageUpload'
import AudioUpload from './components/AudioUpload'
import MusicResults from './components/MusicResults'
import SearchHistory from './components/SearchHistory'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeToggle } from './components/ThemeToggle'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { MobileMenu } from './components/MobileMenu'

// Demo Components
import DemoMode from './components/DemoMode'
import DemoGallery from './components/DemoGallery'
import PerformanceDisplay from './components/PerformanceDisplay'
import DemoVideoRecorder from './components/DemoVideoRecorder'

// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// Types
import { type DemoImage, type DemoAudio } from './utils/demoConfig'

// Types
export interface SearchResult {
  id: string
  score: number
  metadata: {
    title?: string
    artist?: string
    album?: string
    genre?: string
    duration?: number
    preview_url?: string
    spotify_url?: string
    track_id?: string
  }
  search_type?: string
}

export interface SearchState {
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  searchHistory: SearchHistoryItem[]
  processingTime?: number
  replayQuery?: string
  replayType?: 'image' | 'audio' | 'text'
}

export interface SearchHistoryItem {
  id: string
  type: 'image' | 'audio' | 'text'
  query: string
  timestamp: string
  results_count: number
  thumbnail?: string
}

function AppContent() {
  const { toggleTheme } = useTheme()
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    searchHistory: [],
    replayQuery: undefined,
    replayType: undefined
  })
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Demo feature states
  const [demoMode, setDemoMode] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showDemoGallery, setShowDemoGallery] = useState(false)
  const [showVideoRecorder, setShowVideoRecorder] = useState(false)

  const updateSearchState = (updates: Partial<SearchState>) => {
    setSearchState(prev => ({ ...prev, ...updates }))
  }

  const clearResults = () => {
    updateSearchState({ results: [], error: null })
  }

  const handleDemoImageSelect = async (image: DemoImage) => {
    console.log('Demo image selected:', image)
    setShowDemoGallery(false)

    // Trigger actual image search with demo image
    updateSearchState({ isLoading: true })

    try {
      // Construct the full URL for the backend static file
      const backendUrl = 'http://localhost:3001' // Your backend URL
      const imageUrl = image.path.startsWith('/uploads')
        ? `${backendUrl}${image.path}`
        : image.path

      console.log('Fetching demo image from:', imageUrl)

      // Fetch the demo image file and convert to blob
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch demo image: ${imageResponse.status}`)
      }

      const imageBlob = await imageResponse.blob()

      // Create FormData to upload image
      const formData = new FormData()
      const imageFile = new File([imageBlob], `${image.id}.jpg`, {
        type: 'image/jpeg'
      })
      formData.append('image', imageFile)

      console.log('Uploading demo image:', {
        name: image.name,
        path: image.path,
        imageUrl: imageUrl,
        size: imageBlob.size,
        type: imageFile.type,
        fileName: `${image.id}.jpg`
      })

      // Upload image and get analysis
      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })

      console.log('Upload response status:', uploadResponse.status)

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Upload error response:', errorText)
        throw new Error(`Failed to process demo image: ${uploadResponse.status} - ${errorText}`)
      }

      const uploadResult = await uploadResponse.json()

      if (uploadResult.success && uploadResult.data.music_results) {
        // Convert music results to the expected format
        const imageResults = uploadResult.data.music_results.results.map((track: any) => ({
          id: track.id || Math.random().toString(),
          title: track.title || track.name || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          album: track.album,
          genre: track.genre,
          duration: track.duration || track.duration_ms,
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          similarity_score: track.similarity_score,
          metadata: {
            track_id: track.id,
            title: track.title || track.name,
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            duration: track.duration || track.duration_ms,
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify,
            search_type: 'image'
          }
        }))

        updateSearchState({
          results: imageResults,
          isLoading: false,
          processingTime: uploadResult.data.music_results.processing_time || 0
        })

        console.log(`Demo image search completed: ${imageResults.length} results found`)

        // Show success notification
        showToast.success(`Found ${imageResults.length} matching tracks for your demo image!`)

        // Navigate to search page to show results
        setTimeout(() => {
          const event = new CustomEvent('navigate-to-search')
          window.dispatchEvent(event)
        }, 100)
      } else {
        // If no real results, show error instead of mock data
        updateSearchState({
          results: [],
          isLoading: false,
          error: 'No music results found for this image. Please try a different image or check if the ML service is running.'
        })

        console.log('Image search completed with no results')

        // Show error notification
        showToast.error('No music matches found for your image')
      }
    } catch (error) {
      console.error('Demo image search error:', error)
      showToast.error(`Failed to process demo image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      updateSearchState({
        isLoading: false,
        results: [],
        error: `Failed to process demo image: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  const handleDemoAudioSelect = async (audio: DemoAudio) => {
    console.log('Demo audio selected:', audio)
    setShowDemoGallery(false)

    // Trigger actual audio similarity search with demo audio
    updateSearchState({ isLoading: true })

    try {
      // Fetch the demo audio file and convert to blob
      const audioResponse = await fetch(audio.path)
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch demo audio: ${audioResponse.status}`)
      }

      const audioBlob = await audioResponse.blob()

      // Create FormData to upload audio
      const formData = new FormData()
      const audioFile = new File([audioBlob], `${audio.id}.wav`, {
        type: 'audio/wav'
      })
      formData.append('audio', audioFile)

      console.log('Uploading demo audio:', {
        name: audio.name,
        path: audio.path,
        size: audioBlob.size,
        type: audioFile.type,
        fileName: `${audio.id}.wav`
      })

      // Upload audio and get analysis
      const uploadResponse = await fetch('/api/audio/hum', {
        method: 'POST',
        body: formData
      })

      console.log('Upload response status:', uploadResponse.status)

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Upload error response:', errorText)
        throw new Error(`Failed to process demo audio: ${uploadResponse.status} - ${errorText}`)
      }

      const uploadResult = await uploadResponse.json()

      if (uploadResult.success && uploadResult.data.analysis.matches) {
        // Convert matches to results format
        const audioResults = uploadResult.data.analysis.matches.map((match: any) => ({
          id: match.id || Math.random().toString(),
          title: match.title || 'Unknown Title',
          artist: match.artist || 'Unknown Artist',
          album: match.album,
          genre: match.genre,
          duration: match.duration,
          preview_url: match.preview_url,
          external_urls: match.external_urls,
          similarity_score: match.confidence || match.similarity_score,
          metadata: {
            track_id: match.id,
            title: match.title,
            artist: match.artist,
            album: match.album,
            genre: match.genre,
            duration: match.duration,
            preview_url: match.preview_url,
            spotify_url: match.external_urls?.spotify,
            search_type: 'audio'
          }
        }))

        updateSearchState({
          results: audioResults,
          isLoading: false,
          processingTime: uploadResult.data.analysis.processing_time
        })

        console.log(`Demo audio search completed: ${audioResults.length} results found`)

        // Show success notification
        showToast.success(`Found ${audioResults.length} similar tracks for your demo audio!`)

        // Navigate to search page to show results
        setTimeout(() => {
          const event = new CustomEvent('navigate-to-search')
          window.dispatchEvent(event)
        }, 100)
      } else {
        // If no real results, show error instead of mock data
        updateSearchState({
          results: [],
          isLoading: false,
          error: 'No similar tracks found for this audio. Please try different audio or check if the ML service is running.'
        })

        console.log('Audio search completed with no results')

        // Show error notification
        showToast.error('No similar tracks found for your audio')
      }
    } catch (error) {
      console.error('Demo audio search error:', error)
      showToast.error(`Failed to process demo audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
      updateSearchState({
        isLoading: false,
        results: [],
        error: `Failed to process demo audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  const navItems = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/history', icon: History, label: 'History' },
  ];

  return (
    <Router>
      <AppRouter
        searchState={searchState}
        updateSearchState={updateSearchState}
        showShortcutsModal={showShortcutsModal}
        setShowShortcutsModal={setShowShortcutsModal}
        navItems={navItems}
        toggleTheme={toggleTheme}
        clearResults={clearResults}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        showMetrics={showMetrics}
        setShowMetrics={setShowMetrics}
        showDemoGallery={showDemoGallery}
        setShowDemoGallery={setShowDemoGallery}
        showVideoRecorder={showVideoRecorder}
        setShowVideoRecorder={setShowVideoRecorder}
        handleDemoImageSelect={handleDemoImageSelect}
        handleDemoAudioSelect={handleDemoAudioSelect}
      />
    </Router>
  )
}

// Router component that has access to navigate
function AppRouter({
  searchState,
  updateSearchState,
  showShortcutsModal,
  setShowShortcutsModal,
  navItems,
  toggleTheme,
  clearResults,
  demoMode,
  setDemoMode,
  showMetrics,
  setShowMetrics,
  showDemoGallery,
  setShowDemoGallery,
  showVideoRecorder,
  setShowVideoRecorder,
  handleDemoImageSelect,
  handleDemoAudioSelect
}: {
  searchState: SearchState
  updateSearchState: (updates: Partial<SearchState>) => void
  showShortcutsModal: boolean
  setShowShortcutsModal: (show: boolean) => void
  navItems: Array<{ to: string, icon: any, label: string }>
  toggleTheme: () => void
  clearResults: () => void
  demoMode: boolean
  setDemoMode: (show: boolean) => void
  showMetrics: boolean
  setShowMetrics: (show: boolean) => void
  showDemoGallery: boolean
  setShowDemoGallery: (show: boolean) => void
  showVideoRecorder: boolean
  setShowVideoRecorder: (show: boolean) => void
  handleDemoImageSelect: (image: DemoImage) => void
  handleDemoAudioSelect: (audio: DemoAudio) => void
}) {
  const navigate = useNavigate()

  // Initialize keyboard shortcuts inside Router context
  useKeyboardShortcuts({
    onToggleTheme: toggleTheme,
    onClearResults: clearResults,
  })

  // Listen for demo navigation events
  useEffect(() => {
    const handleDemoNavigation = () => {
      navigate('/search')
    }

    window.addEventListener('navigate-to-search', handleDemoNavigation)

    return () => {
      window.removeEventListener('navigate-to-search', handleDemoNavigation)
    }
  }, [navigate])

  // Handle search replay functionality
  const handleReplaySearch = (item: SearchHistoryItem) => {
    console.log('Replaying search:', item)

    // Update search state with the replay context
    updateSearchState({
      isLoading: false,
      error: null,
      replayQuery: item.query,
      replayType: item.type,
      results: [] // Clear previous results
    })

    // Navigate to search page - the SearchPage will handle setting the right tab and query
    navigate('/search')
  }

  // Handle deleting a specific search history item
  const handleDeleteHistoryItem = (itemId: string) => {
    console.log('Deleting history item:', itemId)
    updateSearchState({
      searchHistory: searchState.searchHistory.filter(item => item.id !== itemId)
    })
  }

  // Handle clearing all search history
  const handleClearAllHistory = () => {
    console.log('Clearing all search history')
    if (confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
      updateSearchState({
        searchHistory: []
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 transition-colors duration-500"
    >
      <header className="border-b border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VectorBeats</h1>
                <span className="hidden sm:block text-sm text-purple-600 dark:text-purple-400">AI Music Discovery</span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <NavButton key={item.to} to={item.to} icon={item.icon} label={item.label} />
              ))}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShortcutsModal(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                title="Keyboard Shortcuts (Ctrl+Shift+H)"
              >
                <HelpCircle className="h-5 w-5" />
              </motion.button>

              <ThemeToggle />
            </nav>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <MobileMenu navItems={navItems}>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowShortcutsModal(true)}
                    leftIcon={<HelpCircle className="h-4 w-4" />}
                    fullWidth
                  >
                    Keyboard Shortcuts
                  </Button>
                </div>
              </MobileMenu>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <main className="container mx-auto px-4 py-8 min-h-screen">
          <Routes>
            <Route
              path="/"
              element={
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Home
                    searchState={searchState}
                    updateSearchState={updateSearchState}
                  />
                </motion.div>
              }
            />
            <Route
              path="/search"
              element={
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SearchPage
                    searchState={searchState}
                    updateSearchState={updateSearchState}
                  />
                </motion.div>
              }
            />
            <Route
              path="/history"
              element={
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SearchHistory
                    history={searchState.searchHistory}
                    onReplaySearch={handleReplaySearch}
                    onDeleteItem={handleDeleteHistoryItem}
                    onClearHistory={handleClearAllHistory}
                  />
                </motion.div>
              }
            />
            <Route
              path="/results"
              element={
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <MusicResults
                    results={searchState.results.map(result => ({
                      id: result.metadata.track_id || result.id,
                      title: result.metadata.title || 'Unknown Title',
                      artist: result.metadata.artist || 'Unknown Artist',
                      album: result.metadata.album,
                      genre: result.metadata.genre,
                      duration: result.metadata.duration,
                      preview_url: result.metadata.preview_url,
                      external_urls: { spotify: result.metadata.spotify_url },
                      similarity_score: result.score,
                      ranking_score: result.score
                    }))}
                    isLoading={searchState.isLoading}
                    searchQuery=""
                  />
                </motion.div>
              }
            />
          </Routes>
        </main>
      </AnimatePresence>

      <AnimatePresence>
        {searchState.isLoading && (
          <LoadingSpinner
            variant="music"
            message="Discovering your perfect tracks..."
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Demo Control Panel */}
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        className="fixed top-20 right-4 z-40 flex flex-col gap-2"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDemoMode(!demoMode)}
          className={`p-3 rounded-full backdrop-blur-sm transition-all ${demoMode
              ? 'bg-purple-500/80 text-white'
              : 'bg-gray-200/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-gray-700/80'
            }`}
          title="Toggle Demo Mode"
        >
          <Play className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMetrics(!showMetrics)}
          className={`p-3 rounded-full backdrop-blur-sm transition-all ${showMetrics
              ? 'bg-blue-500/80 text-white'
              : 'bg-gray-200/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-gray-700/80'
            }`}
          title="Performance Metrics"
        >
          <BarChart3 className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowVideoRecorder(!showVideoRecorder)}
          className={`p-3 rounded-full backdrop-blur-sm transition-all ${showVideoRecorder
              ? 'bg-red-500/80 text-white'
              : 'bg-gray-200/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-gray-700/80'
            }`}
          title="Video Recorder"
        >
          <Video className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Toast Container */}
      <ToastContainer />

      {/* Demo Components */}
      <DemoMode
        isActive={demoMode}
        onToggle={() => setDemoMode(!demoMode)}
        onScenarioComplete={(scenarioId) => {
          console.log('Demo scenario completed:', scenarioId)
        }}
      />

      <PerformanceDisplay
        isVisible={showMetrics}
        onToggle={() => setShowMetrics(!showMetrics)}
        realTimeUpdates={true}
      />

      <DemoVideoRecorder
        isVisible={showVideoRecorder}
        onToggle={() => setShowVideoRecorder(!showVideoRecorder)}
      />

      {/* Demo Gallery Modal */}
      <AnimatePresence>
        {showDemoGallery && (
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
              className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            >
              <DemoGallery
                onImageSelect={handleDemoImageSelect}
                onAudioSelect={handleDemoAudioSelect}
              />
              <div className="p-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={() => setShowDemoGallery(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close Gallery
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Enhanced Navigation Button Component
function NavButton({ to, icon: Icon, label }: { to: string, icon: any, label: string }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link
        to={to}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group"
      >
        <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
        <span className="hidden sm:block text-sm font-medium">{label}</span>
      </Link>
    </motion.div>
  )
}

// Enhanced Search Page Component
function SearchPage({
  searchState,
  updateSearchState
}: {
  searchState: SearchState
  updateSearchState: (updates: Partial<SearchState>) => void
}) {
  const [activeTab, setActiveTab] = useState<'image' | 'audio' | 'text'>('image')
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')

  // Handle replay context when component mounts or searchState changes
  useEffect(() => {
    if (searchState.replayQuery && searchState.replayType) {
      setActiveTab(searchState.replayType)
      setLastSearchQuery(searchState.replayQuery)

      // For text searches, automatically trigger the search
      if (searchState.replayType === 'text') {
        // Auto-trigger text search after a short delay to let the UI update
        setTimeout(() => {
          handleTextSearch(searchState.replayQuery!)
        }, 500)
      }

      // Clear the replay context after handling it
      setTimeout(() => {
        updateSearchState({
          replayQuery: undefined,
          replayType: undefined
        })
      }, 1000)
    }
  }, [searchState.replayQuery, searchState.replayType])

  // Handle demo results - switch to appropriate tab when demo results are loaded
  useEffect(() => {
    if (searchState.results.length > 0 && !searchState.isLoading) {
      const firstResult = searchState.results[0]
      if (firstResult.search_type === 'image') {
        setActiveTab('image')
        setLastSearchQuery('Image-based music discovery')
      } else if (firstResult.search_type === 'audio') {
        setActiveTab('audio')
        setLastSearchQuery('Audio similarity search')
      }
    }
  }, [searchState.results, searchState.isLoading])

  // Extract text search logic to a separate function for reuse
  const handleTextSearch = async (query: string) => {
    console.log('Text search:', query)
    setLastSearchQuery(query)

    updateSearchState({ isLoading: true })

    try {
      // Call the text search API
      const searchResponse = await fetch(`/api/search/music?query=${encodeURIComponent(query)}&limit=10`)

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`)
      }

      const searchResult = await searchResponse.json()

      if (searchResult.success && searchResult.data.results.length > 0) {
        // Convert results to the expected format
        const textResults = searchResult.data.results.map((track: any) => ({
          id: track.id || Math.random().toString(),
          score: track.similarity_score || 0.8,
          metadata: {
            title: track.name || track.title,
            artist: track.artists?.[0]?.name || track.artist,
            album: track.album?.name || track.album,
            genre: track.genre,
            duration: track.duration_ms,
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify,
            track_id: track.id
          },
          search_type: 'text'
        }))

        // Add to search history
        const historyItem = {
          id: Date.now().toString(),
          type: 'text' as const,
          query: query,
          timestamp: new Date().toISOString(),
          results_count: textResults.length
        }

        updateSearchState({
          results: textResults,
          isLoading: false,
          searchHistory: [historyItem, ...searchState.searchHistory],
          processingTime: searchResult.data.processing_time
        })
      } else {
        throw new Error('No results found')
      }
    } catch (error) {
      console.error('Text search error:', error)
      updateSearchState({
        isLoading: false,
        results: [],
        error: error instanceof Error ? error.message : 'Search failed'
      })
    }
  }

  const getSearchQueryDisplay = () => {
    // If we have recent search results, show appropriate query
    if (searchState.results.length > 0) {
      const firstResult = searchState.results[0]
      if (firstResult.search_type === 'image') {
        return lastSearchQuery || 'Image-based music discovery'
      } else if (firstResult.search_type === 'audio') {
        return lastSearchQuery || 'Audio similarity search'
      } else if (firstResult.search_type === 'text') {
        return lastSearchQuery || 'Text-based music search'
      }
    }
    return lastSearchQuery || 'Music discovery'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          What's Your
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {" "}Musical Vibe
          </span>
          ?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Choose your preferred method to discover music
        </p>

        {/* Replay Indicator */}
        {searchState.replayQuery && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
          >
            <History className="h-4 w-4" />
            Replaying search: "{searchState.replayQuery}"
          </motion.div>
        )}

        {/* Demo Results Indicator */}
        {searchState.results.length > 0 && !searchState.replayQuery && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium"
          >
            <Music className="h-4 w-4" />
            {searchState.results.length} {searchState.results.length === 1 ? 'track' : 'tracks'} found
          </motion.div>
        )}
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass" className="p-1">
          <div className="flex">
            <TabButton
              active={activeTab === 'image'}
              onClick={() => setActiveTab('image')}
              label="Image Upload"
            />
            <TabButton
              active={activeTab === 'audio'}
              onClick={() => setActiveTab('audio')}
              label="Audio Recording"
            />
            <TabButton
              active={activeTab === 'text'}
              onClick={() => setActiveTab('text')}
              label="Text Search"
            />
          </div>
        </Card>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        className="min-h-[400px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Replay Indicator for Image Search */}
              {searchState.replayQuery && searchState.replayType === 'image' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <History className="h-5 w-5" />
                    <span className="font-medium">Replaying Image Search:</span>
                  </div>
                  <p className="text-purple-600 dark:text-purple-400 mt-1">
                    "{searchState.replayQuery}" - Upload a new image to search with similar characteristics
                  </p>
                </motion.div>
              )}

              <ImageUpload
                onUpload={(file, results, searchQuery) => {
                  console.log('Image uploaded:', file)
                  console.log('Search results:', results)
                  console.log('Search query:', searchQuery)

                  // Store the actual search query
                  if (searchQuery) {
                    setLastSearchQuery(searchQuery)
                  }

                  // Update search state with results
                  updateSearchState({
                    results: results.map((track: any) => ({
                      id: track.id || Math.random().toString(),
                      score: track.similarity_score || 0.8,
                      metadata: {
                        title: track.name || track.title,
                        artist: track.artists?.[0]?.name || track.artist,
                        album: track.album?.name || track.album,
                        genre: track.genre,
                        duration: track.duration_ms,
                        preview_url: track.preview_url,
                        spotify_url: track.external_urls?.spotify,
                        track_id: track.id
                      },
                      search_type: 'image'
                    })),
                    isLoading: false,
                    error: null
                  })

                  // Add to search history
                  const historyItem = {
                    id: Date.now().toString(),
                    type: 'image' as const,
                    query: searchQuery || file.name,
                    timestamp: new Date().toISOString(),
                    results_count: results.length,
                    thumbnail: URL.createObjectURL(file)
                  }

                  updateSearchState({
                    searchHistory: [historyItem, ...searchState.searchHistory]
                  })
                }}
                isLoading={searchState.isLoading}
                onLoadingChange={(loading) => {
                  updateSearchState({ isLoading: loading })
                }}
              />
            </motion.div>
          )}

          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Replay Indicator for Audio Search */}
              {searchState.replayQuery && searchState.replayType === 'audio' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <History className="h-5 w-5" />
                    <span className="font-medium">Replaying Audio Search:</span>
                  </div>
                  <p className="text-purple-600 dark:text-purple-400 mt-1">
                    "{searchState.replayQuery}" - Record new audio to find similar music
                  </p>
                </motion.div>
              )}

              <AudioUpload
                onRecord={async (audioBlob, embeddings, metadata) => {
                  console.log('Audio recorded:', { audioBlob, embeddings, metadata })

                  updateSearchState({ isLoading: true })

                  try {
                    // Create FormData to upload audio
                    const formData = new FormData()
                    // Use WAV format for better ML service compatibility
                    const audioFile = new File([audioBlob], 'recording.wav', {
                      type: 'audio/wav'
                    })
                    formData.append('audio', audioFile)

                    console.log('Uploading audio:', {
                      size: audioBlob.size,
                      type: audioFile.type,
                      fileName: 'recording.wav'
                    })

                    // Upload audio and get analysis
                    const uploadResponse = await fetch('/api/audio/hum', {
                      method: 'POST',
                      body: formData
                    })

                    console.log('Upload response status:', uploadResponse.status)

                    if (!uploadResponse.ok) {
                      const errorText = await uploadResponse.text()
                      console.error('Upload error response:', errorText)
                      throw new Error(`Failed to process audio: ${uploadResponse.status} - ${errorText}`)
                    }

                    const uploadResult = await uploadResponse.json()

                    if (uploadResult.success && uploadResult.data.analysis.matches) {
                      // Convert matches to results format
                      const audioResults = uploadResult.data.analysis.matches.map((match: any) => ({
                        id: match.id || Math.random().toString(),
                        title: match.title || 'Unknown Title',
                        artist: match.artist || 'Unknown Artist',
                        album: match.album,
                        genre: match.genre,
                        duration: match.duration,
                        preview_url: match.preview_url,
                        external_urls: match.external_urls,
                        similarity_score: match.confidence || match.similarity_score,
                        metadata: {
                          track_id: match.id,
                          title: match.title,
                          artist: match.artist,
                          album: match.album,
                          genre: match.genre,
                          duration: match.duration,
                          preview_url: match.preview_url,
                          spotify_url: match.external_urls?.spotify,
                          search_type: 'audio'
                        }
                      }))

                      updateSearchState({
                        results: audioResults,
                        isLoading: false,
                        processingTime: uploadResult.data.analysis.processing_time
                      })

                      setLastSearchQuery('Audio-based music discovery')
                    } else {
                      throw new Error('No matches found')
                    }
                  } catch (error) {
                    console.error('Audio search error:', error)
                    updateSearchState({
                      isLoading: false,
                      results: []
                    })
                  }
                }}
                isLoading={searchState.isLoading}
              />
            </motion.div>
          )}

          {activeTab === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <TextSearch
                initialQuery={searchState.replayQuery || lastSearchQuery}
                onSearch={handleTextSearch}
                isLoading={searchState.isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results Display */}
      <AnimatePresence>
        {searchState.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MusicResults
              results={searchState.results.map(result => ({
                id: result.metadata.track_id || result.id,
                title: result.metadata.title || 'Unknown Title',
                artist: result.metadata.artist || 'Unknown Artist',
                album: result.metadata.album,
                genre: result.metadata.genre,
                duration: result.metadata.duration,
                preview_url: result.metadata.preview_url,
                external_urls: { spotify: result.metadata.spotify_url },
                similarity_score: result.score,
                ranking_score: result.score
              }))}
              isLoading={searchState.isLoading}
              searchQuery={getSearchQueryDisplay()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Enhanced Tab Button Component
function TabButton({
  active,
  onClick,
  label
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${active
          ? 'text-white'
          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  )
}

// Enhanced Text Search Component
function TextSearch({
  onSearch,
  isLoading,
  initialQuery = ''
}: {
  onSearch: (query: string) => void
  isLoading: boolean
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)

  // Update query when initialQuery changes (for replay functionality)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <Card variant="glass" className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your mood or music preference..."
            className="w-full px-4 py-3 bg-white/10 dark:bg-black/10 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
          disabled={!query.trim()}
          className="font-semibold"
        >
          {isLoading ? 'Searching...' : 'Search Music'}
        </Button>
      </form>
    </Card>
  )
}

// Main App Component with Theme Provider
function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
