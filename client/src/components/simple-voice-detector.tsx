import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, AlertTriangle, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface SimpleVoiceDetectorProps {
  onDistressDetected?: (keyword: string) => void;
  onEmergencyTriggered?: () => void;
}

const DISTRESS_KEYWORDS = [
  'help', 'emergency', 'police', 'fire', 'ambulance', 'rescue',
  'attack', 'assault', 'danger', 'threat', 'scared', 'afraid',
  'bachao', 'madad', 'save madi', 'help madi'
];

export default function SimpleVoiceDetector({ 
  onDistressDetected, 
  onEmergencyTriggered 
}: SimpleVoiceDetectorProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastDetected, setLastDetected] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Emergency alert mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: {
      triggerType: string;
      keyword: string;
      location: { lat: number; lng: number; address: string };
    }) => {
      const response = await fetch('/api/emergency-alert/voice-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          confidence: 0.9
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger emergency alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Emergency Alert Sent",
        description: "Emergency contacts have been notified automatically",
        variant: "destructive",
      });
      onEmergencyTriggered?.();
    },
    onError: () => {
      toast({
        title: "Alert Failed",
        description: "Could not send emergency alert via voice detection",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = () => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(isSupported);
    
    if (!isSupported) {
      toast({
        title: "Voice Detection Unavailable",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use voice detection",
        variant: "destructive",
      });
      setHasPermission(false);
      return false;
    }
  };

  const startListening = async () => {
    if (!isSupported) return;
    
    if (!hasPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        console.log('Voice detection started');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Voice detection ended');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast({
            title: "Permission Denied",
            description: "Please allow microphone access and try again",
            variant: "destructive",
          });
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
          .toLowerCase()
          .trim();

        console.log('Voice input:', transcript);
        
        // Check for distress keywords
        const detectedKeyword = DISTRESS_KEYWORDS.find(keyword => 
          transcript.includes(keyword.toLowerCase())
        );

        if (detectedKeyword) {
          setLastDetected(detectedKeyword);
          onDistressDetected?.(detectedKeyword);
          
          console.log(`Distress keyword detected: "${detectedKeyword}"`);
          
          // Trigger emergency alert
          navigator.geolocation.getCurrentPosition(
            (position) => {
              emergencyMutation.mutate({
                triggerType: 'voice_distress',
                keyword: detectedKeyword,
                location: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  address: `Voice Alert Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
                }
              });
            },
            () => {
              // Trigger without location if geolocation fails
              emergencyMutation.mutate({
                triggerType: 'voice_distress',
                keyword: detectedKeyword,
                location: {
                  lat: 0,
                  lng: 0,
                  address: 'Location unavailable'
                }
              });
            }
          );
          
          // Stop listening after detection
          setTimeout(() => {
            recognition.stop();
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      toast({
        title: "Voice Detection Failed",
        description: "Could not start voice recognition",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  if (!isSupported) {
    return (
      <Card className="w-full border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-500">
            <Volume2 className="w-5 h-5" />
            Voice Detection Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Your browser doesn't support voice recognition. Please use the manual emergency button.
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
          Voice Emergency Detection
          {isListening && (
            <Badge variant="destructive" className="ml-auto animate-pulse">
              Listening
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "outline"}
            size="lg"
            disabled={emergencyMutation.isPending}
            className="w-full"
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Voice Detection
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Detection
              </>
            )}
          </Button>
        </div>

        {lastDetected && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              Last detected: <strong>"{lastDetected}"</strong>
            </span>
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Monitored keywords:</strong></p>
          <p>Help, Emergency, Police, Attack, Danger, बचाओ (bachao), मदद (madad), Save madi</p>
        </div>

        {isListening && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            Voice detection is active. Say any distress keyword to trigger emergency alert.
          </div>
        )}
      </CardContent>
    </Card>
  );
}