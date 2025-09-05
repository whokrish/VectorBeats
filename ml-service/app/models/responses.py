"""
Response models for VectorBeats ML Service
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ProcessResponse(BaseModel):
    """Response model for processing operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    embeddings: Optional[List[float]] = Field(None, description="Extracted embeddings")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Processing metadata")
    processing_time: Optional[float] = Field(None, description="Time taken for processing in seconds")
    error: Optional[str] = Field(None, description="Error message if operation failed")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "embeddings": [0.1, 0.2, 0.3],
                "metadata": {
                    "filename": "example.jpg",
                    "size": 1024,
                    "content_type": "image/jpeg",
                    "embedding_dimensions": 512
                },
                "processing_time": 1.23
            }
        }


class SimilarityResult(BaseModel):
    """Individual similarity search result"""
    id: str = Field(..., description="Vector ID")
    score: float = Field(..., description="Similarity score")
    metadata: Dict[str, Any] = Field(..., description="Associated metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "vector_123",
                "score": 0.85,
                "metadata": {
                    "title": "Sample Song",
                    "artist": "Sample Artist",
                    "genre": "electronic"
                }
            }
        }


class SimilarityResponse(BaseModel):
    """Response model for similarity search"""
    success: bool = Field(..., description="Whether the search was successful")
    results: List[SimilarityResult] = Field(..., description="Search results")
    total_results: int = Field(..., description="Total number of results returned")
    search_time: float = Field(..., description="Time taken for search in seconds")
    error: Optional[str] = Field(None, description="Error message if search failed")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "results": [
                    {
                        "id": "vector_123",
                        "score": 0.85,
                        "metadata": {
                            "title": "Sample Song",
                            "artist": "Sample Artist",
                            "genre": "electronic"
                        }
                    }
                ],
                "total_results": 1,
                "search_time": 0.12
            }
        }


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional health details")
    error: Optional[str] = Field(None, description="Error message if unhealthy")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "service": "VectorBeats ML Service",
                "version": "1.0.0",
                "details": {
                    "image_processor": {"model": "CLIP", "status": "loaded"},
                    "audio_processor": {"status": "ready"},
                    "vector_service": {"connected": True, "collections": 3}
                }
            }
        }


class VectorStoreResponse(BaseModel):
    """Response model for vector storage operations"""
    success: bool = Field(..., description="Whether the storage was successful")
    vector_id: Optional[str] = Field(None, description="ID of the stored vector")
    message: Optional[str] = Field(None, description="Success message")
    error: Optional[str] = Field(None, description="Error message if storage failed")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "vector_id": "vector_123",
                "message": "Vector stored successfully"
            }
        }


class CollectionInfo(BaseModel):
    """Information about a vector collection"""
    name: str = Field(..., description="Collection name")
    vectors_count: int = Field(..., description="Number of vectors in collection")
    config: Dict[str, Any] = Field(..., description="Collection configuration")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "music_vectors",
                "vectors_count": 1500,
                "config": {
                    "vector_size": 512,
                    "distance": "cosine"
                }
            }
        }


class CollectionsResponse(BaseModel):
    """Response model for collections information"""
    success: bool = Field(..., description="Whether the operation was successful")
    collections: List[CollectionInfo] = Field(..., description="List of collections")
    error: Optional[str] = Field(None, description="Error message if operation failed")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "collections": [
                    {
                        "name": "music_vectors",
                        "vectors_count": 1500,
                        "config": {
                            "vector_size": 512,
                            "distance": "cosine"
                        }
                    }
                ]
            }
        }


class ServiceInfoResponse(BaseModel):
    """Response model for service information"""
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    image_processor: Dict[str, Any] = Field(..., description="Image processor info")
    audio_processor: Dict[str, Any] = Field(..., description="Audio processor info")
    vector_service: Dict[str, Any] = Field(..., description="Vector service info")
    capabilities: Dict[str, List[str]] = Field(..., description="Service capabilities")
    
    class Config:
        schema_extra = {
            "example": {
                "service": "VectorBeats ML Service",
                "version": "1.0.0",
                "image_processor": {"model": "CLIP", "status": "loaded"},
                "audio_processor": {"status": "ready"},
                "vector_service": {"connected": True},
                "capabilities": {
                    "image_processing": ["CLIP embeddings", "batch processing"],
                    "audio_processing": ["feature extraction", "mood analysis"],
                    "vector_operations": ["similarity search", "hybrid search"]
                }
            }
        }
