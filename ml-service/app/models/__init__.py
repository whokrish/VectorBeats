"""
Models package for VectorBeats ML Service
"""

from .requests import (
    ImageProcessRequest,
    AudioProcessRequest,
    SimilaritySearchRequest,
    HybridSearchRequest,
    VectorStoreRequest,
    MultimodalVectorStoreRequest
)

from .responses import (
    ProcessResponse,
    SimilarityResult,
    SimilarityResponse,
    HealthResponse,
    VectorStoreResponse,
    CollectionInfo,
    CollectionsResponse,
    ServiceInfoResponse
)

__all__ = [
    # Request models
    "ImageProcessRequest",
    "AudioProcessRequest", 
    "SimilaritySearchRequest",
    "HybridSearchRequest",
    "VectorStoreRequest",
    "MultimodalVectorStoreRequest",
    
    # Response models
    "ProcessResponse",
    "SimilarityResult",
    "SimilarityResponse",
    "HealthResponse",
    "VectorStoreResponse",
    "CollectionInfo",
    "CollectionsResponse",
    "ServiceInfoResponse"
]
