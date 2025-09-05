import torch
import open_clip
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from typing import List, Optional, Tuple
import asyncio
import io
import logging

logger = logging.getLogger(__name__)

class ImageProcessor:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            self.model, _, self.preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
            self.model = self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            logger.info(f"CLIP model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            raise
        
    async def extract_embeddings(self, image_path: str) -> np.ndarray:
        """
        Extract embeddings from an image using CLIP model
        """
        try:
            # Load and preprocess image
            image = await self._load_and_validate_image(image_path)
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            
            # Extract features
            with torch.no_grad():
                image_features = self.model.encode_image(image_input)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            return image_features.cpu().numpy().flatten()
            
        except Exception as e:
            logger.error(f"Failed to extract embeddings from {image_path}: {e}")
            raise Exception(f"Failed to extract image embeddings: {str(e)}")

    async def _load_and_validate_image(self, image_path: str) -> Image.Image:
        """
        Load and validate image with proper error handling
        """
        try:
            # Open image and convert to RGB
            with Image.open(image_path) as img:
                # Validate image
                if img.size[0] < 32 or img.size[1] < 32:
                    raise ValueError("Image too small (minimum 32x32 pixels)")
                if img.size[0] > 4096 or img.size[1] > 4096:
                    raise ValueError("Image too large (maximum 4096x4096 pixels)")
                
                # Convert to RGB and return a copy
                return img.convert("RGB").copy()
                
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

    async def extract_embeddings_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """
        Extract embeddings directly from image bytes
        """
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            # Validate image size
            if image.size[0] < 32 or image.size[1] < 32:
                raise ValueError("Image too small")
            
            # Preprocess and extract features
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                image_features = self.model.encode_image(image_input)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            return image_features.cpu().numpy().flatten()
            
        except Exception as e:
            logger.error(f"Failed to extract embeddings from bytes: {e}")
            raise Exception(f"Failed to extract image embeddings: {str(e)}")
    
    async def batch_extract_embeddings(self, image_paths: List[str]) -> List[np.ndarray]:
        """
        Extract embeddings from multiple images in batch
        """
        embeddings = []
        batch_size = 8  # Process in smaller batches to avoid memory issues
        
        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i + batch_size]
            batch_embeddings = []
            
            try:
                # Load and preprocess batch
                images = []
                for path in batch_paths:
                    image = await self._load_and_validate_image(path)
                    images.append(self.preprocess(image))
                
                # Stack images into batch tensor
                batch_tensor = torch.stack(images).to(self.device)
                
                # Extract features for the batch
                with torch.no_grad():
                    batch_features = self.model.encode_image(batch_tensor)
                    batch_features = batch_features / batch_features.norm(dim=-1, keepdim=True)
                
                # Convert to numpy and add to results
                for features in batch_features:
                    batch_embeddings.append(features.cpu().numpy().flatten())
                
                embeddings.extend(batch_embeddings)
                
            except Exception as e:
                logger.error(f"Batch processing failed for batch {i//batch_size}: {e}")
                # Fall back to individual processing for this batch
                for path in batch_paths:
                    try:
                        embedding = await self.extract_embeddings(path)
                        embeddings.append(embedding)
                    except Exception as individual_error:
                        logger.error(f"Failed to process {path}: {individual_error}")
                        # Add zero vector as placeholder
                        embeddings.append(np.zeros(512, dtype=np.float32))
        
        return embeddings

    async def enhance_image(self, image_path: str, enhancement_factor: float = 1.2) -> str:
        """
        Enhance image quality for better feature extraction
        """
        try:
            image = await self._load_and_validate_image(image_path)
            
            # Apply enhancements
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(enhancement_factor)
            
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)
            
            # Apply slight noise reduction
            image = image.filter(ImageFilter.SMOOTH_MORE)
            
            # Save enhanced image
            enhanced_path = image_path.replace(".", "_enhanced.")
            image.save(enhanced_path, quality=95, optimize=True)
            
            return enhanced_path
            
        except Exception as e:
            logger.error(f"Failed to enhance image {image_path}: {e}")
            raise Exception(f"Failed to enhance image: {str(e)}")

    async def preprocess_image(self, image_path: str, target_size: tuple = (224, 224)) -> str:
        """
        Preprocess image for better feature extraction with smart resizing
        """
        try:
            image = await self._load_and_validate_image(image_path)
            
            # Smart resizing - maintain aspect ratio
            original_size = image.size
            if original_size[0] != original_size[1]:
                # If not square, crop to square first
                min_dimension = min(original_size)
                left = (original_size[0] - min_dimension) // 2
                top = (original_size[1] - min_dimension) // 2
                right = left + min_dimension
                bottom = top + min_dimension
                image = image.crop((left, top, right, bottom))
            
            # Resize to target size
            image = image.resize(target_size, Image.Resampling.LANCZOS)
            
            # Save preprocessed image
            processed_path = image_path.replace(".", "_processed.")
            image.save(processed_path, quality=95, optimize=True)
            
            return processed_path
            
        except Exception as e:
            logger.error(f"Failed to preprocess image {image_path}: {e}")
            raise Exception(f"Failed to preprocess image: {str(e)}")

    async def analyze_image_content(self, image_path: str) -> dict:
        """
        Analyze image content and extract metadata
        """
        try:
            image = await self._load_and_validate_image(image_path)
            
            # Basic image analysis
            analysis = {
                "dimensions": image.size,
                "aspect_ratio": image.size[0] / image.size[1],
                "mode": image.mode,
                "dominant_colors": self._extract_dominant_colors(image),
                "brightness": self._calculate_brightness(image),
                "contrast": self._calculate_contrast(image),
                "is_grayscale": self._is_grayscale(image)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze image content: {e}")
            raise Exception(f"Failed to analyze image: {str(e)}")

    def _extract_dominant_colors(self, image: Image.Image, num_colors: int = 5) -> List[Tuple[int, int, int]]:
        """Extract dominant colors from image"""
        try:
            # Resize for faster processing
            small_image = image.resize((150, 150))
            
            # Convert to numpy array
            pixels = np.array(small_image).reshape(-1, 3)
            
            # Simple clustering to find dominant colors
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=num_colors, random_state=42)
            kmeans.fit(pixels)
            
            colors = kmeans.cluster_centers_.astype(int)
            return [tuple(color) for color in colors]
            
        except Exception:
            # Fallback to simple method
            return [(128, 128, 128)]  # Gray as default

    def _calculate_brightness(self, image: Image.Image) -> float:
        """Calculate average brightness of the image"""
        try:
            grayscale = image.convert('L')
            pixels = np.array(grayscale)
            return float(np.mean(pixels) / 255.0)
        except Exception:
            return 0.5  # Default to medium brightness

    def _calculate_contrast(self, image: Image.Image) -> float:
        """Calculate contrast of the image"""
        try:
            grayscale = image.convert('L')
            pixels = np.array(grayscale)
            return float(np.std(pixels) / 255.0)
        except Exception:
            return 0.5  # Default to medium contrast

    def _is_grayscale(self, image: Image.Image) -> bool:
        """Check if image is grayscale"""
        try:
            rgb_image = image.convert('RGB')
            pixels = np.array(rgb_image)
            return np.allclose(pixels[:,:,0], pixels[:,:,1]) and np.allclose(pixels[:,:,1], pixels[:,:,2])
        except Exception:
            return False
    
    def get_model_info(self) -> dict:
        """
        Get information about the loaded model
        """
        return {
            "model_name": "CLIP ViT-B/32",
            "device": self.device,
            "embedding_dim": 512,
            "input_resolution": 224
        }
