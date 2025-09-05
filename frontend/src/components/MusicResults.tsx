import { useState, useEffect, useRef } from 'react'
import { Play, Pause, ExternalLink, Star, TrendingUp, Clock, BarChart3, Heart, Share2 } from 'lucide-react'

interface AudioFeatures {
  tempo?: number;
  key?: string;
  mode?: string;
  time_signature?: number;
  loudness?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  speechiness?: number;
}

interface MusicResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: number;
  preview_url?: string;
  external_urls?: {
    spotify?: string;
  };
  similarity_score?: number;
  audio_features?: AudioFeatures;
  mood_tags?: string[];
  genre_tags?: string[];
  popularity?: number;
  release_date?: string;
  ranking_score?: number;
}

interface SearchMetadata {
  search_type: string;
  filters_applied?: any;
  ranking_method?: string;
  vector_similarity?: boolean;
  total_matches?: number;
}

interface MusicResultsProps {
  results: MusicResult[]
  isLoading: boolean
  searchQuery: string
  processingTime?: number
  searchMetadata?: SearchMetadata
}

export default function MusicResults({ 
  results, 
  isLoading, 
  searchQuery, 
  processingTime, 
  searchMetadata 
}: MusicResultsProps) {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Debug logging to see what data we're receiving
  console.log('MusicResults received:', {
    resultsCount: results.length,
    sampleResult: results[0],
    searchQuery,
    searchMetadata
  })

  // Scroll to results when they're loaded
  useEffect(() => {
    if (results.length > 0) {
      // Add a small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [results.length, searchQuery])  // Also trigger on searchQuery change

  const handlePlayPause = (track: MusicResult) => {
    if (!track.preview_url) return

    if (playingTrack === track.id) {
      // Pause current track
      if (currentAudio) {
        currentAudio.pause()
        setPlayingTrack(null)
      }
    } else {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause()
      }

      // Play new track
      const audio = new Audio(track.preview_url)
      audio.play()
      setCurrentAudio(audio)
      setPlayingTrack(track.id)

      // Handle audio end
      audio.addEventListener('ended', () => {
        setPlayingTrack(null)
        setCurrentAudio(null)
      })
    }
  }

  const handleShare = async (track: MusicResult) => {
    const spotifyUrl = track.external_urls?.spotify || `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`
    const shareData = {
      title: `${track.title} by ${track.artist}`,
      text: spotifyUrl,
      url: spotifyUrl
    }

    // Try native Web Share API first
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        console.log('Native share cancelled or failed:', error)
      }
    }

    // Fallback to clipboard
    try {
      const shareText = spotifyUrl || 'Discovered on VectorBeats'
      await navigator.clipboard.writeText(shareText)
      
      // Show feedback
      setCopiedTrack(track.id)
      setTimeout(() => setCopiedTrack(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Final fallback - open share dialog for popular platforms
      const encodedText = encodeURIComponent(shareData.text)
      const encodedUrl = encodeURIComponent(shareData.url)
      
      // Create a simple share modal or use a service
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getFeatureBar = (value: number, label: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-gray-700 dark:text-gray-300">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
        <p className="text-gray-300">Searching for music...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl">🎵</div>
        <h3 className="text-xl font-semibold text-white">No music found</h3>
        <p className="text-gray-400">Try adjusting your search query or filters</p>
      </div>
    )
  }

  return (
    <div ref={resultsRef} className="space-y-6">
      {/* Search Results Header */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Found {results.length} tracks
              {searchMetadata?.total_matches && searchMetadata.total_matches > results.length && (
                <span className="text-gray-400 text-sm ml-2">
                  (showing top {results.length} of {searchMetadata.total_matches})
                </span>
              )}
            </h2>
            <p className="text-gray-400">
              Search: "{searchQuery}"
              {processingTime && (
                <span className="ml-2">• {processingTime}ms</span>
              )}
            </p>
          </div>
          
          {searchMetadata && (
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                {searchMetadata.search_type}
              </span>
              {searchMetadata.vector_similarity && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  Vector Search
                </span>
              )}
              {searchMetadata.ranking_method && (
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  {searchMetadata.ranking_method}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {results.map((track, index) => (
          <div 
            key={track.id} 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {track.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 truncate">
                      by {track.artist}
                      {track.album && <span className="text-gray-600 dark:text-gray-400"> • {track.album}</span>}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {track.genre && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                          {track.genre}
                        </span>
                      )}
                      {track.mood_tags?.slice(0, 3).map(mood => (
                        <span key={mood} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                          {mood}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex-shrink-0 text-right space-y-1">
                    {track.similarity_score && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className={`font-bold ${getScoreColor(track.similarity_score)}`}>
                          {Math.round(track.similarity_score * 100)}%
                        </span>
                      </div>
                    )}
                    {track.popularity && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">
                          {track.popularity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {track.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(track.duration)}
                    </div>
                  )}
                  {track.audio_features?.tempo && (
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {Math.round(track.audio_features.tempo)} BPM
                    </div>
                  )}
                  {track.audio_features?.energy && (
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {Math.round(track.audio_features.energy * 100)}% Energy
                    </div>
                  )}
                  {track.release_date && (
                    <span>{new Date(track.release_date).getFullYear()}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {track.preview_url && (
                    <button
                      onClick={() => handlePlayPause(track)}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                    >
                      {playingTrack === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {playingTrack === track.id ? 'Pause' : 'Preview'}
                    </button>
                  )}

                  {/* Always show Spotify button - if no direct link, search for the track */}
                  <button
                    onClick={() => {
                      const spotifyUrl = track.external_urls?.spotify;
                      if (spotifyUrl) {
                        window.open(spotifyUrl, '_blank')
                      } else {
                        // Search for the track on Spotify as fallback
                        const searchQuery = encodeURIComponent(`${track.title} ${track.artist}`)
                        window.open(`https://open.spotify.com/search/${searchQuery}`, '_blank')
                      }
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
                    title={track.external_urls?.spotify ? 'Open on Spotify' : 'Search on Spotify'}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Spotify
                  </button>

                  <button
                    onClick={() => setShowDetails(showDetails === track.id ? null : track.id)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Details
                  </button>

                  <button 
                    onClick={() => handleShare(track)}
                    className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all duration-200 ${
                      copiedTrack === track.id 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title="Share this track"
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedTrack === track.id ? 'Copied!' : 'Share'}
                  </button>
                </div>

                {/* Detailed Track Information */}
                {showDetails === track.id && (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10">
                    <h4 className="text-gray-900 dark:text-white font-semibold mb-3">Track Details</h4>
                    
                    {/* Basic Track Information */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-400">Title:</span>
                        <span className="text-white ml-2 block font-medium">{track.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Artist:</span>
                        <span className="text-white ml-2 block font-medium">{track.artist}</span>
                      </div>
                      {track.album && (
                        <div>
                          <span className="text-gray-400">Album:</span>
                          <span className="text-white ml-2 block font-medium">{track.album}</span>
                        </div>
                      )}
                      {track.genre && (
                        <div>
                          <span className="text-gray-400">Genre:</span>
                          <span className="text-white ml-2 block font-medium">{track.genre}</span>
                        </div>
                      )}
                      {track.duration && (
                        <div>
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-white ml-2 block font-medium">{formatDuration(track.duration)}</span>
                        </div>
                      )}
                      {track.popularity && (
                        <div>
                          <span className="text-gray-400">Popularity:</span>
                          <span className="text-white ml-2 block font-medium">{track.popularity}/100</span>
                        </div>
                      )}
                    </div>

                    {/* Audio Features (if available) */}
                    {track.audio_features && (
                      <>
                        <h5 className="text-gray-900 dark:text-white font-medium mb-3 pt-2 border-t border-gray-300 dark:border-white/20">Audio Features</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {track.audio_features.energy !== undefined && getFeatureBar(track.audio_features.energy, 'Energy')}
                          {track.audio_features.danceability !== undefined && getFeatureBar(track.audio_features.danceability, 'Danceability')}
                          {track.audio_features.valence !== undefined && getFeatureBar(track.audio_features.valence, 'Positivity')}
                          {track.audio_features.acousticness !== undefined && getFeatureBar(track.audio_features.acousticness, 'Acoustic')}
                          {track.audio_features.instrumentalness !== undefined && getFeatureBar(track.audio_features.instrumentalness, 'Instrumental')}
                          {track.audio_features.liveness !== undefined && getFeatureBar(track.audio_features.liveness, 'Live')}
                          {track.audio_features.speechiness !== undefined && getFeatureBar(track.audio_features.speechiness, 'Speech')}
                        </div>
                        
                        {/* Technical Details */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {track.audio_features.key && (
                            <div>
                              <span className="text-gray-400">Key:</span>
                              <span className="text-white ml-2">{track.audio_features.key}</span>
                            </div>
                          )}
                          {track.audio_features.tempo && (
                            <div>
                              <span className="text-gray-400">Tempo:</span>
                              <span className="text-white ml-2">{Math.round(track.audio_features.tempo)} BPM</span>
                            </div>
                          )}
                          {track.audio_features.time_signature && (
                            <div>
                              <span className="text-gray-400">Time Sig:</span>
                              <span className="text-white ml-2">{track.audio_features.time_signature}/4</span>
                            </div>
                          )}
                          {track.audio_features.loudness && (
                            <div>
                              <span className="text-gray-400">Loudness:</span>
                              <span className="text-white ml-2">{Math.round(track.audio_features.loudness)} dB</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Similarity Score and Search Info */}
                    {(track.similarity_score || track.ranking_score) && (
                      <div className="mt-4 pt-2 border-t border-gray-300 dark:border-white/20">
                        <h5 className="text-gray-900 dark:text-white font-medium mb-2">Match Information</h5>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {track.similarity_score && (
                            <div>
                              <span className="text-gray-400">Similarity:</span>
                              <span className={`ml-2 font-bold ${getScoreColor(track.similarity_score)}`}>
                                {Math.round(track.similarity_score * 100)}%
                              </span>
                            </div>
                          )}
                          {track.ranking_score && track.ranking_score !== track.similarity_score && (
                            <div>
                              <span className="text-gray-400">Ranking:</span>
                              <span className="text-white ml-2">{Math.round(track.ranking_score * 100)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-4 pt-2 border-t border-gray-300 dark:border-white/20 flex flex-wrap gap-2">
                      {track.external_urls?.spotify && (
                        <a
                          href={track.external_urls.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full transition-colors"
                        >
                          Open in Spotify
                        </a>
                      )}
                      <button
                        onClick={() => handleShare(track)}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-full transition-colors"
                      >
                        Share Track
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
