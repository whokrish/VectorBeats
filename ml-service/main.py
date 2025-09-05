from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import time
import logging
from dotenv import load_dotenv

from app.models.requests import ImageProcessRequest, AudioProcessRequest, SimilaritySearchRequest
from app.models.responses import ProcessResponse, SimilarityResponse, HealthResponse
from app.services.image_processor import ImageProcessor
from app.services.audio_processor import AudioProcessor
from app.services.vector_service import VectorService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="VectorBeats ML Service",
    description="AI/ML processing service for music discovery platform with CLIP and audio analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
image_processor = ImageProcessor()
audio_processor = AudioProcessor()
vector_service = VectorService()

@app.on_event("startup")
async def startup_event():
    """Initialize collections on startup"""
    try:
        await vector_service.initialize_collections()
        logger.info("Successfully initialized vector collections")
    except Exception as e:
        logger.error(f"Failed to initialize collections: {e}")

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint with service status"""
    try:
        # Test vector service connection
        client_info = vector_service.get_client_info()
        
        return HealthResponse(
            status="healthy",
            service="VectorBeats ML Service",
            version="1.0.0",
            details={
                "image_processor": image_processor.get_model_info(),
                "audio_processor": audio_processor.get_processor_info(),
                "vector_service": {
                    "connected": client_info["connected"],
                    "collections": len(client_info["available_collections"])
                }
            }
        )
    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            service="VectorBeats ML Service", 
            version="1.0.0",
            error=str(e)
        )

@app.post("/process-image", response_model=ProcessResponse)
async def process_image(file: UploadFile = File(...)):
    """
    Process uploaded image and extract visual embeddings using CLIP model
    """
    start_time = time.time()
    
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")
        
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        try:
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Extract image content analysis
            image_analysis = await image_processor.analyze_image_content(temp_path)
            
            # Process image and get embeddings
            embeddings = await image_processor.extract_embeddings(temp_path)
            
            processing_time = time.time() - start_time
            
            return ProcessResponse(
                success=True,
                embeddings=embeddings.tolist(),
                metadata={
                    "filename": file.filename,
                    "size": len(content),
                    "content_type": file.content_type,
                    "embedding_dimensions": embeddings.shape[0],
                    "image_analysis": image_analysis
                },
                processing_time=processing_time
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.post("/process-audio", response_model=ProcessResponse)
async def process_audio(file: UploadFile = File(...)):
    """
    Process uploaded audio and extract comprehensive audio features/embeddings
    """
    start_time = time.time()
    
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        if file.size and file.size > 20 * 1024 * 1024:  # 20MB limit for audio
            raise HTTPException(status_code=400, detail="Audio file too large (max 20MB)")
        
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        try:
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Process audio and get comprehensive features
            features = await audio_processor.extract_features(temp_path)
            
            # Analyze mood
            mood_analysis = await audio_processor.analyze_mood(temp_path)
            
            processing_time = time.time() - start_time
            
            return ProcessResponse(
                success=True,
                embeddings=features["embeddings"].tolist(),
                metadata={
                    "filename": file.filename,
                    "size": len(content),
                    "content_type": file.content_type,
                    "duration": features["duration"],
                    "tempo": features["tempo"],
                    "key": features["key"],
                    "energy_level": features["energy_mean"],
                    "mood_analysis": mood_analysis,
                    "embedding_dimensions": len(features["embeddings"])
                },
                processing_time=processing_time
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@app.post("/find-similar", response_model=SimilarityResponse)
async def find_similar(request: SimilaritySearchRequest):
    """
    Find similar items in vector database based on embeddings with advanced filtering
    """
    start_time = time.time()
    
    try:
        results = await vector_service.similarity_search(
            embeddings=request.embeddings,
            collection=request.collection,
            limit=request.limit,
            threshold=request.threshold,
            filters=request.filters
        )
        
        search_time = time.time() - start_time
        
        return SimilarityResponse(
            success=True,
            results=results,
            total_results=len(results),
            search_time=search_time
        )
        
    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity search failed: {str(e)}")

@app.post("/hybrid-search")
async def hybrid_search(request: dict):
    """
    Perform advanced hybrid search combining multiple modalities
    """
    start_time = time.time()
    
    try:
        results = await vector_service.hybrid_search(
            image_embeddings=request.get("image_embeddings"),
            audio_embeddings=request.get("audio_embeddings"),
            text_query=request.get("text_query"),
            weights=request.get("weights"),
            limit=request.get("limit", 10),
            filters=request.get("filters")
        )
        
        search_time = time.time() - start_time
        
        return {
            "success": True,
            "results": results,
            "total_results": len(results),
            "search_time": search_time,
            "search_type": "hybrid_multimodal"
        }
        
    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Hybrid search failed: {str(e)}")

@app.post("/store-vector")
async def store_vector(request: dict):
    """
    Store vector embeddings in the database with metadata
    """
    try:
        if "embeddings" not in request or "metadata" not in request or "collection" not in request:
            raise HTTPException(status_code=400, detail="Missing required fields: embeddings, metadata, collection")
        
        result = await vector_service.store_vector(
            embeddings=request["embeddings"],
            metadata=request["metadata"],
            collection=request["collection"]
        )
        
        return {"success": True, "id": result}
        
    except Exception as e:
        logger.error(f"Vector storage failed: {e}")
        raise HTTPException(status_code=500, detail=f"Vector storage failed: {str(e)}")

@app.post("/store-multimodal-vector")
async def store_multimodal_vector(request: dict):
    """
    Store combined image and audio embeddings as multimodal vector
    """
    try:
        if "image_embeddings" not in request or "audio_embeddings" not in request or "metadata" not in request:
            raise HTTPException(status_code=400, detail="Missing required fields: image_embeddings, audio_embeddings, metadata")
        
        result = await vector_service.store_multimodal_vector(
            image_embeddings=request["image_embeddings"],
            audio_embeddings=request["audio_embeddings"],
            metadata=request["metadata"]
        )
        
        return {"success": True, "id": result}
        
    except Exception as e:
        logger.error(f"Multimodal vector storage failed: {e}")
        raise HTTPException(status_code=500, detail=f"Multimodal vector storage failed: {str(e)}")

@app.get("/collections")
async def get_collections():
    """
    Get information about all vector collections
    """
    try:
        collections_info = await vector_service.get_all_collections_info()
        return {"success": True, "collections": collections_info}
        
    except Exception as e:
        logger.error(f"Failed to get collections info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get collections info: {str(e)}")

@app.get("/collection/{collection_name}")
async def get_collection_info(collection_name: str):
    """
    Get detailed information about a specific collection
    """
    try:
        collection_info = await vector_service.get_collection_info(collection_name)
        return {"success": True, "collection": collection_info}
        
    except Exception as e:
        logger.error(f"Failed to get collection info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get collection info: {str(e)}")

@app.delete("/vector/{collection_name}/{vector_id}")
async def delete_vector(collection_name: str, vector_id: str):
    """
    Delete a specific vector from a collection
    """
    try:
        success = await vector_service.delete_vector(vector_id, collection_name)
        return {"success": success, "message": f"Vector {vector_id} deleted from {collection_name}"}
        
    except Exception as e:
        logger.error(f"Failed to delete vector: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete vector: {str(e)}")

@app.get("/vector/{collection_name}/{vector_id}")
async def get_vector(collection_name: str, vector_id: str, include_vector: bool = False):
    """
    Retrieve a specific vector by ID
    """
    try:
        vector_data = await vector_service.get_vector_by_id(vector_id, collection_name, include_vector)
        
        if vector_data is None:
            raise HTTPException(status_code=404, detail="Vector not found")
        
        return {"success": True, "vector": vector_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get vector: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get vector: {str(e)}")

@app.get("/service-info")
async def get_service_info():
    """
    Get comprehensive information about the ML service and its capabilities
    """
    try:
        return {
            "service": "VectorBeats ML Service",
            "version": "1.0.0",
            "image_processor": image_processor.get_model_info(),
            "audio_processor": audio_processor.get_processor_info(),
            "vector_service": vector_service.get_client_info(),
            "capabilities": {
                "image_processing": [
                    "CLIP embeddings",
                    "batch processing",
                    "content analysis",
                    "format conversion"
                ],
                "audio_processing": [
                    "comprehensive feature extraction",
                    "mood analysis",
                    "tempo detection",
                    "key detection",
                    "energy analysis"
                ],
                "vector_operations": [
                    "similarity search",
                    "hybrid multimodal search",
                    "batch operations",
                    "metadata filtering",
                    "collection management"
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get service info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get service info: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
