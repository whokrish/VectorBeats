import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Crop, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'

interface ImageUploadProps {
  onUpload: (file: File, results: any[], searchQuery?: string) => void
  isLoading: boolean
  onLoadingChange: (loading: boolean) => void
}

interface ImagePreview {
  file: File
  url: string
  analysis?: {
    dimensions: [number, number]
    brightness: number
    contrast: number
    dominant_colors: [number, number, number][]
  }
}

export default function ImageUpload({ onUpload, isLoading, onLoadingChange }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Supported image formats
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const validateFile = useCallback((file: File): string | null => {
    if (!supportedFormats.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)'
    }
    
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB'
    }
    
    return null
  }, [])

  const processImage = useCallback(async (file: File) => {
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    setProcessingStage('Preparing image...')
    onLoadingChange(true)

    try {
      // Create preview URL
      const url = URL.createObjectURL(file)
      
      // Basic image analysis (simplified)
      const img = new Image()
      img.onload = () => {
        const analysis = {
          dimensions: [img.width, img.height] as [number, number],
          brightness: 0.5, // Would be calculated in real implementation
          contrast: 0.6,   // Would be calculated in real implementation
          dominant_colors: [[120, 80, 150], [200, 150, 100]] as [number, number, number][]
        }
        
        setImagePreview({ file, url, analysis })
        setUploadProgress(30)
      }
      img.src = url

      // Upload image to backend and get music results directly
      setProcessingStage('Uploading and analyzing image...')
      setUploadProgress(60)
      
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`)
      }
      
      const result = await response.json()
      setUploadProgress(100)
      setProcessingStage('Complete!')
      setSuccess(true)
      
      // Check if we got results
      const tracks = result.data?.musicResults?.results || []
      if (tracks.length === 0) {
        setError('No music matches found for this image. Try a different image with clearer mood or atmosphere.')
        return
      }
      
      // Show success message with additional context
      const isVectorSearch = result.data?.musicResults?.search_metadata?.vector_similarity !== false
      const actualQuery = result.data?.musicResults?.search_metadata?.actual_query || 'Image-based search'
      
      if (!isVectorSearch) {
        setProcessingStage('Using music recommendations - AI analysis unavailable')
      }
      
      // Call onUpload with the search results and actual query
      onUpload(file, tracks, actualQuery)
      
    } catch (err) {
      console.error('Image processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process image')
      setUploadProgress(0)
      setProcessingStage('')
    } finally {
      onLoadingChange(false)
    }
  }, [onUpload, onLoadingChange])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const file = files[0]
    const validationError = validateFile(file)
    
    if (validationError) {
      setError(validationError)
      return
    }

    processImage(file)
  }, [validateFile, processImage])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const validationError = validateFile(file)
    
    if (validationError) {
      setError(validationError)
      return
    }

    processImage(file)
  }, [validateFile, processImage])

  const clearImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url)
    }
    setImagePreview(null)
    setUploadProgress(0)
    setError(null)
    setSuccess(false)
    setProcessingStage('')
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [imagePreview])

  const enhanceImage = useCallback(() => {
    // Image enhancement functionality would go here
    console.log('Enhance image feature - to be implemented')
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!imagePreview ? (
        /* Upload Zone */
        <div
          ref={dropZoneRef}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? 'border-purple-400 bg-purple-500/10 scale-105'
              : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl"></div>
          
          <div className="relative space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className={`relative bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 transition-transform duration-300 ${
                  dragActive ? 'scale-110' : ''
                }`}>
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">
                Drop your image here, or click to browse
              </h3>
              <p className="text-gray-300">
                Support for JPEG, PNG, WebP, and GIF files up to 10MB
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-400">
              {supportedFormats.map((format, index) => (
                <span key={index} className="px-2 py-1 bg-white/10 rounded-md">
                  {format.split('/')[1].toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={supportedFormats.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        /* Image Preview & Analysis */
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
            <div className="relative">
              <img
                src={imagePreview.url}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
              
              {/* Overlay Controls */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={enhanceImage}
                  className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/70 transition-all duration-200"
                  title="Enhance Image"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => console.log('Crop image')}
                  className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/70 transition-all duration-200"
                  title="Crop Image"
                >
                  <Crop className="h-4 w-4" />
                </button>
                
                <button
                  onClick={clearImage}
                  className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-red-500/70 transition-all duration-200"
                  title="Remove Image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Image Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {imagePreview.file.name}
                </h4>
                <span className="text-sm text-gray-300">
                  {(imagePreview.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              
              {imagePreview.analysis && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Dimensions:</span>
                    <span className="text-white ml-2">
                      {imagePreview.analysis.dimensions[0]} × {imagePreview.analysis.dimensions[1]}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Brightness:</span>
                    <span className="text-white ml-2">
                      {Math.round(imagePreview.analysis.brightness * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Processing Progress */}
          {(isLoading || uploadProgress > 0) && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Processing Image</span>
                <span className="text-sm text-gray-300">{uploadProgress}%</span>
              </div>
              
              <div className="w-full bg-black/30 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              
              {processingStage && (
                <p className="text-sm text-gray-400">{processingStage}</p>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => processImage(imagePreview.file)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Finding Music...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Find Similar Music
                </>
              )}
            </button>
            
            <button
              onClick={clearImage}
              className="px-6 py-3 border border-white/30 hover:border-white/50 text-white rounded-lg transition-all duration-300 hover:bg-white/10"
            >
              Choose Different Image
            </button>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300">Image processed successfully! Finding music matches...</span>
        </div>
      )}
      
      {/* Tips */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <h4 className="font-semibold text-white mb-2">💡 Tips for better results:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Clear, high-quality images work best</li>
          <li>• Photos with strong mood or atmosphere are ideal</li>
          <li>• Try landscape photos, artwork, or mood-setting images</li>
          <li>• Avoid blurry or very dark images</li>
        </ul>
      </div>
    </div>
  )
}
