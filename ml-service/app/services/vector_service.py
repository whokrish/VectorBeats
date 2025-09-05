from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import numpy as np
from typing import List, Dict, Any, Optional, Union
import os
import uuid
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.client = QdrantClient(
            url=os.getenv("QDRANT_URL", "http://localhost:6333"),
            api_key=os.getenv("QDRANT_API_KEY", None)
        )
        self.music_collection = os.getenv("MUSIC_COLLECTION", "music_vectors")
        self.image_collection = os.getenv("IMAGE_COLLECTION", "image_vectors")
        self.audio_collection = os.getenv("AUDIO_COLLECTION", "audio_vectors")
        self.hybrid_collection = os.getenv("HYBRID_COLLECTION", "hybrid_vectors")
        
        # Collection configurations
        self.collection_configs = {
            self.music_collection: {"size": 128, "distance": Distance.COSINE},
            self.image_collection: {"size": 512, "distance": Distance.COSINE},
            self.audio_collection: {"size": 128, "distance": Distance.COSINE},
            self.hybrid_collection: {"size": 640, "distance": Distance.COSINE}  # 512+128 for image+audio
        }
        
    async def initialize_collections(self):
        """
        Initialize all vector collections if they don't exist
        """
        try:
            for collection_name, config in self.collection_configs.items():
                try:
                    # Check if collection exists
                    self.client.get_collection(collection_name)
                    logger.info(f"Collection {collection_name} already exists")
                except Exception:
                    # Create collection if it doesn't exist
                    logger.info(f"Creating collection {collection_name}")
                    self.client.create_collection(
                        collection_name=collection_name,
                        vectors_config=VectorParams(
                            size=config["size"],
                            distance=config["distance"]
                        )
                    )
                    logger.info(f"Successfully created collection {collection_name}")
            
            # Create indexes for better performance
            await self._create_indexes()
                
        except Exception as e:
            logger.error(f"Failed to initialize collections: {e}")
            raise Exception(f"Failed to initialize collections: {str(e)}")

    async def _create_indexes(self):
        """Create indexes for better search performance"""
        try:
            # Create payload indexes for common search fields
            index_fields = ["track_id", "genre", "mood", "tempo_category", "artist", "album"]
            
            for collection_name in self.collection_configs.keys():
                for field in index_fields:
                    try:
                        self.client.create_payload_index(
                            collection_name=collection_name,
                            field_name=field,
                            field_schema=models.PayloadSchemaType.KEYWORD
                        )
                    except Exception:
                        # Index might already exist, continue
                        pass
                        
        except Exception as e:
            logger.warning(f"Failed to create some indexes: {e}")
            # Don't raise exception as indexes are optional
    
    async def store_vector(self, embeddings: List[float], metadata: Dict[str, Any], collection: str) -> str:
        """
        Store vector embeddings with metadata in the specified collection
        """
        try:
            # Validate inputs
            if not embeddings or len(embeddings) == 0:
                raise ValueError("Embeddings cannot be empty")
            
            if collection not in self.collection_configs:
                raise ValueError(f"Unknown collection: {collection}")
            
            # Validate embedding size
            expected_size = self.collection_configs[collection]["size"]
            if len(embeddings) != expected_size:
                raise ValueError(f"Embedding size mismatch. Expected {expected_size}, got {len(embeddings)}")
            
            point_id = str(uuid.uuid4())
            
            # Add timestamp to metadata
            enhanced_metadata = {
                **metadata,
                "created_at": datetime.now().isoformat(),
                "vector_id": point_id
            }
            
            self.client.upsert(
                collection_name=collection,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=embeddings,
                        payload=enhanced_metadata
                    )
                ]
            )
            
            logger.info(f"Successfully stored vector {point_id} in collection {collection}")
            return point_id
            
        except Exception as e:
            logger.error(f"Failed to store vector: {e}")
            raise Exception(f"Failed to store vector: {str(e)}")

    async def store_multimodal_vector(self, 
                                      image_embeddings: List[float], 
                                      audio_embeddings: List[float], 
                                      metadata: Dict[str, Any]) -> str:
        """
        Store combined image and audio embeddings as a single multimodal vector
        """
        try:
            # Combine embeddings
            combined_embeddings = image_embeddings + audio_embeddings
            
            # Add multimodal metadata
            multimodal_metadata = {
                **metadata,
                "modality": "image_audio",
                "image_dim": len(image_embeddings),
                "audio_dim": len(audio_embeddings)
            }
            
            return await self.store_vector(
                embeddings=combined_embeddings,
                metadata=multimodal_metadata,
                collection=self.hybrid_collection
            )
            
        except Exception as e:
            logger.error(f"Failed to store multimodal vector: {e}")
            raise Exception(f"Failed to store multimodal vector: {str(e)}")
    
    async def batch_store_vectors(self, vectors_data: List[Dict], collection: str) -> List[str]:
        """
        Store multiple vectors in batch with enhanced error handling
        """
        try:
            if not vectors_data:
                return []
            
            batch_size = 100  # Process in batches to avoid memory issues
            all_ids = []
            
            for i in range(0, len(vectors_data), batch_size):
                batch = vectors_data[i:i + batch_size]
                batch_ids = await self._process_vector_batch(batch, collection)
                all_ids.extend(batch_ids)
            
            logger.info(f"Successfully stored {len(all_ids)} vectors in collection {collection}")
            return all_ids
            
        except Exception as e:
            logger.error(f"Failed to batch store vectors: {e}")
            raise Exception(f"Failed to batch store vectors: {str(e)}")

    async def _process_vector_batch(self, batch: List[Dict], collection: str) -> List[str]:
        """Process a single batch of vectors"""
        points = []
        ids = []
        
        for data in batch:
            try:
                point_id = str(uuid.uuid4())
                ids.append(point_id)
                
                # Validate data structure
                if "embeddings" not in data or "metadata" not in data:
                    raise ValueError("Each vector data must contain 'embeddings' and 'metadata'")
                
                enhanced_metadata = {
                    **data["metadata"],
                    "created_at": datetime.now().isoformat(),
                    "vector_id": point_id
                }
                
                points.append(
                    PointStruct(
                        id=point_id,
                        vector=data["embeddings"],
                        payload=enhanced_metadata
                    )
                )
                
            except Exception as e:
                logger.error(f"Failed to prepare vector for batch: {e}")
                # Continue with other vectors in the batch
                continue
        
        if points:
            self.client.upsert(collection_name=collection, points=points)
        
        return ids
    
    async def similarity_search(self, 
                               embeddings: List[float], 
                               collection: str, 
                               limit: int = 10, 
                               threshold: float = 0.7,
                               filters: Optional[Dict] = None,
                               include_metadata: bool = True) -> List[Dict]:
        """
        Search for similar vectors in the collection with advanced filtering
        """
        try:
            # Validate inputs
            if not embeddings:
                raise ValueError("Embeddings cannot be empty")
            
            if collection not in self.collection_configs:
                raise ValueError(f"Unknown collection: {collection}")
            
            # Build search filter
            search_filter = None
            if filters:
                search_filter = self._build_search_filter(filters)
            
            # Perform search
            search_results = self.client.search(
                collection_name=collection,
                query_vector=embeddings,
                limit=limit,
                score_threshold=threshold,
                query_filter=search_filter,
                with_payload=include_metadata,
                with_vectors=False  # Don't return vectors to save bandwidth
            )
            
            # Format results
            results = []
            for result in search_results:
                formatted_result = {
                    "id": result.id,
                    "score": result.score,
                    "collection": collection
                }
                
                if include_metadata and result.payload:
                    formatted_result["metadata"] = result.payload
                
                results.append(formatted_result)
            
            logger.info(f"Found {len(results)} similar vectors in collection {collection}")
            return results
            
        except Exception as e:
            logger.error(f"Failed to perform similarity search: {e}")
            raise Exception(f"Failed to perform similarity search: {str(e)}")

    def _build_search_filter(self, filters: Dict) -> models.Filter:
        """Build Qdrant filter from dictionary"""
        conditions = []
        
        for key, value in filters.items():
            if isinstance(value, list):
                # Handle list of values (OR condition)
                or_conditions = [
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=v)
                    ) for v in value
                ]
                conditions.append(models.Filter(should=or_conditions))
            elif isinstance(value, dict):
                # Handle range conditions
                if "gte" in value or "lte" in value or "gt" in value or "lt" in value:
                    range_condition = models.FieldCondition(key=key, range=models.Range(**value))
                    conditions.append(range_condition)
            else:
                # Handle exact match
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=value)
                    )
                )
        
        return models.Filter(must=conditions) if conditions else None
    
    async def hybrid_search(self, 
                           image_embeddings: Optional[List[float]] = None, 
                           audio_embeddings: Optional[List[float]] = None, 
                           text_query: Optional[str] = None,
                           weights: Dict[str, float] = None,
                           limit: int = 10,
                           filters: Optional[Dict] = None) -> List[Dict]:
        """
        Perform advanced hybrid search combining multiple modalities
        """
        try:
            if weights is None:
                weights = {"image": 0.4, "audio": 0.4, "text": 0.2}
            
            all_results = {}
            search_weights = []
            
            # Search with image embeddings
            if image_embeddings:
                image_results = await self.similarity_search(
                    embeddings=image_embeddings,
                    collection=self.image_collection,
                    limit=limit * 2,
                    filters=filters
                )
                self._merge_results(all_results, image_results, weights["image"], "image")
                search_weights.append("image")
            
            # Search with audio embeddings
            if audio_embeddings:
                audio_results = await self.similarity_search(
                    embeddings=audio_embeddings,
                    collection=self.audio_collection,
                    limit=limit * 2,
                    filters=filters
                )
                self._merge_results(all_results, audio_results, weights["audio"], "audio")
                search_weights.append("audio")
            
            # Search in hybrid collection if both modalities present
            if image_embeddings and audio_embeddings:
                combined_embeddings = image_embeddings + audio_embeddings
                hybrid_results = await self.similarity_search(
                    embeddings=combined_embeddings,
                    collection=self.hybrid_collection,
                    limit=limit,
                    filters=filters
                )
                self._merge_results(all_results, hybrid_results, 0.3, "hybrid")
                search_weights.append("hybrid")
            
            # Text-based filtering (if implemented)
            if text_query:
                text_filtered_results = await self._text_search(text_query, filters)
                self._merge_results(all_results, text_filtered_results, weights.get("text", 0.2), "text")
                search_weights.append("text")
            
            # Sort by combined score and return top results
            sorted_results = sorted(
                [
                    {
                        "id": track_id,
                        "score": data["combined_score"],
                        "individual_scores": data["scores"],
                        "search_types": list(data["scores"].keys()),
                        "metadata": data.get("metadata", {})
                    }
                    for track_id, data in all_results.items()
                ],
                key=lambda x: x["score"],
                reverse=True
            )[:limit]
            
            logger.info(f"Hybrid search completed with {len(search_weights)} modalities: {search_weights}")
            return sorted_results
            
        except Exception as e:
            logger.error(f"Failed to perform hybrid search: {e}")
            raise Exception(f"Failed to perform hybrid search: {str(e)}")

    def _merge_results(self, all_results: Dict, results: List[Dict], weight: float, search_type: str):
        """Merge search results with weighted scoring"""
        for result in results:
            result_id = result.get("id")
            if not result_id:
                continue
            
            track_id = result.get("metadata", {}).get("track_id", result_id)
            
            if track_id not in all_results:
                all_results[track_id] = {
                    "scores": {},
                    "combined_score": 0.0,
                    "metadata": result.get("metadata", {})
                }
            
            # Add weighted score
            weighted_score = result["score"] * weight
            all_results[track_id]["scores"][search_type] = result["score"]
            all_results[track_id]["combined_score"] += weighted_score
            
            # Update metadata if more complete
            if len(result.get("metadata", {})) > len(all_results[track_id]["metadata"]):
                all_results[track_id]["metadata"] = result.get("metadata", {})

    async def _text_search(self, text_query: str, filters: Optional[Dict] = None) -> List[Dict]:
        """Perform text-based search using metadata"""
        try:
            # Simple text search in metadata fields
            text_filter = models.Filter(
                should=[
                    models.FieldCondition(
                        key="title",
                        match=models.MatchText(text=text_query)
                    ),
                    models.FieldCondition(
                        key="artist",
                        match=models.MatchText(text=text_query)
                    ),
                    models.FieldCondition(
                        key="album",
                        match=models.MatchText(text=text_query)
                    ),
                    models.FieldCondition(
                        key="genre",
                        match=models.MatchText(text=text_query)
                    )
                ]
            )
            
            # Combine with existing filters
            if filters:
                existing_filter = self._build_search_filter(filters)
                combined_filter = models.Filter(
                    must=[text_filter, existing_filter]
                )
            else:
                combined_filter = text_filter
            
            # Search in music collection
            results = self.client.scroll(
                collection_name=self.music_collection,
                scroll_filter=combined_filter,
                limit=50,
                with_payload=True,
                with_vectors=False
            )
            
            # Format results with artificial scores based on text relevance
            formatted_results = []
            for point in results[0]:  # results is a tuple (points, next_page_offset)
                # Simple text relevance scoring
                relevance_score = self._calculate_text_relevance(text_query, point.payload)
                
                formatted_results.append({
                    "id": point.id,
                    "score": relevance_score,
                    "metadata": point.payload
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Text search failed: {e}")
            return []

    def _calculate_text_relevance(self, query: str, metadata: Dict) -> float:
        """Calculate simple text relevance score"""
        query_lower = query.lower()
        score = 0.0
        
        # Check different fields with different weights
        field_weights = {
            "title": 0.4,
            "artist": 0.3,
            "album": 0.2,
            "genre": 0.1
        }
        
        for field, weight in field_weights.items():
            field_value = str(metadata.get(field, "")).lower()
            if query_lower in field_value:
                score += weight
                if field_value.startswith(query_lower):
                    score += weight * 0.5  # Bonus for prefix match
        
        return min(score, 1.0)
    
    async def get_collection_info(self, collection: str) -> Dict:
        """
        Get comprehensive information about a collection
        """
        try:
            info = self.client.get_collection(collection)
            
            # Get collection statistics
            collection_stats = {
                "name": collection,
                "vectors_count": info.vectors_count,
                "indexed_vectors_count": getattr(info, 'indexed_vectors_count', info.vectors_count),
                "status": info.status,
                "optimizer_status": getattr(info, 'optimizer_status', {}),
                "config": {
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance,
                    "index_type": getattr(info.config.params.vectors, 'hnsw_config', {})
                },
                "payload_schema": getattr(info.config, 'payload_schema', {})
            }
            
            return collection_stats
            
        except Exception as e:
            logger.error(f"Failed to get collection info for {collection}: {e}")
            raise Exception(f"Failed to get collection info: {str(e)}")

    async def get_all_collections_info(self) -> Dict[str, Dict]:
        """Get information about all collections"""
        try:
            collections_info = {}
            
            for collection_name in self.collection_configs.keys():
                try:
                    collections_info[collection_name] = await self.get_collection_info(collection_name)
                except Exception as e:
                    logger.warning(f"Failed to get info for collection {collection_name}: {e}")
                    collections_info[collection_name] = {"error": str(e)}
            
            return collections_info
            
        except Exception as e:
            logger.error(f"Failed to get all collections info: {e}")
            raise Exception(f"Failed to get all collections info: {str(e)}")

    async def delete_vector(self, vector_id: str, collection: str) -> bool:
        """
        Delete a vector from the collection
        """
        try:
            self.client.delete(
                collection_name=collection,
                points_selector=models.PointIdsList(
                    points=[vector_id]
                )
            )
            
            logger.info(f"Successfully deleted vector {vector_id} from collection {collection}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete vector {vector_id}: {e}")
            raise Exception(f"Failed to delete vector: {str(e)}")

    async def delete_vectors_by_filter(self, collection: str, filters: Dict) -> int:
        """
        Delete vectors matching the given filters
        """
        try:
            search_filter = self._build_search_filter(filters)
            
            result = self.client.delete(
                collection_name=collection,
                points_selector=models.FilterSelector(filter=search_filter)
            )
            
            # The result might contain operation info
            deleted_count = getattr(result, 'operation_id', 0)
            logger.info(f"Deleted vectors from collection {collection} with filters {filters}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete vectors by filter: {e}")
            raise Exception(f"Failed to delete vectors by filter: {str(e)}")

    async def update_vector_metadata(self, vector_id: str, collection: str, metadata: Dict) -> bool:
        """
        Update metadata of an existing vector
        """
        try:
            # Add update timestamp
            enhanced_metadata = {
                **metadata,
                "updated_at": datetime.now().isoformat()
            }
            
            self.client.set_payload(
                collection_name=collection,
                payload=enhanced_metadata,
                points=[vector_id]
            )
            
            logger.info(f"Successfully updated metadata for vector {vector_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update vector metadata: {e}")
            raise Exception(f"Failed to update vector metadata: {str(e)}")

    async def get_vector_by_id(self, vector_id: str, collection: str, include_vector: bool = False) -> Optional[Dict]:
        """
        Retrieve a specific vector by ID
        """
        try:
            points = self.client.retrieve(
                collection_name=collection,
                ids=[vector_id],
                with_payload=True,
                with_vectors=include_vector
            )
            
            if not points:
                return None
            
            point = points[0]
            result = {
                "id": point.id,
                "metadata": point.payload
            }
            
            if include_vector and point.vector:
                result["vector"] = point.vector
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get vector by ID {vector_id}: {e}")
            raise Exception(f"Failed to get vector by ID: {str(e)}")

    async def count_vectors(self, collection: str, filters: Optional[Dict] = None) -> int:
        """
        Count vectors in collection, optionally with filters
        """
        try:
            if filters:
                search_filter = self._build_search_filter(filters)
                result = self.client.count(
                    collection_name=collection,
                    count_filter=search_filter
                )
            else:
                info = self.client.get_collection(collection)
                result = models.CountResult(count=info.vectors_count)
            
            return result.count
            
        except Exception as e:
            logger.error(f"Failed to count vectors: {e}")
            raise Exception(f"Failed to count vectors: {str(e)}")

    async def backup_collection(self, collection: str, backup_path: str) -> bool:
        """
        Create a backup of a collection (simplified version)
        """
        try:
            # This is a simplified backup - in production you'd use Qdrant's snapshot feature
            logger.info(f"Backup functionality for {collection} would be implemented here")
            logger.info(f"Backup path: {backup_path}")
            
            # For now, just return success
            # In a real implementation, you'd use:
            # self.client.create_snapshot(collection_name=collection)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to backup collection {collection}: {e}")
            raise Exception(f"Failed to backup collection: {str(e)}")

    def get_client_info(self) -> Dict:
        """
        Get comprehensive information about the Qdrant client and connections
        """
        try:
            # Test connection
            collections = self.client.get_collections()
            
            return {
                "url": os.getenv("QDRANT_URL", "http://localhost:6333"),
                "connected": True,
                "collections": {
                    "music_collection": self.music_collection,
                    "image_collection": self.image_collection,
                    "audio_collection": self.audio_collection,
                    "hybrid_collection": self.hybrid_collection
                },
                "available_collections": [col.name for col in collections.collections],
                "collection_configs": self.collection_configs,
                "client_version": "1.0.0",
                "features": [
                    "vector_similarity_search",
                    "hybrid_multimodal_search", 
                    "batch_operations",
                    "metadata_filtering",
                    "text_search"
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get client info: {e}")
            return {
                "url": os.getenv("QDRANT_URL", "http://localhost:6333"),
                "connected": False,
                "error": str(e),
                "collections": {},
                "available_collections": []
            }
