"""
Request models for VectorBeats ML Service
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ImageProcessRequest(BaseModel):
    """Request model for image processing"""
    image_data: Optional[str] = Field(None, description="Base64 encoded image data")
    image_url: Optional[str] = Field(None, description="URL of the image to process")
    
    class Config:
        schema_extra = {
            "example": {
                "image_url": "https://example.com/image.jpg"
            }
        }


class AudioProcessRequest(BaseModel):
    """Request model for audio processing"""
    audio_data: Optional[str] = Field(None, description="Base64 encoded audio data")
    audio_url: Optional[str] = Field(None, description="URL of the audio to process")
    
    class Config:
        schema_extra = {
            "example": {
                "audio_url": "https://example.com/audio.mp3"
            }
        }


class SimilaritySearchRequest(BaseModel):
    """Request model for similarity search"""
    embeddings: List[float] = Field(..., description="Vector embeddings to search for")
    collection: str = Field("default", description="Collection name to search in")
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results to return")
    threshold: float = Field(0.7, ge=0.0, le=1.0, description="Similarity threshold")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    
    class Config:
        schema_extra = {
            "example": {
                "embeddings": [0.1, 0.2, 0.3],
                "collection": "music_vectors",
                "limit": 10,
                "threshold": 0.8,
                "filters": {"genre": "electronic"}
            }
        }


class HybridSearchRequest(BaseModel):
    """Request model for hybrid multimodal search"""
    image_embeddings: Optional[List[float]] = Field(None, description="Image vector embeddings")
    audio_embeddings: Optional[List[float]] = Field(None, description="Audio vector embeddings")
    text_query: Optional[str] = Field(None, description="Text query for search")
    weights: Optional[Dict[str, float]] = Field(
        {"image": 0.4, "audio": 0.4, "text": 0.2}, 
        description="Weights for different modalities"
    )
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    
    class Config:
        schema_extra = {
            "example": {
                "image_embeddings": [0.1, 0.2, 0.3],
                "audio_embeddings": [0.4, 0.5, 0.6],
                "text_query": "upbeat electronic music",
                "weights": {"image": 0.4, "audio": 0.4, "text": 0.2},
                "limit": 10
            }
        }


class VectorStoreRequest(BaseModel):
    """Request model for storing vectors"""
    embeddings: List[float] = Field(..., description="Vector embeddings to store")
    metadata: Dict[str, Any] = Field(..., description="Metadata associated with the vector")
    collection: str = Field("default", description="Collection name to store in")
    vector_id: Optional[str] = Field(None, description="Optional custom vector ID")
    
    class Config:
        schema_extra = {
            "example": {
                "embeddings": [0.1, 0.2, 0.3],
                "metadata": {
                    "title": "Sample Song",
                    "artist": "Sample Artist",
                    "genre": "electronic"
                },
                "collection": "music_vectors",
                "vector_id": "song_123"
            }
        }


class MultimodalVectorStoreRequest(BaseModel):
    """Request model for storing multimodal vectors"""
    image_embeddings: List[float] = Field(..., description="Image vector embeddings")
    audio_embeddings: List[float] = Field(..., description="Audio vector embeddings")
    metadata: Dict[str, Any] = Field(..., description="Metadata associated with the vector")
    vector_id: Optional[str] = Field(None, description="Optional custom vector ID")
    
    class Config:
        schema_extra = {
            "example": {
                "image_embeddings": [0.1, 0.2, 0.3],
                "audio_embeddings": [0.4, 0.5, 0.6],
                "metadata": {
                    "title": "Sample Song",
                    "artist": "Sample Artist",
                    "genre": "electronic",
                    "mood": "energetic"
                },
                "vector_id": "multimodal_123"
            }
        }
