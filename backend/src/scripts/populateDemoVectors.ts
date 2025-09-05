import fetch from 'node-fetch';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string };
  duration_ms: number;
  preview_url?: string;
  external_urls: { spotify: string };
  audio_features?: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
    key: number;
    mode: number;
    acousticness: number;
    instrumentalness: number;
    speechiness: number;
  };
}

const DEMO_MUSIC_DATA = [
  // Chill/Ambient tracks (for peaceful/nature images)
  {
    genre: 'ambient',
    mood: 'peaceful',
    search_query: 'ambient chill peaceful music',
    vector_bias: [0.1, 0.8, 0.2, 0.9, 0.3] // Peaceful, calm signature
  },
  {
    genre: 'chillout',
    mood: 'relaxing',
    search_query: 'chillout downtempo relax',
    vector_bias: [0.2, 0.7, 0.3, 0.8, 0.4]
  },
  
  // Electronic/Energetic tracks (for urban/dynamic images)
  {
    genre: 'electronic',
    mood: 'energetic',
    search_query: 'electronic dance energy upbeat',
    vector_bias: [0.9, 0.3, 0.8, 0.2, 0.7]
  },
  {
    genre: 'house',
    mood: 'uplifting',
    search_query: 'house progressive electronic',
    vector_bias: [0.8, 0.4, 0.9, 0.3, 0.6]
  },
  
  // Indie/Alternative (for artistic/creative images)
  {
    genre: 'indie',
    mood: 'contemplative',
    search_query: 'indie alternative emotional',
    vector_bias: [0.5, 0.6, 0.4, 0.7, 0.5]
  },
  {
    genre: 'folk',
    mood: 'introspective',
    search_query: 'folk acoustic singer-songwriter',
    vector_bias: [0.3, 0.7, 0.2, 0.8, 0.4]
  },
  
  // Pop/Mainstream (for vibrant/colorful images)
  {
    genre: 'pop',
    mood: 'happy',
    search_query: 'pop upbeat happy mainstream',
    vector_bias: [0.7, 0.5, 0.8, 0.4, 0.7]
  },
  {
    genre: 'funk',
    mood: 'groovy',
    search_query: 'funk disco groove rhythm',
    vector_bias: [0.8, 0.6, 0.9, 0.5, 0.8]
  },
  
  // Rock/Metal (for intense/dramatic images)
  {
    genre: 'rock',
    mood: 'powerful',
    search_query: 'rock alternative powerful guitar',
    vector_bias: [0.9, 0.2, 0.7, 0.3, 0.8]
  },
  {
    genre: 'metal',
    mood: 'intense',
    search_query: 'metal heavy intense aggressive',
    vector_bias: [1.0, 0.1, 0.9, 0.2, 0.9]
  }
];

// Generate realistic but varied music vectors
function generateMusicVector(bias: number[], baseDimensions: number = 128): number[] {
  const vector = [];
  
  for (let i = 0; i < baseDimensions; i++) {
    // Use bias values cyclically with some randomness
    const biasValue = bias[i % bias.length];
    const randomNoise = (Math.random() - 0.5) * 0.3; // ±15% noise
    const value = Math.max(-1, Math.min(1, biasValue + randomNoise));
    vector.push(value);
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

// Generate image vectors that correlate with music moods
function generateImageVector(mood: string, baseDimensions: number = 512): number[] {
  const moodVectorBias: { [key: string]: number[] } = {
    'peaceful': [0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0.2, 0.8],
    'relaxing': [0.3, 0.7, 0.4, 0.6, 0.3, 0.7, 0.3, 0.7],
    'energetic': [0.9, 0.2, 0.8, 0.3, 0.9, 0.4, 0.8, 0.3],
    'uplifting': [0.8, 0.4, 0.7, 0.5, 0.8, 0.5, 0.7, 0.4],
    'contemplative': [0.5, 0.5, 0.6, 0.4, 0.5, 0.6, 0.4, 0.6],
    'introspective': [0.4, 0.6, 0.3, 0.7, 0.4, 0.7, 0.3, 0.6],
    'happy': [0.8, 0.6, 0.7, 0.5, 0.8, 0.6, 0.7, 0.5],
    'groovy': [0.7, 0.5, 0.8, 0.6, 0.7, 0.6, 0.8, 0.5],
    'powerful': [0.9, 0.3, 0.8, 0.4, 0.9, 0.3, 0.8, 0.4],
    'intense': [1.0, 0.2, 0.9, 0.3, 1.0, 0.2, 0.9, 0.3]
  };
  
  const bias = moodVectorBias[mood] || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  const vector = [];
  
  for (let i = 0; i < baseDimensions; i++) {
    const biasValue = bias[i % bias.length];
    const randomNoise = (Math.random() - 0.5) * 0.2;
    const value = Math.max(-1, Math.min(1, biasValue + randomNoise));
    vector.push(value);
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not found in environment variables');
  }
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.status}`);
  }
  
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function searchSpotifyTracks(query: string, token: string, limit: number = 10): Promise<SpotifyTrack[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Spotify search failed: ${response.status}`);
  }
  
  const data = await response.json() as { tracks: { items: SpotifyTrack[] } };
  return data.tracks.items;
}

