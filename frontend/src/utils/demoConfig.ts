// Demo configuration for VectorBeats
// Contains pre-loaded examples and demo scenarios

export interface DemoImage {
  id: string;
  name: string;
  path: string;
  description: string;
  expectedMoods: string[];
  expectedGenres: string[];
  category: 'nature' | 'urban' | 'emotions' | 'activities' | 'art';
}

export interface DemoAudio {
  id: string;
  name: string;
  path: string;
  description: string;
  genre: string;
  tempo: number;
  duration: number;
  preview: boolean;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  steps: DemoStep[];
  category: 'beginner' | 'advanced' | 'showcase';
  estimatedTime: number;
}

export interface DemoStep {
  title: string;
  description: string;
  action: 'upload_image' | 'record_audio' | 'search_text' | 'view_results' | 'play_audio';
  data?: any;
  expectedResult?: string;
}

export interface PerformanceMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  description: string;
}

// Pre-loaded demo images with expected results
export const demoImages: DemoImage[] = [
  {
    id: 'sunset-beach',
    name: 'Sunset Beach',
    path: '/assets/images/sunset-beach.jpg',
    description: 'Peaceful sunset over a tropical beach with golden light',
    expectedMoods: ['calm', 'peaceful', 'romantic', 'dreamy'],
    expectedGenres: ['ambient', 'chillout', 'acoustic', 'indie'],
    category: 'nature'
  },
  {
    id: 'city-night',
    name: 'City Nightlife',
    path: '/assets/images/city-night.jpg',
    description: 'Vibrant city street at night with neon lights',
    expectedMoods: ['energetic', 'exciting', 'urban', 'electric'],
    expectedGenres: ['electronic', 'house', 'synthwave', 'hip-hop'],
    category: 'urban'
  },
  {
    id: 'forest-path',
    name: 'Forest Path',
    path: '/assets/images/forest-path.jpg',
    description: 'Mystical forest path with morning mist',
    expectedMoods: ['mysterious', 'meditative', 'natural', 'introspective'],
    expectedGenres: ['folk', 'ambient', 'classical', 'world'],
    category: 'nature'
  },
  {
    id: 'workout-gym',
    name: 'Gym Workout',
    path: '/assets/images/workout-gym.jpg',
    description: 'Dynamic gym scene with weights and motivation',
    expectedMoods: ['energetic', 'powerful', 'motivational', 'intense'],
    expectedGenres: ['rock', 'metal', 'electronic', 'rap'],
    category: 'activities'
  }
];

// Sample audio clips for demonstration
export const demoAudioClips: DemoAudio[] = [
  {
    id: 'melody-1',
    name: 'Classical Melody',
    path: '/assets/audio/classical-melody.mp3',
    description: 'Simple classical piano melody',
    genre: 'classical',
    tempo: 80,
    duration: 15,
    preview: true
  },
  {
    id: 'melody-2',
    name: 'Jazz Phrase',
    path: '/assets/audio/jazz-phrase.mp3',
    description: 'Jazz saxophone phrase',
    genre: 'jazz',
    tempo: 120,
    duration: 12,
    preview: true
  },
];

