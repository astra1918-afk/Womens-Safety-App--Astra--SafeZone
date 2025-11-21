import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

// TypeScript support for Web Speech API
interface CustomSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: any) => void) | null;
  onresult: ((ev: any) => void) | null;
}

interface VoiceDistressDetectorProps {
  onDistressDetected?: (keyword: string, confidence: number) => void;
  onEmergencyTriggered?: () => void;
}

// Distress keywords with different severity levels
const DISTRESS_KEYWORDS = {
  emergency: ['help', 'emergency', 'police', 'fire', 'ambulance', 'rescue'],
  violence: ['attack', 'assault', 'violence', 'hurt', 'hitting', 'beating'],
  medical: ['heart attack', 'chest pain', 'cant breathe', 'bleeding', 'unconscious'],
  general: ['danger', 'threat', 'scared', 'afraid', 'stalking', 'following'],
  hindi: ['bachao', 'madad', 'emergency', 'police bulao', 'help karo'],
  kannada: ['save madi', 'help madi', 'police call madi', 'emergency']
};

const ALL_KEYWORDS = Object.values(DISTRESS_KEYWORDS).flat();

export default function VoiceDistressDetector({ 
  onDistressDetected, 
  onEmergencyTriggered 
}: VoiceDistressDetectorProps) {
  const [isListening, setIsListening] = useState(false);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [lastDetectedKeyword, setLastDetectedKeyword] = useState<string | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentTranscripts, setRecentTranscripts] = useState<string[]>([]);
  
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Emergency alert mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: {
      triggerType: string;
      keyword: string;
      confidence: number;
      location: { lat: number; lng: number; address: string };
    }) => {
      const response = await fetch('/api/emergency-alert/voice-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger emergency alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Emergency Alert Triggered",
        description: "Voice distress detected. Emergency contacts notified.",
        variant: "destructive",
      });
      onEmergencyTriggered?.();
    },
    onError: () => {
      toast({
        title: "Alert Failed",
        description: "Could not send emergency alert. Please try manual SOS.",
        variant: "destructive",
      });
    }
  });

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsBrowserSupported(false);
      toast({
        title: "Voice Detection Unavailable",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass() as CustomSpeechRecognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice distress detection started');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice distress detection stopped');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access for voice distress detection.",
          variant: "destructive",
        });
      }
    };

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results as any);
      const transcript = results
        .map((result: any) => result[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim();

      if (transcript) {
        setRecentTranscripts(prev => [...prev.slice(-4), transcript]);
        analyzeForDistress(transcript, event.results[event.results.length - 1][0].confidence);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

  // Analyze transcript for distress keywords
  const analyzeForDistress = (transcript: string, confidence: number) => {
    setIsProcessing(true);
    
    // Check for distress keywords
    const detectedKeywords = ALL_KEYWORDS.filter(keyword => 
      transcript.includes(keyword.toLowerCase())
    );

    if (detectedKeywords.length > 0) {
      const keyword = detectedKeywords[0];
      setLastDetectedKeyword(keyword);
      setDetectionCount(prev => prev + 1);
      
      console.log(`Distress keyword detected: "${keyword}" with confidence: ${confidence}`);
      
      onDistressDetected?.(keyword, confidence);
      
      // High confidence or multiple detections trigger emergency
      if (confidence > 0.8 || detectionCount >= 2) {
        triggerEmergencyAlert(keyword, confidence);
      } else {
        // Show warning for lower confidence
        toast({
          title: "Potential Distress Detected",
          description: `Heard: "${keyword}". Say it again clearly to trigger emergency alert.`,
          variant: "destructive",
        });
      }
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  };

  // Trigger emergency alert
  const triggerEmergencyAlert = async (keyword: string, confidence: number) => {
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      emergencyMutation.mutate({
        triggerType: 'voice_distress',
        keyword,
        confidence,
        location: {
          lat: latitude,
          lng: longitude,
          address: `Voice Distress Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }
      });
      
      // Reset detection count after triggering
      setDetectionCount(0);
      
    } catch (error) {
      console.error('Location error:', error);
      
      // Trigger without location if location fails
      emergencyMutation.mutate({
        triggerType: 'voice_distress',
        keyword,
        confidence,
        location: {
          lat: 0,
          lng: 0,
          address: 'Location unavailable'
        }
      });
    }
  };

  // Start/stop voice detection
  const toggleListening = () => {
    if (!recognitionRef.current || !isBrowserSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
      setDetectionCount(0);
      setLastDetectedKeyword(null);
    } else {
      recognitionRef.current.start();
    }
  };

  if (!isBrowserSupported) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5 text-gray-400" />
            Voice Distress Detection Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Your browser doesn't support voice recognition. Please use manual emergency button.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-pink-600" />
          Voice Distress Detection
          {isListening && (
            <Badge variant="destructive" className="ml-auto">
              Listening
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={toggleListening}
            variant={isListening ? "destructive" : "outline"}
            className="flex items-center gap-2"
            disabled={emergencyMutation.isPending}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop Detection
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Detection
              </>
            )}
          </Button>
          
          {isProcessing && (
            <Badge variant="secondary">
              Processing...
            </Badge>
          )}
        </div>

        {isListening && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <strong>Monitored Keywords:</strong> Help, Emergency, Police, Attack, Danger, 
              बचाओ (bachao), मदद (madad), Save madi, Help madi
            </div>
            
            {lastDetectedKeyword && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm">
                  Last detected: <strong>"{lastDetectedKeyword}"</strong>
                  {detectionCount > 0 && ` (${detectionCount} times)`}
                </span>
              </div>
            )}

            {recentTranscripts.length > 0 && (
              <div className="text-xs text-gray-500">
                <div>Recent: {recentTranscripts[recentTranscripts.length - 1]}</div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Say distress keywords clearly. Emergency alert triggers automatically on detection.
        </div>
      </CardContent>
    </Card>
  );
}