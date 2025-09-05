// Core data types for the VectorBeats application

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  previewUrl?: string;
  spotifyUrl: string;
  duration?: number;
  genre?: string;
  mood?: string;
  features?: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
    loudness: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
  };
}

export interface SearchResult {
  track: Track;
  similarity: number;
  searchType: 'image' | 'audio' | 'hybrid' | 'text';
  metadata?: {
    processingTime?: number;
    confidence?: number;
    [key: string]: any;
  };
}

export interface SearchHistory {
  id: string;
  timestamp: Date;
  searchType: 'image' | 'audio' | 'hybrid';
  query?: string;
  results: SearchResult[];
  imageUrl?: string;
  audioUrl?: string;
  processingTime?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'searching' | 'complete';
}

export interface AudioRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  waveformData?: number[];
}

export interface ImageUpload {
  id: string;
  file: File;
  url: string;
  timestamp: Date;
  analysis?: {
    dimensions: [number, number];
    dominantColors: string[];
    brightness: number;
    contrast: number;
  };
}

export interface MLServiceResponse {
  success: boolean;
  embeddings: number[];
  metadata: {
    filename: string;
    size: number;
    processingTime?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface SimilaritySearchResponse {
  success: boolean;
  results: SearchResult[];
  totalResults: number;
  searchTime?: number;
  searchType?: string;
  error?: string;
}

export interface HybridSearchRequest {
  imageEmbeddings?: number[];
  audioEmbeddings?: number[];
  textQuery?: string;
  weights?: {
    image?: number;
    audio?: number;
    text?: number;
  };
  limit?: number;
  filters?: {
    genre?: string[];
    mood?: string[];
    tempo?: { min: number; max: number };
    energy?: { min: number; max: number };
  };
}

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteMoods: string[];
  preferredTempo: { min: number; max: number };
  preferredEnergy: { min: number; max: number };
  searchHistory: boolean;
  notifications: boolean;
}

export interface AppState {
  searchResults: SearchResult[];
  searchHistory: SearchHistory[];
  favorites: string[];
  isLoading: boolean;
  currentSearch: {
    type: 'image' | 'audio' | 'hybrid' | null;
    progress?: UploadProgress;
  };
  userPreferences: UserPreferences;
  error: string | null;
}
