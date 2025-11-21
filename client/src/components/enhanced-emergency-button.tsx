import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Phone, MapPin, Video, Camera, MessageCircle, Users, Shield, Clock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import FixedVoiceDetector from './fixed-voice-detector';
import LiveStreaming from './live-streaming';
import PhotoCapture from './photo-capture';

interface EmergencyContact {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship?: string;
  isActive: boolean;
  whatsappNumber?: string;
}

interface EmergencyAlert {
  triggerType: string;
  scenario: string;
  location: { lat: number; lng: number; address: string };
  timestamp: Date;
  streamUrl?: string;
}

export default function EnhancedEmergencyButton() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [showDirectMessaging, setShowDirectMessaging] = useState(false);
  const [emergencyMessageText, setEmergencyMessageText] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [currentAlertId, setCurrentAlertId] = useState<number | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  
  const { toast } = useToast();
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch emergency contacts
  const { data: emergencyContacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts"]
  });

  // Check for active emergency alerts on component mount
  const { data: activeAlerts = [] } = useQuery({
    queryKey: ["/api/parent/emergency-alerts", "active"],
    refetchInterval: 5000 // Check every 5 seconds
  });

  // Update emergency state based on active alerts
  useEffect(() => {
    const hasActiveAlert = activeAlerts.some((alert: any) => !alert.isResolved);
    if (hasActiveAlert && !emergencyActive) {
      const activeAlert = activeAlerts.find((alert: any) => !alert.isResolved);
      setEmergencyActive(true);
      setCurrentAlertId(activeAlert?.id || null);
      setShowLiveStream(true);
    } else if (!hasActiveAlert && emergencyActive) {
      setEmergencyActive(false);
      setCurrentAlertId(null);
      setShowLiveStream(false);
    }
  }, [activeAlerts, emergencyActive]);

  // WebSocket connection for emergency resolution
  useEffect(() => {
    if (emergencyActive && !wsRef.current) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for emergency monitoring');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'emergencyResolved' && data.alertId === currentAlertId) {
          handleEmergencyResolution();
        }
      };
      
      wsRef.current = ws;
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [emergencyActive, currentAlertId]);

  const startVideoRecording = async (): Promise<MediaRecorder | null> => {
    try {
      console.log('Requesting camera access for emergency recording...');
      
      // Request camera and microphone permissions with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { min: 640, ideal: 1280, max: 1920 }, 
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Camera stream acquired:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      // Test MIME types in order of preference
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ];
      
      let supportedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedMimeType = type;
          console.log('Using MIME type:', type);
          break;
        }
      }
      
      if (!supportedMimeType) {
        throw new Error('No supported video MIME type found');
      }
      
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 1000000, // 1 Mbps for better compatibility
        audioBitsPerSecond: 64000    // 64 kbps
      });
      
      const chunks: Blob[] = [];
      let recordingStartTime = Date.now();
      
      recorder.ondataavailable = (event) => {
        const chunkSize = event.data.size;
        console.log(`Video chunk received: ${chunkSize} bytes at ${Date.now() - recordingStartTime}ms`);
        
        if (chunkSize > 0) {
          chunks.push(event.data);
          console.log(`Total chunks collected: ${chunks.length}, Total size: ${chunks.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);
        }
      };
      
      recorder.onstop = async () => {
        const recordingDuration = Date.now() - recordingStartTime;
        console.log(`Recording stopped after ${recordingDuration}ms, chunks: ${chunks.length}`);
        
        if (chunks.length === 0) {
          console.error('CRITICAL: No video chunks captured during recording');
          toast({
            title: "Video Recording Failed",
            description: "No video data was captured",
            variant: "destructive"
          });
          return;
        }
        
        const videoBlob = new Blob(chunks, { type: supportedMimeType });
        const blobSize = videoBlob.size;
        console.log(`Final video blob: ${blobSize} bytes, type: ${supportedMimeType}`);
        
        if (blobSize === 0) {
          console.error('CRITICAL: Video blob is empty despite having chunks');
          return;
        }
        
        setRecordedVideoBlob(videoBlob);
        
        // Upload video immediately after recording stops
        if (currentAlertId && blobSize > 1000) { // At least 1KB of data
          console.log(`Uploading ${blobSize} byte video for alert:`, currentAlertId);
          
          try {
            const videoUrl = await uploadVideoRecording(currentAlertId, videoBlob);
            console.log('SUCCESS: Video uploaded to:', videoUrl);
            
            toast({
              title: "Video Uploaded",
              description: `Emergency recording saved (${Math.round(blobSize/1024)}KB)`,
              variant: "default"
            });
          } catch (uploadError) {
            console.error('Video upload failed:', uploadError);
            toast({
              title: "Upload Failed",
              description: "Could not save emergency recording",
              variant: "destructive"
            });
          }
        } else {
          console.error(`Cannot upload video - alertId: ${currentAlertId}, size: ${blobSize}`);
        }
        
        // Stop all tracks to release camera
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track:`, track.label);
        });
      };
      
      recorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        toast({
          title: "Recording Error",
          description: "Video recording encountered an error",
          variant: "destructive"
        });
      };
      
      recorder.onstart = () => {
        console.log('MediaRecorder started successfully');
        recordingStartTime = Date.now();
      };
      
      // Start recording with frequent data capture
      recorder.start(500); // Capture data every 500ms for better reliability
      setVideoRecorder(recorder);
      
      console.log('Video recording initiated with MIME type:', supportedMimeType);
      return recorder;
      
    } catch (error: any) {
      console.error('Failed to start video recording:', error);
      
      toast({
        title: "Camera Access Failed",
        description: error.message || "Could not access camera for recording",
        variant: "destructive"
      });
      
      return null;
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && videoRecorder.state === 'recording') {
      videoRecorder.stop();
      setVideoRecorder(null);
    }
  };

  const uploadVideoRecording = async (alertId: number, videoBlob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('video', videoBlob, `emergency_${alertId}_${Date.now()}.webm`);
      formData.append('alertId', alertId.toString());

      const response = await fetch('/api/emergency-video-upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload video recording');
      }

      const data = await response.json();
      return data.videoUrl;
    } catch (error) {
      console.error('Video upload error:', error);
      return null;
    }
  };

  const handleVoiceSOSDetected = async (triggerType: string, scenario: string, detectedText: string) => {
    console.log('Voice SOS detected, starting emergency protocol with video recording');
    
    // Get current location for emergency alert
    navigator.geolocation.getCurrentPosition(async (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: `Voice Detection Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
      };

      // Create emergency alert data
      const emergencyData: EmergencyAlert = {
        triggerType,
        scenario,
        location,
        timestamp: new Date(),
      };

      try {
        // Create emergency alert in backend
        const response = await fetch('/api/voice-distress-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggerType,
            scenario,
            detectedText,
            location,
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          const alertData = await response.json();
          const alertId = alertData.alertId;
          
          // Set emergency state
          setEmergencyActive(true);
          setCurrentAlertId(alertId);
          setShowLiveStream(true);
          
          // Start video recording immediately
          const recorder = await startVideoRecording();
          console.log('Voice-triggered video recording started for alert:', alertId);
          
          // Show emergency notification
          toast({
            title: "Voice SOS Detected",
            description: "Recording video and alerting contacts...",
            variant: "destructive",
          });

          // Send emergency messages to contacts
          await sendEmergencyMessages(emergencyData);
        }
      } catch (error) {
        console.error('Failed to create voice emergency alert:', error);
        toast({
          title: "Emergency Alert Failed",
          description: "Could not create emergency alert",
          variant: "destructive",
        });
      }
    }, (error) => {
      console.error('Geolocation error:', error);
      // Handle emergency without location
      const emergencyData: EmergencyAlert = {
        triggerType,
        scenario,
        location: { lat: 0, lng: 0, address: "Location unavailable" },
        timestamp: new Date(),
      };
      
      setEmergencyActive(true);
      setShowLiveStream(true);
      startVideoRecording();
      
      toast({
        title: "Voice SOS Detected",
        description: "Recording video (location unavailable)...",
        variant: "destructive",
      });
    });
  };

  const triggerEmergencyProtocol = async (triggerType: string, additionalData?: any) => {
    setIsTriggering(true);
    setEmergencyActive(true);

    try {
      // Get current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = new Date();
          
          // Create emergency alert with scenario details
          const emergencyData: EmergencyAlert = {
            triggerType,
            scenario: getEmergencyScenario(triggerType),
            location: {
              lat: latitude,
              lng: longitude,
              address: `Emergency Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            },
            timestamp
          };

          // Auto-start live streaming
          setShowLiveStream(true);

          // Send emergency alert to backend
          try {
            const alertResponse = await fetch('/api/emergency-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                triggerType,
                latitude,
                longitude,
                deviceInfo: JSON.stringify(additionalData || {}),
                timestamp: timestamp.toISOString()
              })
            });

            if (alertResponse.ok) {
              const alert = await alertResponse.json();
              setCurrentAlertId(alert.id);
              console.log('Emergency alert created:', alert.id);

              // Handle video recording for voice-triggered emergencies
              if (additionalData?.autoVideoRecording && additionalData?.videoRecorder) {
                console.log('Voice-triggered emergency - continuous video recording started');
                setEmergencyActive(true);
                setShowLiveStream(true);
                
                // Show immediate feedback that recording has started
                toast({
                  title: "Video Recording Started",
                  description: "Continuous recording until emergency is resolved",
                  variant: "default",
                });
              }
            }
          } catch (error) {
            console.error('Failed to create emergency alert:', error);
          }

          await sendEmergencyMessages(emergencyData);
          setIsTriggering(false);
        });
      }
    } catch (error) {
      console.error('Emergency protocol failed:', error);
      setIsTriggering(false);
    }
  };

  const sendEmergencyMessages = async (emergencyData: EmergencyAlert) => {
    const activeContacts = emergencyContacts.filter(contact => contact.isActive);

    for (const contact of activeContacts) {
      try {
        // Send SMS alert
        await fetch('/api/send-emergency-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: contact.phoneNumber,
            location: emergencyData.location.address,
            whatsappNumber: contact.whatsappNumber || '+917892937490'
          })
        });

        // Send WhatsApp message if WhatsApp number available
        if (contact.whatsappNumber) {
          await fetch('/api/send-whatsapp-emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: contact.whatsappNumber,
              message: `🚨 EMERGENCY ALERT 🚨\n\nSakhi Suraksha emergency detected!\n\nLocation: ${emergencyData.location.address}\nTime: ${emergencyData.timestamp.toLocaleString()}\nTrigger: ${emergencyData.triggerType}\n\nPlease check immediately!`
            })
          });
        }
      } catch (error) {
        console.error(`Failed to send emergency message to ${contact.name}:`, error);
      }
    }
  };

  const handleEmergencyResolution = () => {
    console.log('Emergency resolved, stopping all activities');
    
    // Stop video recording and upload if active
    if (videoRecorder && videoRecorder.state === 'recording' && currentAlertId) {
      videoRecorder.stop();
      
      // Upload video after recording stops
      videoRecorder.onstop = async () => {
        if (recordedVideoBlob && currentAlertId) {
          const videoUrl = await uploadVideoRecording(currentAlertId, recordedVideoBlob);
          console.log('Emergency video uploaded:', videoUrl);
        }
      };
    }
    
    setEmergencyActive(false);
    setShowLiveStream(false);
    setCurrentAlertId(null);
    
    toast({
      title: "Emergency Resolved",
      description: "All emergency activities have been stopped",
      variant: "default",
    });
  };

  const sendLiveLocationAlert = async (phoneNumber: string, streamUrl: string, location: any, whatsappNumber?: string) => {
    try {
      await fetch('/api/send-live-location-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          locationUrl: `https://maps.google.com/maps?q=${location.lat},${location.lng}`,
          streamUrl,
          whatsappNumber
        })
      });
    } catch (error) {
      console.error('Failed to send live location alert:', error);
    }
  };

  const getEmergencyScenario = (triggerType: string): string => {
    const scenarios: Record<string, string> = {
      'voice-distress': 'Voice distress detected - potential threat situation',
      'button-hold': 'Manual emergency button activation',
      'smartwatch-panic': 'Smartwatch panic button pressed',
      'automatic-fall': 'Automatic fall detection triggered',
      'location-unsafe': 'Unsafe location detected'
    };
    return scenarios[triggerType] || 'Emergency situation detected';
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Emergency Status Display */}
      {emergencyActive && (
        <Card className="w-full max-w-md border-red-500 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">Alert ID: {currentAlertId}</span>
              <Button 
                onClick={handleEmergencyResolution}
                variant="outline" 
                size="sm"
                className="border-red-500 text-red-700 hover:bg-red-100"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Emergency Button */}
      <div className="relative">
        <Button
          className={`
            w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-red-700 
            hover:from-red-600 hover:to-red-800 text-white font-bold text-xl
            shadow-2xl transition-all duration-300 border-4 border-red-400
            relative overflow-hidden
            ${isTriggering ? 'scale-110' : 'hover:scale-105'}
            ${holdProgress > 0 ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
          `}
        >
          {/* Progress Ring */}
          {holdProgress > 0 && (
            <div 
              className="absolute inset-0 rounded-full border-8 border-transparent"
              style={{
                background: `conic-gradient(from 0deg, #fbbf24 ${holdProgress * 3.6}deg, transparent ${holdProgress * 3.6}deg)`,
                borderRadius: '50%'
              }}
            />
          )}
          
          <div className="flex flex-col items-center relative z-10">
            <AlertTriangle className="w-16 h-16 text-white mb-2" />
            <span className="text-white font-bold text-2xl">
              {isTriggering ? "SENDING..." : 
               holdProgress > 0 ? "HOLD..." : 
               emergencyActive ? "ACTIVE" : "SOS"}
            </span>
            {emergencyActive && (
              <span className="text-white text-xs mt-1">Emergency Active</span>
            )}
          </div>
        </Button>
        
        {holdProgress > 0 && (
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-sm font-semibold text-red-600">
              {Math.ceil((100 - holdProgress) / 33)} seconds to activate
            </p>
          </div>
        )}
      </div>
      
      <p className="text-center text-sm text-gray-600 max-w-xs font-medium">
        Hold for 3 seconds to send emergency alert with:
        <br />📍 Live location • 📹 Video stream • 📱 SMS to contacts
      </p>

      {/* Emergency Contacts Display */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Emergency Contacts ({emergencyContacts.filter(c => c.isActive).length})
          </h3>
          {emergencyContacts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No emergency contacts configured</p>
          ) : (
            emergencyContacts.filter(contact => contact.isActive).map((contact) => (
              <div key={contact.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-sm">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`tel:${contact.phoneNumber}`)}
                  >
                    <Phone className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Streaming Component */}
      {showLiveStream && (
        <div className="w-full max-w-md">
          <LiveStreaming 
            onStreamStart={(streamUrl: string) => {
              // Send live location alerts via device messaging
              if (emergencyContacts.length > 0) {
                const contacts = emergencyContacts.filter(contact => contact.isActive).map(contact => ({
                  name: contact.name,
                  phoneNumber: contact.phoneNumber,
                  email: contact.email
                }));

                // Send live location alerts through device apps
                for (const contact of contacts) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    const location = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      address: `Live Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
                    };
                    
                    sendLiveLocationAlert(
                      contact.phoneNumber,
                      streamUrl,
                      location,
                      '+917892937490' // Your WhatsApp number
                    );
                  });
                }
              }

              toast({
                title: "Emergency Stream Active",
                description: "Live video and location shared with emergency contacts via SMS and WhatsApp",
              });
            }}
            onStreamEnd={async () => {
              // Stop video recording and upload when stream ends
              if (videoRecorder && videoRecorder.state === 'recording') {
                stopVideoRecording();
                
                // Upload recorded video
                if (recordedVideoBlob && currentAlertId) {
                  const videoUrl = await uploadVideoRecording(currentAlertId, recordedVideoBlob);
                  console.log('Emergency video uploaded:', videoUrl);
                  
                  toast({
                    title: "Video Uploaded",
                    description: "Emergency recording saved successfully",
                  });
                }
              }
              
              setShowLiveStream(false);
            }}
          />
        </div>
      )}

      {/* Voice Detection Component */}
      <div className="w-full max-w-md">
        <FixedVoiceDetector 
          onDistressDetected={(confidence, keywords) => {
            console.log(`Distress detected with ${confidence}% confidence. Keywords: ${keywords.join(', ')}`);
          }}
          onVoiceSOSDetected={handleVoiceSOSDetected}
          onEmergencyTriggered={() => {
            console.log('Emergency triggered by voice detection');
          }}
          emergencyMode={emergencyActive}
        />
      </div>
    </div>
  );
}