async function storeVectorInQdrant(collection: string, embeddings: number[], metadata: any): Promise<void> {
  try {
    const response = await fetch('http://localhost:8000/store-vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection,
        embeddings,
        metadata
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to store vector: ${response.status} - ${errorText}`);
    }
    
    console.log(`✅ Stored vector in ${collection}`);
  } catch (error) {
    console.error(`❌ Failed to store vector:`, error);
  }
}

async function populateDatabase() {
  console.log('🚀 Starting database population...');
  
  try {
    // Get Spotify access token
    console.log('🔑 Getting Spotify access token...');
    const token = await getSpotifyAccessToken();
    
    let totalMusicVectors = 0;
    let totalImageVectors = 0;
    
    for (const demoData of DEMO_MUSIC_DATA) {
      console.log(`\n🎵 Processing ${demoData.genre} (${demoData.mood})...`);
      
      try {
        // Search for tracks
        const tracks = await searchSpotifyTracks(demoData.search_query, token, 5);
        console.log(`   Found ${tracks.length} tracks`);
        
        for (const track of tracks) {
          // Generate music vector
          const musicVector = generateMusicVector(demoData.vector_bias);
          
          // Store music vector
          await storeVectorInQdrant('music_vectors', musicVector, {
            track_id: track.id,
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            album: track.album.name,
            genre: demoData.genre,
            mood: demoData.mood,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
            spotify_url: track.external_urls.spotify,
            tempo_category: 'medium', // Simplified for demo
            created_source: 'demo_population'
          });
          totalMusicVectors++;
          
          // Generate corresponding image vector
          const imageVector = generateImageVector(demoData.mood);
          
          // Store image vector with same track_id for correlation
          await storeVectorInQdrant('image_vectors', imageVector, {
            track_id: track.id,
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            album: track.album.name,
            genre: demoData.genre,
            mood: demoData.mood,
            image_type: 'mood_correlation',
            brightness: Math.random() * 0.5 + 0.3, // 0.3-0.8
            contrast: Math.random() * 0.4 + 0.4,   // 0.4-0.8
            dominant_color: demoData.mood === 'energetic' ? 'bright' : 
                           demoData.mood === 'peaceful' ? 'soft' : 'balanced',
            created_source: 'demo_population'
          });
          totalImageVectors++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${demoData.genre}:`, error);
        continue;
      }
    }
    
    console.log(`\n✅ Database population completed!`);
    console.log(`📊 Statistics:`);
    console.log(`   Music vectors: ${totalMusicVectors}`);
    console.log(`   Image vectors: ${totalImageVectors}`);
    console.log(`   Total vectors: ${totalMusicVectors + totalImageVectors}`);
    
    // Verify the population
    console.log('\n🔍 Verifying database...');
    await verifyDatabase();
    
  } catch (error) {
    console.error('❌ Database population failed:', error);
    process.exit(1);
  }
}

async function verifyDatabase() {
  try {
    const collections = ['music_vectors', 'image_vectors'];
    
    for (const collection of collections) {
      const response = await fetch(`http://localhost:6333/collections/${collection}`);
      const data = await response.json() as { result: { points_count: number } };
      
      console.log(`   ${collection}: ${data.result.points_count} vectors`);
    }
  } catch (error) {
    console.error('❌ Failed to verify database:', error);
  }
}

// Run the population
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('\n🎉 All done! Your VectorBeats database is ready for demo!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Population failed:', error);
      process.exit(1);
    });
}
