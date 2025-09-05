# VectorBeats API Documentation

## Overview

VectorBeats is an audio-visual music discovery platform that uses vector embeddings to find music based on images, audio, and text descriptions. This document provides comprehensive API documentation with examples.

**Base URL:** `https://api.vectorbeats.com` (Production) or `http://localhost:5000/api` (Development)

**API Version:** v1

## Authentication

Currently, the API does not require authentication for basic usage. Rate limiting is applied based on IP address.

### Rate Limits

- **General API calls:** 100 requests per 15 minutes
- **Upload endpoints:** 20 requests per 15 minutes per IP
- **Search endpoints:** 50 requests per 15 minutes per IP

## Error Handling

All API endpoints return errors in the following format:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-04T10:30:00.000Z",
  "requestId": "uuid-string"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Endpoints

### Health Check

#### GET /health

Check if the API is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-04T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "ml_service": "connected",
    "vector_db": "connected"
  }
}
```

### Image Upload and Processing

#### POST /upload/image

Upload an image to discover music based on visual content.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `image` (file): Image file (JPG, PNG, WebP)
  - `description` (string, optional): Text description of the image
  - `mood` (string, optional): Desired mood ("happy", "sad", "energetic", "calm")
  - `limit` (number, optional): Number of results to return (default: 10, max: 50)

**Example using curl:**
```bash
curl -X POST \
  -F "image=@sunset.jpg" \
  -F "description=beautiful sunset over the ocean" \
  -F "mood=calm" \
  -F "limit=5" \
  http://localhost:5000/api/upload/image
```

**Response:**
```json
{
  "success": true,
  "requestId": "img_123456789",
  "image": {
    "id": "img_123456789",
    "filename": "sunset.jpg",
    "size": 2048576,
    "processedAt": "2025-09-04T10:30:00.000Z"
  },
  "analysis": {
    "dominantColors": ["#FF6B35", "#F7931E", "#FFD23F"],
    "mood": "peaceful",
    "objects": ["sunset", "ocean", "sky"],
    "emotions": ["calm", "serene", "peaceful"]
  },
  "recommendations": [
    {
      "track": {
        "id": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
        "name": "Ocean Eyes",
        "artist": "Billie Eilish",
        "album": "Ocean Eyes",
        "duration_ms": 200040,
        "preview_url": "https://p.scdn.co/mp3-preview/...",
        "external_urls": {
          "spotify": "https://open.spotify.com/track/..."
        }
      },
      "similarity_score": 0.92,
      "matching_features": ["calm", "dreamy", "atmospheric"],
      "audio_features": {
        "valence": 0.3,
        "energy": 0.4,
        "danceability": 0.6,
        "tempo": 90
      }
    }
  ]
}
```

### Audio Upload and Processing

#### POST /upload/audio

Upload audio (humming, singing, etc.) to find similar music.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `audio` (file): Audio file (MP3, WAV, M4A, WebM)
  - `type` (string, optional): Type of audio ("humming", "singing", "instrumental")
  - `limit` (number, optional): Number of results to return (default: 10, max: 50)

**Example using curl:**
```bash
curl -X POST \
  -F "audio=@humming.wav" \
  -F "type=humming" \
  -F "limit=3" \
  http://localhost:5000/api/upload/audio
```

**Response:**
```json
{
  "success": true,
  "requestId": "aud_987654321",
  "audio": {
    "id": "aud_987654321",
    "filename": "humming.wav",
    "duration": 15.6,
    "size": 1024768,
    "processedAt": "2025-09-04T10:30:00.000Z"
  },
  "analysis": {
    "tempo": 120,
    "key": "C major",
    "time_signature": 4,
    "pitch_contour": [261.63, 293.66, 329.63],
    "dominant_frequencies": [440, 880, 1320]
  },
  "recommendations": [
    {
      "track": {
        "id": "spotify:track:7qiZfU4dY1lWllzX7mkmht",
        "name": "Someone Like You",
        "artist": "Adele",
        "album": "21"
      },
      "similarity_score": 0.85,
      "matching_features": ["melody", "tempo", "key"],
      "confidence": "high"
    }
  ]
}
```

### Text-Based Search

#### POST /search/text

Search for music using text descriptions.

**Request:**
```json
{
  "query": "upbeat pop song for working out",
  "mood": "energetic",
  "genre": "pop",
  "tempo_range": [120, 140],
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "query": "upbeat pop song for working out",
  "results": [
    {
      "track": {
        "id": "spotify:track:6f70bfcdd8f94dbcac3b5bb5",
        "name": "Blinding Lights",
        "artist": "The Weeknd",
        "album": "After Hours"
      },
      "relevance_score": 0.94,
      "matching_criteria": ["upbeat", "pop", "energetic", "tempo"]
    }
  ]
}
```

### Advanced Multi-Modal Search

#### POST /search/multimodal

Combine image, audio, and text for more precise music discovery.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `image` (file, optional): Image file
  - `audio` (file, optional): Audio file
  - `text` (string, optional): Text description
  - `mood` (string, optional): Desired mood
  - `genre` (string, optional): Preferred genre
  - `limit` (number, optional): Number of results

**Example:**
```bash
curl -X POST \
  -F "image=@beach.jpg" \
  -F "audio=@melody.wav" \
  -F "text=relaxing summer vibes" \
  -F "mood=chill" \
  http://localhost:5000/api/search/multimodal
