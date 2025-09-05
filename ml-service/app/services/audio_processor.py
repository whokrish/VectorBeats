import librosa
import numpy as np
import soundfile as sf
from typing import Dict, List, Tuple, Optional
import asyncio
from sklearn.preprocessing import StandardScaler
import logging
import os

logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self):
        self.sample_rate = 22050
        self.n_mfcc = 13
        self.n_fft = 2048
        self.hop_length = 512
        self.scaler = StandardScaler()
        
        # Audio feature configuration
        self.feature_config = {
            "n_chroma": 12,
            "n_spectral_contrast": 7,
            "n_tonnetz": 6,
            "n_mels": 128
        }
        
    async def extract_features(self, audio_path: str) -> Dict:
        """
        Extract comprehensive audio features from an audio file
        """
        try:
            # Load audio file with error handling
            try:
                y, sr = librosa.load(audio_path, sr=self.sample_rate)
            except Exception as e:
                logger.error(f"Failed to load audio file {audio_path}: {e}")
                raise ValueError(f"Invalid audio file: {str(e)}")
            
            # Validate audio
            if len(y) == 0:
                raise ValueError("Audio file is empty")
            if len(y) < self.sample_rate * 0.1:  # Less than 0.1 seconds
                raise ValueError("Audio file too short (minimum 0.1 seconds)")
            
            # Extract comprehensive features
            features = {}
            
            # Basic audio properties
            features["duration"] = len(y) / sr
            features["sample_rate"] = sr
            features["total_samples"] = len(y)
            
            # Rhythm and tempo features
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features["tempo"] = float(tempo)
            features["beat_frames"] = len(beats)
            features["beat_density"] = len(beats) / features["duration"]
            
            # Advanced rhythm analysis
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            features["onset_density"] = len(onset_frames) / features["duration"]
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features["spectral_centroid_mean"] = float(np.mean(spectral_centroids))
            features["spectral_centroid_std"] = float(np.std(spectral_centroids))
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            features["spectral_rolloff_mean"] = float(np.mean(spectral_rolloff))
            features["spectral_rolloff_std"] = float(np.std(spectral_rolloff))
            
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
            features["spectral_bandwidth_mean"] = float(np.mean(spectral_bandwidth))
            
            # Zero crossing rate (indicates voicing)
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            features["zcr_mean"] = float(np.mean(zcr))
            features["zcr_std"] = float(np.std(zcr))
            
            # MFCC features (important for timbre)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
            features["mfcc"] = {}
            for i in range(self.n_mfcc):
                features["mfcc"][f"mfcc_{i}"] = {
                    "mean": float(np.mean(mfccs[i])),
                    "std": float(np.std(mfccs[i])),
                    "var": float(np.var(mfccs[i]))
                }
            
            # Chroma features (key and harmony)
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            features["chroma_mean"] = np.mean(chroma, axis=1).tolist()
            features["chroma_std"] = np.std(chroma, axis=1).tolist()
            
            # Estimate musical key
            key_index = np.argmax(np.mean(chroma, axis=1))
            key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            features["key"] = key_names[key_index]
            features["key_strength"] = float(np.max(np.mean(chroma, axis=1)))
            
            # Tonnetz features (harmonic content)
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)
            features["tonnetz_mean"] = np.mean(tonnetz, axis=1).tolist()
            
            # Spectral contrast (timbre)
            spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            features["spectral_contrast_mean"] = np.mean(spectral_contrast, axis=1).tolist()
            
            # Mel-frequency features
            mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=self.feature_config["n_mels"])
            features["mel_mean"] = np.mean(mel_spectrogram, axis=1).tolist()
            
            # Energy and dynamics
            rms = librosa.feature.rms(y=y)[0]
            features["energy_mean"] = float(np.mean(rms))
            features["energy_std"] = float(np.std(rms))
            features["energy_max"] = float(np.max(rms))
            features["dynamic_range"] = float(np.max(rms) - np.min(rms))
            
            # Advanced tempo analysis
            tempogram = librosa.feature.tempogram(y=y, sr=sr)
            features["tempo_stability"] = float(np.std(tempogram))
            
            # Spectral features for mood detection
            features["brightness"] = float(np.mean(spectral_centroids) / (sr/2))  # Normalized brightness
            features["roughness"] = self._calculate_roughness(y, sr)
            features["warmth"] = self._calculate_warmth(mel_spectrogram)
            
            # Create embeddings vector
            embedding_vector = self._create_enhanced_embedding_vector(features)
            features["embeddings"] = embedding_vector
            
            return features
            
        except Exception as e:
            logger.error(f"Failed to extract audio features from {audio_path}: {e}")
            raise Exception(f"Failed to extract audio features: {str(e)}")

    def _calculate_roughness(self, y: np.ndarray, sr: int) -> float:
        """Calculate perceptual roughness of the audio"""
        try:
            # Use spectral irregularity as a proxy for roughness
            spec = np.abs(librosa.stft(y))
            spectral_irregularity = np.mean([
                np.sum(np.diff(spec[:, i])**2) for i in range(min(10, spec.shape[1]))
            ])
            return float(np.log1p(spectral_irregularity))
        except Exception:
            return 0.0

    def _calculate_warmth(self, mel_spectrogram: np.ndarray) -> float:
        """Calculate perceptual warmth based on low-frequency content"""
        try:
            # Focus on lower mel frequencies for warmth
            low_freq_energy = np.mean(mel_spectrogram[:mel_spectrogram.shape[0]//3])
            high_freq_energy = np.mean(mel_spectrogram[2*mel_spectrogram.shape[0]//3:])
            warmth = low_freq_energy / (high_freq_energy + 1e-8)
            return float(np.log1p(warmth))
        except Exception:
            return 0.0
    
    def _create_enhanced_embedding_vector(self, features: Dict) -> np.ndarray:
        """
        Create a comprehensive fixed-size embedding vector from extracted features
        """
        try:
            embedding_parts = []
            
            # Tempo and rhythm (normalized)
            embedding_parts.extend([
                features["tempo"] / 200.0,  # Normalize tempo (0-1 for 0-200 BPM)
                features["beat_density"] / 10.0,  # Normalize beat density
                features["onset_density"] / 20.0,  # Normalize onset density
            ])
            
            # Spectral features (normalized)
            embedding_parts.extend([
                features["spectral_centroid_mean"] / 8000.0,
                features["spectral_rolloff_mean"] / 16000.0,
                features["spectral_bandwidth_mean"] / 4000.0,
                features["brightness"],
                features["roughness"] / 10.0,  # Normalized roughness
                features["warmth"] / 5.0,  # Normalized warmth
            ])
            
            # Energy and dynamics
            embedding_parts.extend([
                features["energy_mean"],
                features["energy_std"],
                features["dynamic_range"],
                features["zcr_mean"],
            ])
            
            # MFCC features (first 8 coefficients for dimensionality)
            for i in range(min(8, self.n_mfcc)):
                mfcc_mean = features["mfcc"][f"mfcc_{i}"]["mean"]
                embedding_parts.append(mfcc_mean / 50.0)  # Normalized MFCC
            
            # Chroma features (all 12 semitones)
            embedding_parts.extend(features["chroma_mean"])
            
            # Tonnetz features (harmonic content)
            embedding_parts.extend(features["tonnetz_mean"])
            
            # Spectral contrast (first 4 bands)
            embedding_parts.extend(features["spectral_contrast_mean"][:4])
            
            # Mel features (statistical summary of first 16 mel bands)
            mel_summary = features["mel_mean"][:16]
            embedding_parts.extend(mel_summary)
            
            # Key and tonal features
            embedding_parts.extend([
                features["key_strength"],
                features["tempo_stability"] / 100.0,  # Normalized tempo stability
            ])
            
            # Ensure we have a fixed size (pad or truncate if necessary)
            target_size = 128
            if len(embedding_parts) > target_size:
                embedding_parts = embedding_parts[:target_size]
            elif len(embedding_parts) < target_size:
                embedding_parts.extend([0.0] * (target_size - len(embedding_parts)))
            
            return np.array(embedding_parts, dtype=np.float32)
            
        except Exception as e:
            logger.error(f"Failed to create embedding vector: {e}")
            # Return zero vector as fallback
            return np.zeros(128, dtype=np.float32)

    def _create_embedding_vector(self, features: Dict) -> np.ndarray:
        """
        Create a fixed-size embedding vector from extracted features (legacy method)
        """
        # Combine various features into a single vector
        embedding_parts = [
            features["tempo"] / 200.0,  # Normalize tempo
            features["spectral_centroid_mean"] / 8000.0,  # Normalize spectral centroid
            features["spectral_rolloff_mean"] / 16000.0,  # Normalize spectral rolloff
            features["zcr_mean"],
            features["energy_mean"],
        ]
        
        # Add MFCC means (normalized)
        for i in range(self.n_mfcc):
            mfcc_mean = features["mfcc"][f"mfcc_{i}"]["mean"]
            embedding_parts.append(mfcc_mean / 50.0)  # Rough normalization
        
        # Add chroma features
        embedding_parts.extend(features["chroma_mean"])
        
        return np.array(embedding_parts, dtype=np.float32)
    
    async def analyze_mood(self, audio_path: str) -> Dict:
        """
        Analyze mood and emotional content of audio with enhanced algorithms
        """
        try:
            features = await self.extract_features(audio_path)
            
            # Enhanced mood detection using multiple features
            tempo = features["tempo"]
            energy = features["energy_mean"]
            valence = self._estimate_enhanced_valence(features)
            arousal = self._estimate_arousal(features)
            
            # Multi-dimensional mood classification
            mood_mapping = self._classify_mood_advanced(tempo, energy, valence, arousal)
            
            return {
                "mood": mood_mapping["primary_mood"],
                "mood_confidence": mood_mapping["confidence"],
                "secondary_mood": mood_mapping["secondary_mood"],
                "energy_level": float(energy),
                "valence": valence,
                "arousal": arousal,
                "tempo_category": self._categorize_tempo(tempo),
                "danceability": self._calculate_danceability(features),
                "emotional_intensity": self._calculate_emotional_intensity(features)
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze mood: {e}")
            raise Exception(f"Failed to analyze mood: {str(e)}")

    def _classify_mood_advanced(self, tempo: float, energy: float, valence: float, arousal: float) -> Dict:
        """Advanced mood classification using multiple dimensions"""
        moods = []
        
        # Define mood regions in valence-arousal space
        if valence > 0.6 and arousal > 0.6:
            moods.append(("excited", 0.9))
            moods.append(("happy", 0.8))
        elif valence > 0.6 and arousal < 0.4:
            moods.append(("peaceful", 0.85))
            moods.append(("content", 0.7))
        elif valence < 0.4 and arousal > 0.6:
            moods.append(("angry", 0.8))
            moods.append(("tense", 0.7))
        elif valence < 0.4 and arousal < 0.4:
            moods.append(("sad", 0.85))
            moods.append(("melancholic", 0.75))
        else:
            moods.append(("neutral", 0.6))
        
        # Adjust based on tempo
        if tempo > 140:
            moods.append(("energetic", 0.8))
        elif tempo < 70:
            moods.append(("calm", 0.8))
        
        # Sort by confidence and return top moods
        moods.sort(key=lambda x: x[1], reverse=True)
        
        return {
            "primary_mood": moods[0][0] if moods else "neutral",
            "confidence": moods[0][1] if moods else 0.5,
            "secondary_mood": moods[1][0] if len(moods) > 1 else None
        }

    def _estimate_enhanced_valence(self, features: Dict) -> float:
        """Enhanced valence estimation using multiple audio features"""
        try:
            # Multiple factors contributing to valence
            tempo_factor = min(features["tempo"] / 120.0, 1.5) * 0.3
            energy_factor = features["energy_mean"] * 0.3
            brightness_factor = features["brightness"] * 0.2
            key_factor = self._get_key_valence(features["key"]) * 0.1
            warmth_factor = (1.0 / (features["warmth"] + 1.0)) * 0.1  # Inverse warmth for brightness
            
            valence = tempo_factor + energy_factor + brightness_factor + key_factor + warmth_factor
            return float(min(max(valence, 0.0), 1.0))
            
        except Exception:
            return 0.5

    def _estimate_arousal(self, features: Dict) -> float:
        """Estimate arousal (activation) level of the audio"""
        try:
            # Arousal factors
            tempo_arousal = min(features["tempo"] / 150.0, 1.0) * 0.4
            energy_arousal = features["energy_mean"] * 0.3
            dynamic_arousal = features["dynamic_range"] * 0.2
            roughness_arousal = min(features["roughness"] / 5.0, 1.0) * 0.1
            
            arousal = tempo_arousal + energy_arousal + dynamic_arousal + roughness_arousal
            return float(min(max(arousal, 0.0), 1.0))
            
        except Exception:
            return 0.5

    def _get_key_valence(self, key: str) -> float:
        """Get valence score for musical key (major keys tend to be more positive)"""
        major_keys = {'C': 0.7, 'G': 0.8, 'D': 0.8, 'A': 0.7, 'E': 0.6, 'F': 0.6}
        minor_keys = {'A': 0.3, 'E': 0.2, 'B': 0.3, 'F#': 0.4, 'C#': 0.3, 'G#': 0.2}
        
        # Simple heuristic: assume major if not explicitly identified as minor
        return major_keys.get(key, 0.5)

    def _categorize_tempo(self, tempo: float) -> str:
        """Categorize tempo into descriptive categories"""
        if tempo < 60:
            return "very_slow"
        elif tempo < 80:
            return "slow"
        elif tempo < 100:
            return "moderate"
        elif tempo < 120:
            return "medium"
        elif tempo < 140:
            return "fast"
        else:
            return "very_fast"

    def _calculate_danceability(self, features: Dict) -> float:
        """Calculate danceability score based on rhythm and energy"""
        try:
            tempo_dance = 1.0 if 90 <= features["tempo"] <= 140 else max(0.3, 1.0 - abs(features["tempo"] - 115) / 100)
            energy_dance = features["energy_mean"]
            beat_dance = min(features["beat_density"] / 5.0, 1.0)
            
            danceability = (tempo_dance * 0.4 + energy_dance * 0.4 + beat_dance * 0.2)
            return float(min(max(danceability, 0.0), 1.0))
            
        except Exception:
            return 0.5

    def _calculate_emotional_intensity(self, features: Dict) -> float:
        """Calculate overall emotional intensity"""
        try:
            dynamic_intensity = features["dynamic_range"]
            energy_intensity = features["energy_mean"]
            tempo_intensity = min(abs(features["tempo"] - 100) / 100.0, 1.0)
            
            intensity = (dynamic_intensity * 0.4 + energy_intensity * 0.4 + tempo_intensity * 0.2)
            return float(min(max(intensity, 0.0), 1.0))
            
        except Exception:
            return 0.5
    
    async def convert_audio_format(self, input_path: str, output_path: str, target_format: str = "wav") -> str:
        """
        Convert audio to target format with enhanced options
        """
        try:
            y, sr = librosa.load(input_path)
            
            # Apply basic audio enhancement
            if len(y) > sr * 0.1:  # Only if audio is longer than 0.1 seconds
                # Normalize audio
                y = librosa.util.normalize(y)
                
                # Optional: Apply gentle noise reduction
                y = self._apply_noise_reduction(y, sr)
            
            # Save with appropriate settings
            if target_format.lower() == "wav":
                sf.write(output_path, y, sr, format='WAV', subtype='PCM_16')
            elif target_format.lower() == "flac":
                sf.write(output_path, y, sr, format='FLAC')
            else:
                sf.write(output_path, y, sr, format=target_format.upper())
            
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to convert audio format: {e}")
            raise Exception(f"Failed to convert audio format: {str(e)}")

    def _apply_noise_reduction(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Apply basic noise reduction"""
        try:
            # Simple spectral gating for noise reduction
            stft = librosa.stft(y)
            magnitude = np.abs(stft)
            
            # Estimate noise floor
            noise_floor = np.percentile(magnitude, 10)
            
            # Apply gentle gating
            mask = magnitude > (noise_floor * 1.5)
            stft_cleaned = stft * mask
            
            # Reconstruct audio
            y_cleaned = librosa.istft(stft_cleaned)
            return y_cleaned
            
        except Exception:
            return y  # Return original if noise reduction fails

    async def extract_audio_segments(self, audio_path: str, segment_duration: float = 30.0) -> List[Dict]:
        """
        Extract features from audio segments for long files
        """
        try:
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            duration = len(y) / sr
            
            if duration <= segment_duration:
                # File is short enough, process as single segment
                features = await self.extract_features(audio_path)
                return [{"start_time": 0.0, "end_time": duration, "features": features}]
            
            segments = []
            segment_samples = int(segment_duration * sr)
            
            for start_sample in range(0, len(y), segment_samples):
                end_sample = min(start_sample + segment_samples, len(y))
                segment_y = y[start_sample:end_sample]
                
                if len(segment_y) < sr * 0.5:  # Skip segments shorter than 0.5 seconds
                    continue
                
                # Save temporary segment
                temp_path = f"temp_segment_{start_sample}_{end_sample}.wav"
                sf.write(temp_path, segment_y, sr)
                
                try:
                    # Extract features for segment
                    segment_features = await self.extract_features(temp_path)
                    
                    segments.append({
                        "start_time": start_sample / sr,
                        "end_time": end_sample / sr,
                        "features": segment_features
                    })
                    
                finally:
                    # Clean up temporary file
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
            
            return segments
            
        except Exception as e:
            logger.error(f"Failed to extract audio segments: {e}")
            raise Exception(f"Failed to extract audio segments: {str(e)}")

    async def compare_audio_similarity(self, audio_path1: str, audio_path2: str) -> Dict:
        """
        Compare similarity between two audio files
        """
        try:
            features1 = await self.extract_features(audio_path1)
            features2 = await self.extract_features(audio_path2)
            
            # Calculate different types of similarity
            similarity_scores = {}
            
            # Embedding similarity (cosine similarity)
            emb1 = features1["embeddings"]
            emb2 = features2["embeddings"]
            cosine_sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            similarity_scores["embedding_similarity"] = float(cosine_sim)
            
            # Tempo similarity
            tempo_diff = abs(features1["tempo"] - features2["tempo"]) / max(features1["tempo"], features2["tempo"])
            similarity_scores["tempo_similarity"] = float(1.0 - tempo_diff)
            
            # Key similarity
            key_similarity = 1.0 if features1["key"] == features2["key"] else 0.0
            similarity_scores["key_similarity"] = key_similarity
            
            # Energy similarity
            energy_diff = abs(features1["energy_mean"] - features2["energy_mean"])
            similarity_scores["energy_similarity"] = float(1.0 - energy_diff)
            
            # Overall weighted similarity
            overall_similarity = (
                similarity_scores["embedding_similarity"] * 0.5 +
                similarity_scores["tempo_similarity"] * 0.2 +
                similarity_scores["key_similarity"] * 0.2 +
                similarity_scores["energy_similarity"] * 0.1
            )
            similarity_scores["overall_similarity"] = float(overall_similarity)
            
            return similarity_scores
            
        except Exception as e:
            logger.error(f"Failed to compare audio similarity: {e}")
            raise Exception(f"Failed to compare audio similarity: {str(e)}")

    def get_processor_info(self) -> Dict:
        """
        Get comprehensive information about the audio processor
        """
        return {
            "sample_rate": self.sample_rate,
            "n_mfcc": self.n_mfcc,
            "n_fft": self.n_fft,
            "hop_length": self.hop_length,
            "feature_config": self.feature_config,
            "supported_formats": ["wav", "mp3", "flac", "ogg", "m4a", "aac"],
            "embedding_dimensions": 128,
            "features_extracted": [
                "tempo", "energy", "spectral_features", "mfcc", "chroma",
                "tonnetz", "spectral_contrast", "mel_spectrogram", "mood_features"
            ]
        }
