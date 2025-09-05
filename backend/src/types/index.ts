export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

export interface UploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string;
  uploadedAt: string;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  genres?: string[];
  mood?: string[];
  tempo?: {
    min?: number;
    max?: number;
  };
  energy?: {
    min?: number;
    max?: number;
  };
  danceability?: {
    min?: number;
    max?: number;
  };
  valence?: {
    min?: number;
    max?: number;
  };
  year?: {
    min?: number;
    max?: number;
  };
  duration?: {
    min?: number;
    max?: number;
  };
}

export interface MultiModalSearchRequest {
  type: 'combined' | 'image_text' | 'image_audio' | 'text_audio';
  image?: string; // base64 or file path
  audio?: string; // base64 or file path
  text?: string;
  description?: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchRankingOptions {
  weights?: {
    similarity?: number;
    popularity?: number;
    recency?: number;
    mood_match?: number;
  };
  boost_factors?: {
    artist_familiarity?: number;
    genre_preference?: number;
    tempo_preference?: number;
  };
}

export interface MusicResult {
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
  audio_features?: {
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
  };
  mood_tags?: string[];
  genre_tags?: string[];
  popularity?: number;
  release_date?: string;
  ranking_score?: number;
}

export interface SearchMusicResponse {
  results: MusicResult[];
  total: number;
  query: string;
  processing_time: number;
  search_metadata?: {
    search_type: string;
    filters_applied?: SearchFilters;
    ranking_method?: string;
    vector_similarity?: boolean;
    total_matches?: number;
    actual_query?: string;
  };
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'text' | 'image' | 'audio' | 'multimodal';
  filters?: SearchFilters;
  results_count: number;
  timestamp: string;
  processing_time: number;
  preview_url?: string;
}

export interface SearchSuggestion {
  query: string;
  type: 'text' | 'mood' | 'genre' | 'artist';
  category: string;
  popularity_score: number;
}

export interface AudioProcessingResult {
  features: {
    tempo?: number;
    key?: string;
    mode?: string;
    time_signature?: number;
    loudness?: number;
    energy?: number;
    danceability?: number;
    valence?: number;
  };
  spectrogram?: string; // base64 encoded image
  duration: number;
  format: string;
}

export interface HumAnalysisResult {
  matches: MusicResult[];
  confidence: number;
  processing_time: number;
  audio_features: AudioProcessingResult;
}