```

### Get Recommendations by ID

#### GET /recommendations/:id

Get cached recommendations by request ID.

**Parameters:**
- `id` (string): Request ID from previous upload/search

**Response:**
```json
{
  "success": true,
  "requestId": "img_123456789",
  "cached": true,
  "cachedAt": "2025-09-04T10:30:00.000Z",
  "recommendations": [...]
}
```

### Music Analysis

#### GET /analyze/:track_id

Get detailed analysis of a specific track.

**Parameters:**
- `track_id` (string): Spotify track ID

**Response:**
```json
{
  "track": {
    "id": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
    "name": "Ocean Eyes",
    "artist": "Billie Eilish"
  },
  "audio_features": {
    "acousticness": 0.74,
    "danceability": 0.605,
    "energy": 0.425,
    "instrumentalness": 0.000159,
    "liveness": 0.107,
    "loudness": -10.372,
    "speechiness": 0.0334,
    "tempo": 90.062,
    "valence": 0.314,
    "key": 6,
    "mode": 1,
    "time_signature": 4
  },
  "audio_analysis": {
    "duration": 200.04,
    "sections": [...],
    "beats": [...],
    "tatums": [...]
  }
}
```

## ML Service Endpoints

The following endpoints are available for direct ML service interaction:

### Process Image

#### POST /ml/process-image

**Request:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "options": {
    "extract_objects": true,
    "extract_colors": true,
    "extract_mood": true
  }
}
```

### Process Audio

#### POST /ml/process-audio

**Request:**
```json
{
  "audio_url": "https://example.com/audio.wav",
  "options": {
    "extract_features": true,
    "extract_melody": true,
    "extract_tempo": true
  }
}
```

### Vector Search

#### POST /ml/search

**Request:**
```json
{
  "vector": [0.1, 0.2, 0.3, ...],
  "collection": "music_embeddings",
  "limit": 10,
  "threshold": 0.7
}
```

## WebSocket Events

For real-time features, connect to `/socket.io/`:

### Events

#### upload_progress
```json
{
  "requestId": "img_123456789",
  "progress": 75,
  "stage": "processing_image"
}
```

#### recommendations_ready
```json
{
  "requestId": "img_123456789",
  "count": 10
}
```

#### error
```json
{
  "requestId": "img_123456789",
  "error": "Processing failed",
  "code": "PROCESSING_ERROR"
}
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function uploadImage(imagePath, description) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  form.append('description', description);
  
  try {
    const response = await axios.post(
      'http://localhost:5000/api/upload/image',
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response.data);
    throw error;
  }
}

// Usage
uploadImage('./sunset.jpg', 'Beautiful sunset')
  .then(result => console.log('Recommendations:', result.recommendations))
  .catch(error => console.error('Error:', error));
```

### Python

```python
import requests

def search_by_text(query, mood=None, genre=None):
    url = 'http://localhost:5000/api/search/text'
    data = {
        'query': query,
        'mood': mood,
        'genre': genre,
        'limit': 5
    }
    
    response = requests.post(url, json=data)
    response.raise_for_status()
    
    return response.json()

# Usage
results = search_by_text(
    query='relaxing jazz for studying',
    mood='calm',
    genre='jazz'
)

for track in results['results']:
    print(f"{track['track']['name']} by {track['track']['artist']}")
```

### React/Frontend

```jsx
import axios from 'axios';

const uploadImage = async (file, description) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('description', description);
  
  try {
    const response = await axios.post('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${progress}%`);
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

## Performance Optimization

### Caching

- **Image embeddings:** Cached for 24 hours
- **Audio fingerprints:** Cached for 12 hours
- **Search results:** Cached for 1 hour
- **Track analysis:** Cached for 7 days

### Best Practices

1. **Image uploads:**
   - Resize images to max 1920x1080 before upload
   - Use JPEG format for photos, PNG for graphics
   - Compress images to reduce upload time

2. **Audio uploads:**
   - Keep audio samples under 30 seconds
   - Use WAV format for best quality analysis
   - Normalize audio levels

3. **API calls:**
   - Implement exponential backoff for retries
   - Use appropriate cache headers
   - Batch multiple requests when possible

## SDK and Libraries

### Official JavaScript SDK

```bash
npm install @vectorbeats/sdk
```

```javascript
import VectorBeats from '@vectorbeats/sdk';

const client = new VectorBeats({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000
});

const recommendations = await client.searchByImage('./image.jpg');
```

### Community Libraries

- **Python:** `vectorbeats-python` (unofficial)
- **Go:** `go-vectorbeats` (community)
- **PHP:** `vectorbeats-php` (community)

## Changelog

### v1.0.0 (2025-09-04)
- Initial API release
- Image-based music discovery
- Audio-based music discovery
- Text-based search
- Multi-modal search capabilities
- Real-time WebSocket events

## Support

- **Documentation:** https://docs.vectorbeats.com
- **GitHub Issues:** https://github.com/vectorbeats/platform/issues
- **Email:** api@vectorbeats.com
- **Discord:** https://discord.gg/vectorbeats
