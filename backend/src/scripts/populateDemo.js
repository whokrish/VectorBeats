const { spawn } = require('child_process');
const path = require('path');

// Generate realistic but varied music vectors
function generateMusicVector(bias, baseDimensions = 128) {
  const vector = [];
  
  for (let i = 0; i < baseDimensions; i++) {
    const biasValue = bias[i % bias.length];
    const randomNoise = (Math.random() - 0.5) * 0.3;
    const value = Math.max(-1, Math.min(1, biasValue + randomNoise));
    vector.push(value);
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

// Generate image vectors that correlate with music moods
function generateImageVector(mood, baseDimensions = 512) {
  const moodVectorBias = {
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

const DEMO_MUSIC_DATA = [
  {
    genre: 'ambient',
    mood: 'peaceful',
    tracks: [
      { title: 'Peaceful Morning', artist: 'Ambient Dreams', album: 'Serenity' },
      { title: 'Gentle Waves', artist: 'Nature Sounds', album: 'Ocean Peace' },
      { title: 'Mountain Meditation', artist: 'Zen Masters', album: 'Inner Calm' }
    ],
    vector_bias: [0.1, 0.8, 0.2, 0.9, 0.3]
  },
  {
    genre: 'electronic',
    mood: 'energetic',
    tracks: [
      { title: 'Electric Dreams', artist: 'Synthwave Pro', album: 'Digital Future' },
      { title: 'Neon Nights', artist: 'Cyber Dance', album: 'City Lights' },
      { title: 'Energy Pulse', artist: 'Beat Machine', album: 'High Voltage' }
    ],
    vector_bias: [0.9, 0.3, 0.8, 0.2, 0.7]
  },
  {
    genre: 'indie',
    mood: 'contemplative',
    tracks: [
      { title: 'Midnight Thoughts', artist: 'Indie Folk', album: 'Quiet Moments' },
      { title: 'Coffee Shop Blues', artist: 'Urban Poets', album: 'City Stories' },
      { title: 'Rainy Day Dreams', artist: 'Acoustic Minds', album: 'Reflections' }
    ],
    vector_bias: [0.5, 0.6, 0.4, 0.7, 0.5]
  },
  {
    genre: 'pop',
    mood: 'happy',
    tracks: [
      { title: 'Sunshine Day', artist: 'Pop Stars', album: 'Feel Good Hits' },
      { title: 'Dancing Queen', artist: 'Party People', album: 'Summer Vibes' },
      { title: 'Good Times', artist: 'Happy Band', album: 'Joy Collection' }
    ],
    vector_bias: [0.7, 0.5, 0.8, 0.4, 0.7]
  },
  {
    genre: 'rock',
    mood: 'powerful',
    tracks: [
      { title: 'Thunder Strike', artist: 'Rock Legends', album: 'Power Chords' },
      { title: 'Mountain High', artist: 'Epic Rock', album: 'Loud and Proud' },
      { title: 'Fire Storm', artist: 'Heavy Metal', album: 'Intensity' }
    ],
    vector_bias: [0.9, 0.2, 0.7, 0.3, 0.8]
  }
];

async function storeVector(collection, embeddings, metadata) {
  const data = JSON.stringify({
    collection,
    embeddings,
    metadata
  });
  
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-d', data,
      'http://localhost:8000/store-vector'
    ]);
    
    let output = '';
    let errorOutput = '';
    
    curl.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(`Failed to store vector: ${output}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${output}`));
        }
      } else {
        reject(new Error(`curl failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

async function populateDatabase() {
  console.log('🚀 Starting database population...');
  
  let totalMusicVectors = 0;
  let totalImageVectors = 0;
  
  for (const demoData of DEMO_MUSIC_DATA) {
    console.log(`\n🎵 Processing ${demoData.genre} (${demoData.mood})...`);
    
    for (let i = 0; i < demoData.tracks.length; i++) {
      const track = demoData.tracks[i];
      const trackId = `demo_${demoData.genre}_${i}_${Date.now()}`;
      
      try {
        // Generate music vector
        const musicVector = generateMusicVector(demoData.vector_bias);
        
        // Store music vector
        await storeVector('music_vectors', musicVector, {
          track_id: trackId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: demoData.genre,
          mood: demoData.mood,
          duration_ms: 180000 + Math.random() * 120000, // 3-5 minutes
          preview_url: `https://demo-preview.com/${trackId}.mp3`,
          spotify_url: `https://open.spotify.com/track/${trackId}`,
          tempo_category: 'medium',
          created_source: 'demo_population'
        });
        totalMusicVectors++;
        console.log(`   ✅ Stored music vector for "${track.title}"`);
        
        // Generate corresponding image vector
        const imageVector = generateImageVector(demoData.mood);
        
        // Store image vector with same track_id for correlation
        await storeVector('image_vectors', imageVector, {
          track_id: trackId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: demoData.genre,
          mood: demoData.mood,
          image_type: 'mood_correlation',
          brightness: Math.random() * 0.5 + 0.3,
          contrast: Math.random() * 0.4 + 0.4,
          dominant_color: demoData.mood === 'energetic' ? 'bright' : 
                         demoData.mood === 'peaceful' ? 'soft' : 'balanced',
          created_source: 'demo_population'
        });
        totalImageVectors++;
        console.log(`   ✅ Stored image vector for "${track.title}"`);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Failed to store vectors for "${track.title}":`, error.message);
        continue;
      }
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
}

async function verifyDatabase() {
  const collections = ['music_vectors', 'image_vectors'];
  
  for (const collection of collections) {
    try {
      const curl = spawn('curl', ['-X', 'GET', `http://localhost:6333/collections/${collection}`]);
      
      let output = '';
      curl.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      await new Promise((resolve) => {
        curl.on('close', () => {
          try {
            const data = JSON.parse(output);
            console.log(`   ${collection}: ${data.result.points_count} vectors`);
          } catch (e) {
            console.log(`   ${collection}: Error parsing response`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.error(`   ❌ Failed to verify ${collection}:`, error.message);
    }
  }
}

// Run the population
populateDatabase()
  .then(() => {
    console.log('\n🎉 All done! Your VectorBeats database is ready for demo!');
    console.log('\n💡 Now try uploading different images - you should get varied results!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Population failed:', error);
    process.exit(1);
  });
