import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Play, Pause, Square, Download, Volume2, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'

interface AudioUploadProps {
  onRecord: (audioBlob: Blob, embeddings: number[], metadata: any) => void
  isLoading: boolean
}

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  isPlaying: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  waveformData: number[]
}

export default function AudioUpload({ onRecord, isLoading }: AudioUploadProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    waveformData: []
  })
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [quality, setQuality] = useState({ signal: 0, noise: 0 })
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Convert audio blob to WAV format for better compatibility
  const convertToWav = useCallback(async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext()
      const fileReader = new FileReader()
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Convert to WAV
          const wav = audioBufferToWav(audioBuffer)
          const wavBlob = new Blob([wav], { type: 'audio/wav' })
          resolve(wavBlob)
        } catch (error) {
          reject(error)
        }
      }
      
      fileReader.onerror = () => reject(new Error('Failed to read audio file'))
      fileReader.readAsArrayBuffer(audioBlob)
    })
  }, [])

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Convert float32 audio data to int16
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return arrayBuffer
  }

  // Initialize Web Audio API
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      audioContextRef.current = new AudioContext({ sampleRate: 44100 })
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'
      })
      
      return true
    } catch (err) {
      console.error('Audio initialization failed:', err)
      setError('Microphone access denied or not available')
      return false
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    setError(null)
    setSuccess(false)
    
    const initialized = await initializeAudio()
    if (!initialized) return

    const chunks: BlobPart[] = []
    
    mediaRecorderRef.current!.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }
    
    mediaRecorderRef.current!.onstop = async () => {
      const audioBlob = new Blob(chunks, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      })
      
      // Convert to WAV format for better ML service compatibility
      let processedBlob = audioBlob
      try {
        processedBlob = await convertToWav(audioBlob)
      } catch (error) {
        console.warn('Failed to convert to WAV, using original format:', error)
      }
      
      const audioUrl = URL.createObjectURL(processedBlob)
      
      setRecordingState(prev => ({
        ...prev,
        audioBlob: processedBlob,
        audioUrl,
        isRecording: false
      }))
    }
    
    mediaRecorderRef.current!.start(100) // Collect data every 100ms
    
    setRecordingState(prev => ({
      ...prev,
      isRecording: true,
      duration: 0
    }))
    
    // Start timer and audio analysis
    intervalRef.current = setInterval(() => {
      setRecordingState(prev => ({
        ...prev,
        duration: prev.duration + 0.1
      }))
      
      // Analyze audio levels
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        setAudioLevel(average / 255)
        
        // Simple quality estimation
        const highFreq = dataArray.slice(dataArray.length * 0.7).reduce((sum, value) => sum + value, 0)
        const lowFreq = dataArray.slice(0, dataArray.length * 0.3).reduce((sum, value) => sum + value, 0)
        
        setQuality({
          signal: Math.min(average / 128, 1),
          noise: Math.max(0, (highFreq - lowFreq) / (dataArray.length * 255))
        })
      }
    }, 100)
    
    startWaveformVisualization()
  }, [initializeAudio])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop()
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    stopWaveformVisualization()
  }, [recordingState.isRecording])

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return
    
    if (recordingState.isPaused) {
      mediaRecorderRef.current.resume()
    } else {
      mediaRecorderRef.current.pause()
    }
    
    setRecordingState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }))
  }, [recordingState.isPaused])

  // Play recorded audio
  const togglePlayback = useCallback(() => {
    if (!recordingState.audioUrl) return
    
    if (!audioRef.current) {
      audioRef.current = new Audio(recordingState.audioUrl)
      audioRef.current.onended = () => {
        setRecordingState(prev => ({ ...prev, isPlaying: false }))
      }
    }
    
    if (recordingState.isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    
    setRecordingState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }))
  }, [recordingState.audioUrl, recordingState.isPlaying])

  // Waveform visualization
  const startWaveformVisualization = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    
    const ctx = canvas.getContext('2d')!
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)
      
      analyserRef.current!.getByteTimeDomainData(dataArray)
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.lineWidth = 2
      ctx.strokeStyle = '#8b5cf6'
      ctx.beginPath()
      
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = v * canvas.height / 2
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      ctx.stroke()
    }
    
    draw()
  }, [])

  const stopWaveformVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Process recorded audio
  const processAudio = useCallback(async () => {
    if (!recordingState.audioBlob) return
    
    setProcessingStage('Analyzing audio features...')
    
    try {
      // Simulate audio processing stages
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProcessingStage('Extracting melody patterns...')
      
      await new Promise(resolve => setTimeout(resolve, 800))
      setProcessingStage('Generating embeddings...')
      
      await new Promise(resolve => setTimeout(resolve, 600))
      setProcessingStage('Finding similar tracks...')
      
      // Mock embeddings and metadata
      const mockEmbeddings = Array.from({ length: 128 }, () => Math.random() * 2 - 1)
      const mockMetadata = {
        duration: recordingState.duration,
        quality: quality,
        sampleRate: 44100,
        format: 'audio/webm',
        processedAt: new Date().toISOString()
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSuccess(true)
      setProcessingStage('')
      
      onRecord(recordingState.audioBlob, mockEmbeddings, mockMetadata)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio')
      setProcessingStage('')
    }
  }, [recordingState.audioBlob, recordingState.duration, quality, onRecord])

  // Clear recording
  const clearRecording = useCallback(() => {
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl)
    }
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      waveformData: []
    })
    
    setError(null)
    setSuccess(false)
    setProcessingStage('')
    setAudioLevel(0)
    setQuality({ signal: 0, noise: 0 })
  }, [recordingState.audioUrl])

  // Download recording
  const downloadRecording = useCallback(() => {
    if (!recordingState.audioUrl) return
    
    const a = document.createElement('a')
    a.href = recordingState.audioUrl
    a.download = `recording-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [recordingState.audioUrl])

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl)
      }
      stopWaveformVisualization()
    }
  }, [recordingState.audioUrl, stopWaveformVisualization])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Recording Interface */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
        {/* Waveform Visualization */}
        <div className="mb-6">
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="w-full h-24 bg-black/20 rounded-lg border border-white/10"
          />
        </div>
        
        {/* Audio Level Indicator */}
        {recordingState.isRecording && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Volume2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Audio Level</span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-100 ${
                  audioLevel > 0.7 ? 'bg-red-500' : audioLevel > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${audioLevel * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {!recordingState.isRecording && !recordingState.audioBlob ? (
            /* Start Recording */
            <button
              onClick={startRecording}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-full p-4 transition-all duration-300 transform hover:scale-105"
            >
              <Mic className="h-8 w-8" />
            </button>
          ) : recordingState.isRecording ? (
            /* Recording Controls */
            <>
              <button
                onClick={togglePause}
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-3 transition-all duration-300"
              >
                {recordingState.isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </button>
              
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 transition-all duration-300"
              >
                <Square className="h-6 w-6" />
              </button>
            </>
          ) : (
            /* Playback Controls */
            <>
              <button
                onClick={togglePlayback}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full p-3 transition-all duration-300"
              >
                {recordingState.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              
              <button
                onClick={downloadRecording}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all duration-300"
              >
                <Download className="h-6 w-6" />
              </button>
              
              <button
                onClick={clearRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-3 transition-all duration-300"
              >
                <MicOff className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
        
        {/* Duration Display */}
        <div className="text-center">
          <div className="text-3xl font-mono text-white mb-2">
            {formatDuration(recordingState.duration)}
          </div>
          
          {recordingState.isRecording && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              {recordingState.isPaused ? 'Paused' : 'Recording...'}
            </div>
          )}
        </div>
        
        {/* Quality Indicators */}
        {recordingState.isRecording && (
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <span className="text-gray-400">Signal Quality:</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 rounded-full h-1">
                  <div
                    className="bg-green-500 h-1 rounded-full"
                    style={{ width: `${quality.signal * 100}%` }}
                  ></div>
                </div>
                <span className="text-white">{Math.round(quality.signal * 100)}%</span>
              </div>
            </div>
            
            <div>
              <span className="text-gray-400">Noise Level:</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 rounded-full h-1">
                  <div
                    className="bg-red-500 h-1 rounded-full"
                    style={{ width: `${quality.noise * 100}%` }}
                  ></div>
                </div>
                <span className="text-white">{Math.round(quality.noise * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {recordingState.audioBlob && (
        <div className="flex gap-3">
          <button
            onClick={processAudio}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Find Similar Music
              </>
            )}
          </button>
          
          <button
            onClick={clearRecording}
            className="px-6 py-3 border border-white/30 hover:border-white/50 text-white rounded-lg transition-all duration-300 hover:bg-white/10"
          >
            Record Again
          </button>
        </div>
      )}
      
      {/* Processing Progress */}
      {processingStage && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
            <span className="text-white">{processingStage}</span>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300">Audio processed successfully! Finding music matches...</span>
        </div>
      )}
      
      {/* Tips */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <h4 className="font-semibold text-white mb-2">🎤 Recording Tips:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Record in a quiet environment for best results</li>
          <li>• Hum or sing clearly for 10-30 seconds</li>
          <li>• Keep a steady volume (green level indicator)</li>
          <li>• Try humming the main melody or chorus</li>
        </ul>
      </div>
    </div>
  )
}
