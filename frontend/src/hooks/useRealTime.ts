import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SearchProgress {
  sessionId: string;
  stage: string;
  progress: number;
  timestamp: number;
}

export interface SearchResults {
  results: any[];
  source?: string;
  partial?: boolean;
  final?: boolean;
  preview?: boolean;
}

export interface RealTimeUpdate {
  type: 'search_progress' | 'search_results' | 'similarity_update' | 'suggestion' | 'feedback' | 'search_error';
  sessionId: string;
  data: any;
  timestamp: number;
}

export interface LiveSuggestions {
  suggestions: string[];
  query: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
}

export interface UseRealTimeProps {
  serverUrl?: string;
  userId?: string;
  autoConnect?: boolean;
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

export const useRealTime = ({ 
  serverUrl = 'http://localhost:4000', 
  userId,
  autoConnect = true 
}: UseRealTimeProps = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false
  });
  
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<LiveSuggestions | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to socket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionStatus(prev => ({ ...prev, connecting: true, error: undefined }));

    const newSocket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time service');
      setConnectionStatus({ connected: true, connecting: false });
      reconnectAttempts.current = 0;

      // Register user
      newSocket.emit('user:connect', {
        userId: userId || `anonymous_${Date.now()}`,
        timestamp: Date.now()
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from real-time service:', reason);
      setConnectionStatus({ connected: false, connecting: false });
      setSearchProgress(null);
      setCurrentSessionId(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      reconnectAttempts.current++;
      
      setConnectionStatus({ 
        connected: false, 
        connecting: reconnectAttempts.current < maxReconnectAttempts,
        error: error.message 
      });
    });

    // Real-time event handlers
    newSocket.on('welcome', (data) => {
      console.log('👋 Welcome message:', data);
    });

    newSocket.on('search:session_started', (data) => {
      setCurrentSessionId(data.sessionId);
      setSearchProgress(null);
      setSearchResults(null);
    });

    newSocket.on('search:progress', (data: SearchProgress) => {
      setSearchProgress(data);
    });

    newSocket.on('search:typing', (data) => {
      console.log('⌨️ User typing:', data);
    });

    newSocket.on('realtime:update', (update: RealTimeUpdate) => {
      switch (update.type) {
        case 'search_results':
          setSearchResults(update.data);
          break;
        case 'suggestion':
          setLiveSuggestions(update.data);
          break;
        case 'similarity_update':
          setSearchResults(prev => ({
            ...prev,
            results: update.data.results,
            reranked: true
          }));
          break;
        case 'search_error':
          console.error('Search error:', update.data);
          break;
      }
    });

    newSocket.on('suggestions:personalized', (data) => {
      console.log('🎯 Personalized suggestions:', data);
    });

    newSocket.on('track:playing', (data) => {
      console.log('🎵 Track playing:', data);
    });

    newSocket.on('track:similar', (data) => {
      console.log('🔄 Similar tracks:', data);
    });

    newSocket.on('user:joined', (data) => {
      console.log('👋 User joined session:', data);
    });

    newSocket.on('user:left', (data) => {
      console.log('👋 User left session:', data);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [serverUrl, userId]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnectionStatus({ connected: false, connecting: false });
      setSearchProgress(null);
      setSearchResults(null);
      setCurrentSessionId(null);
    }
  }, []);

  // Start a new search session
  const startSearch = useCallback((searchData: {
    query?: string;
    type: 'text' | 'image' | 'audio' | 'multimodal';
    image?: File;
    audio?: File;
    progressive?: boolean;
  }) => {
    if (!socketRef.current?.connected) {
      console.warn('Cannot start search: not connected');
      return;
    }

    socketRef.current.emit('search:start', {
      ...searchData,
      timestamp: Date.now()
    });
  }, []);

  // Send live search input
  const sendSearchInput = useCallback((query: string) => {
    if (!socketRef.current?.connected || !currentSessionId) return;

    socketRef.current.emit('search:input', {
      query,
      sessionId: currentSessionId,
      timestamp: Date.now()
    });
  }, [currentSessionId]);

  // Send search feedback
  const sendFeedback = useCallback((trackId: string, action: 'like' | 'dislike') => {
    if (!socketRef.current?.connected || !currentSessionId) return;

    socketRef.current.emit('search:feedback', {
      trackId,
      action,
      sessionId: currentSessionId,
      timestamp: Date.now()
    });
  }, [currentSessionId]);

  // Track interaction events
  const playTrack = useCallback((trackId: string, trackData?: any) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('track:play', {
      trackId,
      ...trackData,
      timestamp: Date.now()
    });
  }, []);

  const likeTrack = useCallback((trackId: string, trackData?: any) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('track:like', {
      trackId,
      ...trackData,
      timestamp: Date.now()
    });
  }, []);

  // Session collaboration
  const joinSession = useCallback((sessionId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('session:join', sessionId);
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('session:leave', sessionId);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Debounced search input
  const debouncedSearchInput = useCallback(
    debounce((query: string) => sendSearchInput(query), 300),
    [sendSearchInput]
  );

  return {
    // Connection
    socket,
    connectionStatus,
    connect,
    disconnect,
    
    // Search
    currentSessionId,
    searchProgress,
    searchResults,
    liveSuggestions,
    startSearch,
    sendSearchInput,
    debouncedSearchInput,
    sendFeedback,
    
    // Track interactions
    playTrack,
    likeTrack,
    
    // Collaboration
    joinSession,
    leaveSession,
    
    // Status
    isConnected: connectionStatus.connected,
    isConnecting: connectionStatus.connecting
  };
};