// Demo scenarios for guided tours
export const demoScenarios: DemoScenario[] = [
  {
    id: 'beginner-image-search',
    title: 'Discover Music from Images',
    description: 'Learn how to find music that matches the mood of your photos',
    category: 'beginner',
    estimatedTime: 120, // seconds
    steps: [
      {
        title: 'Upload a Photo',
        description: 'Choose a photo that represents a mood or scene you want music for',
        action: 'upload_image',
        data: { suggestedImage: 'sunset-beach' },
        expectedResult: 'Image uploaded and processing started'
      },
      {
        title: 'View AI Analysis',
        description: 'See how AI interprets the mood and visual elements of your image',
        action: 'view_results',
        expectedResult: 'Visual features and mood analysis displayed'
      },
      {
        title: 'Explore Music Matches',
        description: 'Browse through music tracks that match your image\'s mood',
        action: 'view_results',
        expectedResult: 'List of matching songs with similarity scores'
      },
      {
        title: 'Listen to Recommendations',
        description: 'Play preview clips to hear how well the music matches',
        action: 'play_audio',
        expectedResult: 'Audio preview playing with visual feedback'
      }
    ]
  },
  {
    id: 'audio-matching',
    title: 'Find Songs by Humming',
    description: 'Discover songs by humming or singing a melody',
    category: 'beginner',
    estimatedTime: 90,
    steps: [
      {
        title: 'Record Your Voice',
        description: 'Hum or sing a melody you want to identify',
        action: 'record_audio',
        expectedResult: 'Audio recorded with quality indicators'
      },
      {
        title: 'Audio Processing',
        description: 'AI analyzes your audio for melody patterns and features',
        action: 'view_results',
        expectedResult: 'Audio features extraction and visualization'
      },
      {
        title: 'Find Similar Songs',
        description: 'See songs with similar melodies and musical patterns',
        action: 'view_results',
        expectedResult: 'Ranked list of similar songs'
      }
    ]
  },
  {
    id: 'multimodal-search',
    title: 'Advanced Multi-Modal Search',
    description: 'Combine images, audio, and text for precise music discovery',
    category: 'advanced',
    estimatedTime: 180,
    steps: [
      {
        title: 'Upload Reference Image',
        description: 'Start with an image that captures the visual mood',
        action: 'upload_image',
        data: { suggestedImage: 'city-night' }
      },
      {
        title: 'Add Audio Reference',
        description: 'Hum or upload audio that represents the musical style',
        action: 'record_audio'
      },
      {
        title: 'Refine with Text',
        description: 'Add text description to specify genre or mood preferences',
        action: 'search_text',
        data: { suggestedText: 'upbeat electronic dance music' }
      },
      {
        title: 'Review Combined Results',
        description: 'See how multiple inputs create more precise recommendations',
        action: 'view_results',
        expectedResult: 'Refined results combining all input modalities'
      }
    ]
  },
  {
    id: 'performance-showcase',
    title: 'VectorBeats Performance Demo',
    description: 'Showcase the speed and accuracy of vector search technology',
    category: 'showcase',
    estimatedTime: 60,
    steps: [
      {
        title: 'Rapid Image Processing',
        description: 'Demonstrate sub-second image analysis and embedding generation',
        action: 'upload_image',
        data: { suggestedImage: 'abstract-art' }
      },
      {
        title: 'Vector Search Speed',
        description: 'Show real-time similarity search across large music database',
        action: 'view_results',
        expectedResult: 'Search completed in <500ms with performance metrics'
      },
      {
        title: 'Accuracy Metrics',
        description: 'Display confidence scores and similarity measurements',
        action: 'view_results',
        expectedResult: 'Detailed accuracy and performance statistics'
      }
    ]
  }
];

// Performance metrics for demo display
export const performanceMetrics: PerformanceMetric[] = [
  {
    label: 'Image Processing Speed',
    value: 450,
    unit: 'ms',
    trend: 'down',
    description: 'Average time to extract image embeddings using CLIP model'
  },
  {
    label: 'Vector Search Speed',
    value: 120,
    unit: 'ms',
    trend: 'down',
    description: 'Average time to search 1M+ vectors in Qdrant database'
  },
  {
    label: 'Search Accuracy',
    value: 87.3,
    unit: '%',
    trend: 'up',
    description: 'User satisfaction rate with music recommendations'
  },
  {
    label: 'Database Size',
    value: '1.2M',
    unit: 'tracks',
    trend: 'up',
    description: 'Total number of songs in the vector database'
  },
  {
    label: 'Audio Quality Score',
    value: 94.5,
    unit: '%',
    trend: 'stable',
    description: 'Average audio feature extraction quality'
  },
  {
    label: 'API Response Time',
    value: 850,
    unit: 'ms',
    trend: 'down',
    description: 'End-to-end response time for music discovery'
  }
];

// Demo mode configuration
export const demoConfig = {
  autoPlay: true,
  showMetrics: true,
  guidedTour: true,
  mockData: true,
  performanceMode: false,
  animations: true,
  tooltips: true,
  progressTracking: true
};

export default {
  demoImages,
  demoAudioClips,
  demoScenarios,
  performanceMetrics,
  demoConfig,
};
