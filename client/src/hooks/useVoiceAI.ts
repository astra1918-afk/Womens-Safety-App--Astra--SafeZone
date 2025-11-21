import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

// Voice AI Hook with Stanford CoreNLP, Assembly AI, and Llama 2 integration
export function useVoiceAI() {
  const [isListening, setIsListening] = useState(false);
  const [distressLevel, setDistressLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetection, setLastDetection] = useState<VoiceDetection | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Initialize voice AI system
  useEffect(() => {
    initializeVoiceAI();
    return () => {
      stopListening();
    };
  }, []);

  const initializeVoiceAI = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      setPermissionGranted(true);
      streamRef.current = stream;
      
      // Initialize Audio Context for real-time processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      console.log('Voice AI system initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize voice AI:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access for voice emergency detection",
        variant: "destructive"
      });
    }
  };

  // Start continuous voice monitoring
  const startListening = useCallback(async () => {
    if (!permissionGranted || !streamRef.current || !audioContextRef.current) {
      await initializeVoiceAI();
      return;
    }

    if (isListening) return;

    try {
      setIsListening(true);
      
      // Setup audio processing pipeline
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      let audioBuffer: number[] = [];
      let lastProcessTime = 0;
      
      processorRef.current.onaudioprocess = async (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioBuffer.push(...Array.from(inputData));
        
        // Process audio every 3 seconds for efficiency
        const now = Date.now();
        if (now - lastProcessTime > 3000 && audioBuffer.length > 16000) {
          lastProcessTime = now;
          
          // Convert to ArrayBuffer for processing
          const audioArrayBuffer = new Float32Array(audioBuffer).buffer;
          audioBuffer = []; // Clear buffer
          
          // Process audio through AI pipeline
          await processAudioChunk(audioArrayBuffer);
        }
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Voice monitoring started - listening for distress signals...');
      
    } catch (error) {
      console.error('Failed to start voice monitoring:', error);
      setIsListening(false);
    }
  }, [permissionGranted, isListening]);

  // Stop voice monitoring
  const stopListening = useCallback(() => {
    if (!isListening) return;
    
    setIsListening(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    console.log('Voice monitoring stopped');
  }, [isListening]);

  // Process audio chunk through AI pipeline
  const processAudioChunk = async (audioBuffer: ArrayBuffer): Promise<void> => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Send audio to voice AI service
      const response = await fetch('/api/voice-ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: audioBuffer
      });
      
      if (!response.ok) {
        throw new Error('Voice processing failed');
      }
      
      const result: VoiceAnalysisResult = await response.json();
      
      // Update distress level
      setDistressLevel(result.confidence);
      
      // Handle emergency detection
      if (result.isEmergency && result.analysis) {
        const detection: VoiceDetection = {
          timestamp: Date.now(),
          transcription: result.transcription || '',
          confidence: result.confidence,
          detectedKeywords: result.analysis.detectedKeywords,
          language: result.analysis.language,
          stressLevel: result.analysis.stressIndicators.stressLevel
        };
        
        setLastDetection(detection);
        
        // Trigger emergency response
        await handleEmergencyDetection(detection);
      }
      
    } catch (error) {
      console.error('Voice processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle emergency detection
  const handleEmergencyDetection = async (detection: VoiceDetection): Promise<void> => {
    console.log('Emergency detected via voice AI:', detection);
    
    try {
      // Show immediate alert to user
      toast({
        title: "Emergency Detected!",
        description: `Voice AI detected: "${detection.detectedKeywords.join(', ')}" - Triggering emergency response...`,
        variant: "destructive"
      });
      
      // Get current location
      const location = await getCurrentLocation();
      
      // Trigger emergency alert
      const response = await fetch('/api/emergency-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggerType: 'voice_ai',
          latitude: location.latitude,
          longitude: location.longitude,
          address: `Voice AI Detection: ${detection.transcription}`,
          audioRecordingUrl: JSON.stringify({
            transcription: detection.transcription,
            confidence: detection.confidence,
            detectedKeywords: detection.detectedKeywords,
            stressLevel: detection.stressLevel,
            analysisTimestamp: detection.timestamp
          })
        })
      });
      
      if (response.ok) {
        const alert = await response.json();
        console.log('Emergency alert created:', alert.id);
        
        // Continue monitoring for escalation
        setDistressLevel(1.0);
        
      } else {
        throw new Error('Failed to create emergency alert');
      }
      
    } catch (error) {
      console.error('Failed to handle emergency detection:', error);
      toast({
        title: "Emergency Alert Failed",
        description: "Could not trigger emergency response. Please use manual SOS button.",
        variant: "destructive"
      });
    }
  };

  // Get current GPS location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to approximate location
          resolve({
            latitude: 13.0348,
            longitude: 77.5624
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    });
  };

  // Test voice detection with sample phrases
  const testDetection = async (testPhrase: string): Promise<void> => {
    console.log(`Testing voice detection with phrase: "${testPhrase}"`);
    
    const testDetection: VoiceDetection = {
      timestamp: Date.now(),
      transcription: testPhrase,
      confidence: 0.95,
      detectedKeywords: [testPhrase.toLowerCase()],
      language: testPhrase.includes('bachao') ? 'hindi' : 'english',
      stressLevel: 0.8
    };
    
    setLastDetection(testDetection);
    await handleEmergencyDetection(testDetection);
  };

  // Get voice AI status
  const getStatus = (): VoiceAIStatus => {
    return {
      isListening,
      isProcessing,
      permissionGranted,
      distressLevel,
      lastDetection: lastDetection?.timestamp || null,
      supportedLanguages: ['hindi', 'english']
    };
  };

  return {
    isListening,
    isProcessing,
    distressLevel,
    lastDetection,
    permissionGranted,
    startListening,
    stopListening,
    testDetection,
    getStatus
  };
}

// Type definitions
export interface VoiceDetection {
  timestamp: number;
  transcription: string;
  confidence: number;
  detectedKeywords: string[];
  language: string;
  stressLevel: number;
}

export interface VoiceAnalysisResult {
  isEmergency: boolean;
  confidence: number;
  analysis: {
    detectedKeywords: string[];
    language: string;
    stressIndicators: {
      stressLevel: number;
      indicators: string[];
    };
  } | null;
  transcription?: string;
}

export interface VoiceAIStatus {
  isListening: boolean;
  isProcessing: boolean;
  permissionGranted: boolean;
  distressLevel: number;
  lastDetection: number | null;
  supportedLanguages: string[];
}