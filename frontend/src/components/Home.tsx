import { useState } from 'react'
import { Image, Mic, Type, ArrowRight, Sparkles } from 'lucide-react'
import { SearchState } from '../App'

interface HomeProps {
  searchState: SearchState
  updateSearchState: (updates: Partial<SearchState>) => void
}

export default function Home({ searchState, updateSearchState }: HomeProps) {
  // Suppress unused parameter warning - updateSearchState is passed for potential future use
  void updateSearchState;
  const [selectedMode, setSelectedMode] = useState<'image' | 'audio' | 'text' | null>(null)

  const features = [
    {
      id: 'image',
      icon: Image,
      title: 'Image Search',
      description: 'Upload any image and discover music that matches its mood and aesthetic.',
      color: 'from-blue-500 to-cyan-500',
      example: 'Upload a sunset photo → Get chill, relaxing music'
    },
    {
      id: 'audio',
      icon: Mic,
      title: 'Audio Matching',
      description: 'Hum or record a melody to find similar songs and discover new artists.',
      color: 'from-green-500 to-emerald-500',
      example: 'Hum a tune → Find the original song or similar tracks'
    },
    {
      id: 'text',
      icon: Type,
      title: 'Mood Discovery',
      description: 'Describe your mood or feelings to get personalized music recommendations.',
      color: 'from-purple-500 to-pink-500',
      example: 'Type "energetic workout" → Get high-energy tracks'
    }
  ]

  const stats = [
    { label: 'Songs Analyzed', value: '1M+' },
    { label: 'Image Searches', value: '50K+' },
    { label: 'Audio Matches', value: '25K+' },
    { label: 'Happy Users', value: '10K+' }
  ]

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
         
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Discover Music Through
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">
              Images & Sounds
            </span>
          </h1>
          
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Upload an image, hum a tune, or describe a mood. Our AI-powered platform 
            uses advanced vector search to find the perfect music that matches your vibe.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="/search"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2 justify-center"
          >
            Start Discovering
            <ArrowRight className="h-5 w-5" />
          </a>
{/*           
          <button className="border border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/50 text-gray-700 dark:text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-white/10">
            Watch Demo
          </button> */}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {features.map((feature) => {
          const Icon = feature.icon
          const isSelected = selectedMode === feature.id
          
          return (
            <div
              key={feature.id}
              className={`group transition-all duration-300 ${
                isSelected ? 'scale-105' : 'hover:scale-102'
              }`}
            >
              <div className={`bg-white/10 dark:bg-white/10 backdrop-blur-sm rounded-xl p-8 border transition-all duration-300 ${
                isSelected 
                  ? 'border-purple-400 bg-white/20 dark:bg-white/20' 
                  : 'border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/40'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`bg-gradient-to-r ${feature.color} rounded-lg p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                
                {isSelected && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-black/20 dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                      <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Example:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{feature.example}</p>
                    </div>
                    
                    <a
                      href={`/search?mode=${feature.id}`}
                      className={`block w-full bg-gradient-to-r ${feature.color} hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-center`}
                    >
                      Try {feature.title}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* How It Works */}
      <div className="text-center space-y-8">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">How It Works</h3>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              step: '1',
              title: 'Upload or Record',
              description: 'Share an image, record audio, or describe your mood'
            },
            {
              step: '2',
              title: 'AI Analysis',
              description: 'Our AI extracts features and finds musical connections'
            },
            {
              step: '3',
              title: 'Discover Music',
              description: 'Get personalized recommendations with similarity scores'
            }
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {step.step}
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{step.title}</h4>
              <p className="text-gray-600 dark:text-gray-300 text-center">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {searchState.searchHistory.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Recent Searches</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {searchState.searchHistory.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-white/10 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/40 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    {item.type === 'image' && <Image className="h-4 w-4 text-white" />}
                    {item.type === 'audio' && <Mic className="h-4 w-4 text-white" />}
                    {item.type === 'text' && <Type className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{item.query}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">{item.results_count} results</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
