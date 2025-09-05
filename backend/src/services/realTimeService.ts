import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { MusicResult } from '../types';

interface ConnectedUser {
  id: string;
  socketId: string;
  sessionId?: string;
  lastActivity: number;
  preferences?: {
    genres: string[];
    moods: string[];
  };
}

interface SearchSession {
  id: string;
  userId: string;
  query: string;
  searchType: 'text' | 'image' | 'audio' | 'multimodal';
  startTime: number;
  results?: MusicResult[];
  feedback?: {
    liked: string[];
    disliked: string[];
  };
}

interface RealTimeUpdate {
  type: 'search_progress' | 'search_results' | 'similarity_update' | 'suggestion' | 'feedback' | 'search_error';
  sessionId: string;
  data: any;
  timestamp: number;
}

export class RealTimeService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private activeSessions: Map<string, SearchSession> = new Map();
  private searchQueue: Map<string, any> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    this.startCleanupTask();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user connection
      socket.on('user:connect', (userData) => {
        this.handleUserConnect(socket.id, userData);
      });

      // Handle search initiation
      socket.on('search:start', (searchData) => {
        this.handleSearchStart(socket.id, searchData);
      });

      // Handle real-time search input
      socket.on('search:input', (inputData) => {
        this.handleSearchInput(socket.id, inputData);
      });

      // Handle search feedback
      socket.on('search:feedback', (feedbackData) => {
        this.handleSearchFeedback(socket.id, feedbackData);
      });

      // Handle track interaction
      socket.on('track:play', (trackData) => {
        this.handleTrackPlay(socket.id, trackData);
      });

      socket.on('track:like', (trackData) => {
        this.handleTrackLike(socket.id, trackData);
      });

      // Handle collaboration
      socket.on('session:join', (sessionId) => {
        this.handleSessionJoin(socket.id, sessionId);
      });

      socket.on('session:leave', (sessionId) => {
        this.handleSessionLeave(socket.id, sessionId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket.id);
      });

      // Send welcome message with suggestions
      this.sendWelcomeMessage(socket.id);
    });
  }

  // User connection management
  private handleUserConnect(socketId: string, userData: any): void {
    const user: ConnectedUser = {
      id: userData.userId || `anonymous_${Date.now()}`,
      socketId,
      sessionId: userData.sessionId,
      lastActivity: Date.now(),
      preferences: userData.preferences
    };

    this.connectedUsers.set(socketId, user);
    
    // Send personalized suggestions
    this.sendPersonalizedSuggestions(socketId, user);
    
    console.log(`👤 User registered: ${user.id}`);
  }

  // Search session management
  private handleSearchStart(socketId: string, searchData: any): void {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: SearchSession = {
      id: sessionId,
      userId: user.id,
      query: searchData.query || '',
      searchType: searchData.type || 'text',
      startTime: Date.now(),
      feedback: { liked: [], disliked: [] }
    };

    this.activeSessions.set(sessionId, session);
    user.sessionId = sessionId;

    // Emit session started
    this.io.to(socketId).emit('search:session_started', {
      sessionId,
      timestamp: Date.now()
    });

    // Start progressive search if applicable
    if (searchData.progressive) {
      this.startProgressiveSearch(sessionId, searchData);
    }

    console.log(`🔍 Search session started: ${sessionId}`);
  }

  // Real-time search input processing
  private handleSearchInput(socketId: string, inputData: any): void {
    const user = this.connectedUsers.get(socketId);
    if (!user?.sessionId) return;

    const session = this.activeSessions.get(user.sessionId);
    if (!session) return;

    // Update session with new input
    session.query = inputData.query || session.query;
    
    // Debounced search - cancel previous search if typing
    if (this.searchQueue.has(user.sessionId)) {
      clearTimeout(this.searchQueue.get(user.sessionId));
    }

    // Emit typing indicator
    this.io.to(socketId).emit('search:typing', {
      sessionId: user.sessionId,
      query: inputData.query,
      timestamp: Date.now()
    });

    // Set new search timeout
    const timeoutId = setTimeout(() => {
      this.performLiveSearch(user.sessionId!, inputData);
    }, 500); // 500ms debounce

    this.searchQueue.set(user.sessionId, timeoutId);
  }

  // Progressive search with real-time updates
  private async startProgressiveSearch(sessionId: string, searchData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Emit search progress
      this.emitSearchProgress(sessionId, 'initializing', 0);

      // Stage 1: Text matching (fast)
      if (searchData.text) {
        this.emitSearchProgress(sessionId, 'text_search', 20);
        const textResults = await this.performTextSearch(searchData.text);
        this.emitPartialResults(sessionId, textResults, 'text');
      }

      // Stage 2: Image processing (medium)
      if (searchData.image) {
        this.emitSearchProgress(sessionId, 'image_processing', 50);
        const imageResults = await this.performImageSearch(searchData.image);
        this.emitPartialResults(sessionId, imageResults, 'image');
      }

      // Stage 3: Audio processing (slower)
      if (searchData.audio) {
        this.emitSearchProgress(sessionId, 'audio_processing', 70);
        const audioResults = await this.performAudioSearch(searchData.audio);
        this.emitPartialResults(sessionId, audioResults, 'audio');
      }

      // Stage 4: Vector similarity and ranking
      this.emitSearchProgress(sessionId, 'ranking', 90);
      const finalResults = await this.performFinalRanking(sessionId);
      
      // Emit final results
      this.emitSearchProgress(sessionId, 'completed', 100);
      this.emitFinalResults(sessionId, finalResults);

    } catch (error) {
      console.error('Progressive search error:', error);
      this.emitSearchError(sessionId, error);
    }
  }

  // Live search with instant feedback
  private async performLiveSearch(sessionId: string, inputData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Get suggestions based on current input
      const suggestions = await this.generateLiveSuggestions(inputData.query);
      
      // Emit live suggestions
      this.emitUpdate(sessionId, {
        type: 'suggestion',
        sessionId,
        data: { suggestions, query: inputData.query },
        timestamp: Date.now()
      });

      // Perform quick search for preview
      if (inputData.query.length >= 3) {
        const previewResults = await this.performQuickSearch(inputData.query);
        this.emitUpdate(sessionId, {
          type: 'search_results',
          sessionId,
          data: { results: previewResults, preview: true },
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Live search error:', error);
    }
  }

  // Search feedback handling
  private handleSearchFeedback(socketId: string, feedbackData: any): void {
    const user = this.connectedUsers.get(socketId);
    if (!user?.sessionId) return;

    const session = this.activeSessions.get(user.sessionId);
    if (!session) return;

    // Update session feedback
    if (feedbackData.action === 'like') {
      session.feedback!.liked.push(feedbackData.trackId);
    } else if (feedbackData.action === 'dislike') {
      session.feedback!.disliked.push(feedbackData.trackId);
    }

    // Real-time re-ranking based on feedback
    this.reRankResultsBasedOnFeedback(user.sessionId, feedbackData);
    
    console.log(`👍 Feedback received: ${feedbackData.action} for ${feedbackData.trackId}`);
  }

  // Track interaction handling
  private handleTrackPlay(socketId: string, trackData: any): void {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;

    // Emit to other users in the same session (for collaboration)
    if (user.sessionId) {
      this.io.to(`session_${user.sessionId}`).emit('track:playing', {
        trackId: trackData.trackId,
        userId: user.id,
        timestamp: Date.now()
      });
    }

    // Generate real-time similar tracks
    this.generateSimilarTracks(socketId, trackData.trackId);
  }

  private handleTrackLike(socketId: string, trackData: any): void {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;

    // Update user preferences in real-time
    this.updateUserPreferences(user, trackData);

    // Send updated recommendations
    this.sendPersonalizedSuggestions(socketId, user);
  }

  // Collaboration features
  private handleSessionJoin(socketId: string, sessionId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;

    // Join socket room for collaboration
    this.io.sockets.sockets.get(socketId)?.join(`session_${sessionId}`);
    
    // Update user session
    user.sessionId = sessionId;

    // Notify other users in the session
    this.io.to(`session_${sessionId}`).emit('user:joined', {
      userId: user.id,
      timestamp: Date.now()
    });

    console.log(`🤝 User ${user.id} joined session ${sessionId}`);
  }

  private handleSessionLeave(socketId: string, sessionId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (!user) return;

    // Leave socket room
    this.io.sockets.sockets.get(socketId)?.leave(`session_${sessionId}`);
    
    // Clear user session
    user.sessionId = undefined;

    // Notify other users
    this.io.to(`session_${sessionId}`).emit('user:left', {
      userId: user.id,
      timestamp: Date.now()
    });

    console.log(`👋 User ${user.id} left session ${sessionId}`);
  }

  // Disconnection handling
  private handleDisconnect(socketId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      console.log(`🔌 User disconnected: ${user.id}`);
      
      // Cleanup session if user was in one
      if (user.sessionId) {
        this.handleSessionLeave(socketId, user.sessionId);
      }
      
      this.connectedUsers.delete(socketId);
    }
  }

  // Utility methods for real-time operations
  private async performTextSearch(_query: string): Promise<MusicResult[]> {
    // Mock implementation - replace with actual search logic
    return [];
  }

  private async performImageSearch(_image: string): Promise<MusicResult[]> {
    // Mock implementation - replace with actual image search logic
    return [];
  }

  private async performAudioSearch(_audio: string): Promise<MusicResult[]> {
    // Mock implementation - replace with actual audio search logic
    return [];
  }

  private async performFinalRanking(_sessionId: string): Promise<MusicResult[]> {
    // Mock implementation - replace with actual ranking logic
    return [];
  }

  private async performQuickSearch(_query: string): Promise<MusicResult[]> {
    // Mock implementation - replace with actual quick search logic
    return [];
  }

  private async generateLiveSuggestions(query: string): Promise<string[]> {
    // Mock implementation - replace with actual suggestion logic
    const commonSuggestions = [
      'happy songs', 'chill music', 'workout playlist', 'study music',
      'romantic ballads', 'indie rock', 'electronic dance', 'jazz classics'
    ];
    
    return commonSuggestions.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }

  private async generateSimilarTracks(socketId: string, trackId: string): Promise<void> {
    // Mock implementation - replace with actual similar track logic
    setTimeout(() => {
      this.io.to(socketId).emit('track:similar', {
        trackId,
        similarTracks: [],
        timestamp: Date.now()
      });
    }, 1000);
  }

  private updateUserPreferences(user: ConnectedUser, trackData: any): void {
    // Update user preferences based on liked tracks
    if (!user.preferences) {
      user.preferences = { genres: [], moods: [] };
    }
    
    if (trackData.genre && !user.preferences.genres.includes(trackData.genre)) {
      user.preferences.genres.push(trackData.genre);
    }
  }

  private async reRankResultsBasedOnFeedback(sessionId: string, feedbackData: any): Promise<void> {
    // Re-rank search results based on user feedback
    const session = this.activeSessions.get(sessionId);
    if (!session?.results) return;

    // Emit updated rankings
    this.emitUpdate(sessionId, {
      type: 'similarity_update',
      sessionId,
      data: { 
        reranked: true, 
        feedback: feedbackData,
        results: session.results 
      },
      timestamp: Date.now()
    });
  }

  // Emission helper methods
  private emitSearchProgress(sessionId: string, stage: string, progress: number): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const user = Array.from(this.connectedUsers.values()).find(u => u.sessionId === sessionId);
    if (!user) return;

    this.io.to(user.socketId).emit('search:progress', {
      sessionId,
      stage,
      progress,
      timestamp: Date.now()
    });
  }

  private emitPartialResults(sessionId: string, results: MusicResult[], source: string): void {
    this.emitUpdate(sessionId, {
      type: 'search_results',
      sessionId,
      data: { results, source, partial: true },
      timestamp: Date.now()
    });
  }

  private emitFinalResults(sessionId: string, results: MusicResult[]): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.results = results;
    }

    this.emitUpdate(sessionId, {
      type: 'search_results',
      sessionId,
      data: { results, final: true },
      timestamp: Date.now()
    });
  }

  private emitSearchError(sessionId: string, error: any): void {
    this.emitUpdate(sessionId, {
      type: 'search_error',
      sessionId,
      data: { error: error.message },
      timestamp: Date.now()
    });
  }

  private emitUpdate(sessionId: string, update: RealTimeUpdate): void {
    const user = Array.from(this.connectedUsers.values()).find(u => u.sessionId === sessionId);
    if (!user) return;

    this.io.to(user.socketId).emit('realtime:update', update);
  }

  private sendWelcomeMessage(socketId: string): void {
    this.io.to(socketId).emit('welcome', {
      message: 'Welcome to VectorBeats! 🎵',
      features: [
        'Real-time music search',
        'Live audio processing',
        'Instant similarity scoring',
        'Collaborative discovery'
      ],
      timestamp: Date.now()
    });
  }

  private sendPersonalizedSuggestions(socketId: string, user: ConnectedUser): void {
    // Generate personalized suggestions based on user preferences
    const suggestions = this.generatePersonalizedSuggestions(user.preferences);
    
    this.io.to(socketId).emit('suggestions:personalized', {
      suggestions,
      basedOn: user.preferences,
      timestamp: Date.now()
    });
  }

  private generatePersonalizedSuggestions(preferences?: ConnectedUser['preferences']): string[] {
    const defaultSuggestions = [
      'Discover new music',
      'Upload an image to find matching vibes',
      'Hum a melody to find similar songs',
      'Explore trending tracks'
    ];

    if (!preferences) return defaultSuggestions;

    const personalizedSuggestions: string[] = [];
    
    preferences.genres.forEach(genre => {
      personalizedSuggestions.push(`Explore more ${genre} music`);
    });

    preferences.moods.forEach(mood => {
      personalizedSuggestions.push(`Find ${mood} tracks`);
    });

    return personalizedSuggestions.length > 0 ? personalizedSuggestions : defaultSuggestions;
  }

  // Cleanup task to remove inactive sessions
  private startCleanupTask(): void {
    setInterval(() => {
      const now = Date.now();
      const maxInactivity = 30 * 60 * 1000; // 30 minutes

      // Clean up inactive users
      for (const [socketId, user] of this.connectedUsers.entries()) {
        if (now - user.lastActivity > maxInactivity) {
          this.connectedUsers.delete(socketId);
          console.log(`🧹 Cleaned up inactive user: ${user.id}`);
        }
      }

      // Clean up old sessions
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.startTime > maxInactivity) {
          this.activeSessions.delete(sessionId);
          console.log(`🧹 Cleaned up old session: ${sessionId}`);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Public API methods
  public getUserCount(): number {
    return this.connectedUsers.size;
  }

  public getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  public emitToAllUsers(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const user = Array.from(this.connectedUsers.values()).find(u => u.id === userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
    }
  }
}

// Singleton instance
let realTimeService: RealTimeService | null = null;

export const initializeRealTimeService = (server: HTTPServer): RealTimeService => {
  if (!realTimeService) {
    realTimeService = new RealTimeService(server);
  }
  return realTimeService;
};

export const getRealTimeService = (): RealTimeService | null => {
  return realTimeService;
};
