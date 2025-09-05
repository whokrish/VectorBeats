import React from 'react';

interface SearchHistoryItem {
  id: string;
  type: 'image' | 'audio' | 'text';
  query: string;
  timestamp: string;
  results_count: number;
  thumbnail?: string;
}

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onReplaySearch: (item: SearchHistoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onClearHistory: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onReplaySearch, onDeleteItem, onClearHistory }) => {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'audio': return '🎤';
      case 'text': return '📝';
      default: return '🔍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Image Search';
      case 'audio': return 'Audio Search';
      case 'text': return 'Text Search';
      default: return 'Search';
    }
  };

  if (history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="text-6xl mb-6">📜</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">No Search History</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
            Start discovering music to see your search history here
          </p>
          <a 
            href="/search"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
          >
            Start Searching
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          Search History
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Your recent music discoveries
        </p>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xl">
                  {getTypeIcon(item.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-400 text-sm font-medium">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">•</span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                  
                  <h3 className="text-gray-900 dark:text-white font-medium truncate mb-1">
                    {item.query}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {item.results_count} results found
                  </p>
                </div>

                {item.thumbnail && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={item.thumbnail} 
                      alt="Search thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {/* <button
                  onClick={() => onReplaySearch(item)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Replay
                </button> */}
                
                <button 
                  onClick={() => onDeleteItem(item.id)}
                  className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  title="Delete this search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clear History Button */}
      <div className="text-center pt-8">
        <button 
          onClick={onClearHistory}
          className="text-red-400 hover:text-red-300 text-sm font-medium hover:underline transition-colors"
        >
          Clear All History
        </button>
      </div>
    </div>
  );
};

export default SearchHistory;
