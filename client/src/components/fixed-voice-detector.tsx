import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FixedVoiceDetectorProps {
  onDistressDetected: (confidence: number, keywords: string[]) => void;
  onEmergencyTriggered?: () => void;
  onVoiceSOSDetected?: (triggerType: string, scenario: string, detectedText: string) => void;
  emergencyMode?: boolean;
}

export default function FixedVoiceDetector({ 
  onDistressDetected, 
  onEmergencyTriggered,
  onVoiceSOSDetected,
  emergencyMode = false 
}: FixedVoiceDetectorProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastDetection, setLastDetection] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Distress keywords and phrases
  const distressKeywords = [
    'help', 'emergency', 'danger', 'scared', 'threat', 'attack',
    'unsafe', 'kidnap', 'assault', 'hurt', 'pain', 'afraid',
    'follow', 'strange', 'suspicious', 'call police', 'save me',
    'get away', 'leave me alone', 'stop', 'no', 'please help'
  ];

  const checkPermissions = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Permission error:', err);
      setError(`Microphone access failed: ${err.message}. Please allow microphone access and try again.`);
      return false;
    }
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = (finalTranscript + interimTranscript).toLowerCase();
      setTranscript(currentTranscript);

      // Check for distress keywords
      const detectedKeywords = distressKeywords.filter(keyword => 
        currentTranscript.includes(keyword.toLowerCase())
      );

      if (detectedKeywords.length > 0) {
        const confidence = Math.min(detectedKeywords.length * 0.3 + 0.4, 1.0);
        console.log('Distress detected:', detectedKeywords, 'Confidence:', confidence);
        
        setLastDetection(`Detected: ${detectedKeywords.join(', ')}`);
        onDistressDetected(confidence, detectedKeywords);
        
        if (confidence > 0.7) {
          // Trigger emergency protocol with photo capture and streaming
          if (onVoiceSOSDetected) {
            onVoiceSOSDetected(
              'voice_detection',
              `Voice distress detected - Keywords: ${detectedKeywords.join(', ')}`,
              currentTranscript
            );
          }
          
          if (onEmergencyTriggered) {
            onEmergencyTriggered();
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access not allowed. Please enable microphone permissions and try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection.');
      } else if (event.error === 'service-not-allowed') {
        setError('Speech service not available. Please try again or check your browser settings.');
      } else {
        setError(`Recognition error: ${event.error}. Please try again.`);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      // Auto-restart if we were listening and no error occurred
      if (recognitionRef.current && !error) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.log('Recognition restart failed:', err);
            }
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [onDistressDetected, onEmergencyTriggered, error]);

  const startListening = useCallback(async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    const isInitialized = initializeSpeechRecognition();
    if (!isInitialized) return;

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Start recognition error:', err);
      setError(`Failed to start listening: ${err.message}`);
    }
  }, [checkPermissions, initializeSpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <Card className={`${emergencyMode ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isListening ? <Mic className="w-5 h-5 text-green-500" /> : <MicOff className="w-5 h-5" />}
          Voice Distress Detection
        </CardTitle>
        <CardDescription>
          Automatically detects emergency keywords and triggers SOS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!permissionGranted && !error && (
          <Alert>
            <AlertDescription>
              Microphone access is required for voice detection. Click "Start Listening" to grant permissions.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            className={`${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'}`}
            disabled={!!error && error.includes('not supported')}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Listening
              </>
            )}
          </Button>
          
          {isListening && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              Listening for distress signals...
            </div>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Speech:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{transcript}</p>
          </div>
        )}

        {lastDetection && (
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Last Detection:</p>
            <p className="text-sm text-orange-600 dark:text-orange-400">{lastDetection}</p>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Monitored keywords:</p>
          <p>{distressKeywords.slice(0, 10).join(', ')}...</p>
        </div>
      </CardContent>
    </Card>
  );
}