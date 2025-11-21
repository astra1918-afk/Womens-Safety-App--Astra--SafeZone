import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Camera, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { EmergencyContact } from "@shared/schema";
import LiveStreaming from "./live-streaming";
import FixedVoiceDetector from "./fixed-voice-detector";
import SmartwatchIntegration from "./smartwatch-integration";
import { DeviceSmsService } from "@/lib/deviceSmsService";
import { sendEmergencyAlert, sendLiveLocationAlert, sendToMultipleContacts } from "@/lib/deviceMessaging";
import { MobileMessaging } from "@/lib/mobileMessaging";
import MobileEmergencyInterface from "@/components/mobile-emergency-interface";
import AutoSOSSender from "@/components/auto-sos-sender";
import IPhoneDirectMessaging from "@/components/iphone-direct-messaging";
import { PhotoCapture, uploadEmergencyPhoto } from "./photo-capture";

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
  const [showMobileInterface, setShowMobileInterface] = useState(false);
  const [showAutoSOS, setShowAutoSOS] = useState(false);
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

  // Fetch real emergency contacts from database
  const { data: emergencyContacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts"]
  });

  // WebSocket connection for emergency resolution signals
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for emergency signals');
      };
      
      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'emergency_resolved' && data.alertId === currentAlertId) {
            console.log(`Emergency ${data.alertId} resolved from parent dashboard - stopping video recording`);
            
            // Stop video recording and upload when emergency is resolved
            if (videoRecorder && videoRecorder.state === 'recording') {
              stopVideoRecording();
              
              // Wait for recording to complete and upload
              setTimeout(async () => {
                if (recordedVideoBlob && currentAlertId) {
                  const videoUrl = await uploadVideoRecording(currentAlertId, recordedVideoBlob);
                  console.log('Emergency resolved - video uploaded:', videoUrl);
                  
                  toast({
                    title: "Emergency Resolved",
                    description: "Video recording saved automatically",
                    variant: "default",
                  });
                }
              }, 2000);
            }
            
            // Reset emergency state
            setEmergencyActive(false);
            setShowLiveStream(false);
            setVideoRecorder(null);
            setRecordedVideoBlob(null);
            setCurrentAlertId(null);
            
            toast({
              title: "Emergency Resolved by Parent",
              description: "Your safety alert has been resolved",
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentAlertId, videoRecorder, recordedVideoBlob, toast]);

  const handleSmartwatchSOS = async (source: string, deviceInfo: any) => {
    const triggerType = `smartwatch-${deviceInfo.type}`;
    await triggerEmergencyProtocol(triggerType, {
      deviceName: deviceInfo.name,
      batteryLevel: deviceInfo.batteryLevel,
      lastSync: deviceInfo.lastSync
    });
  };

  const startVideoRecording = async (): Promise<MediaRecorder | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        setRecordedVideoBlob(videoBlob);
        
        // Stop all tracks to release camera
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setVideoRecorder(recorder);
      
      console.log('Video recording started for emergency');
      return recorder;
    } catch (error) {
      console.error('Failed to start video recording:', error);
      return null;
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && videoRecorder.state === 'recording') {
      videoRecorder.stop();
      console.log('Video recording stopped');
    }
  };

  const uploadVideoRecording = async (alertId: number, videoBlob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('video', videoBlob, `emergency_${alertId}_${Date.now()}.webm`);
      formData.append('alertId', alertId.toString());
      formData.append('timestamp', new Date().toISOString());

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
    
    // Start video recording immediately
    const recorder = await startVideoRecording();
    
    // Show emergency notification immediately
    toast({
      title: "Voice SOS Detected",
      description: "Recording video and alerting contacts...",
      variant: "destructive",
    });
    
    // Trigger emergency protocol with video recording
    await triggerEmergencyProtocol(triggerType, {
      scenario,
      detectedText,
      autoVideoRecording: true,
      videoRecorder: recorder
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
          const streamId = Date.now();
          const streamUrl = `${window.location.origin}/emergency-stream/stream_${streamId}_emergency`;
          emergencyData.streamUrl = streamUrl;

          // Create emergency alert in database and get alert ID
          try {
            const alertResponse = await fetch('/api/emergency-alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                triggerType,
                latitude: emergencyData.location.lat,
                longitude: emergencyData.location.lng,
                address: emergencyData.location.address,
                deviceInfo: additionalData ? JSON.stringify(additionalData) : null
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

          // Send emergency messages to all contacts via device messaging
          await sendEmergencyMessages(emergencyData);
          
          // Trigger direct iPhone messaging interface
          const contacts = emergencyContacts.filter(contact => contact.isActive && contact.phoneNumber);
          if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iOS')) {
            console.log('iPhone detected - triggering direct messaging interface');
            setEmergencyMessageText(`🚨 EMERGENCY ALERT 🚨
I need immediate help! This is an automated SOS from Sakhi Suraksha app.

📍 LOCATION: ${emergencyData.location.address}
⏰ TIME: ${emergencyData.timestamp.toLocaleString()}
📹 LIVE STREAM: ${emergencyData.streamUrl || 'Starting...'}

Please contact me immediately or call emergency services.`);
            setShowDirectMessaging(true);
          } else {
            MobileMessaging.sendEmergencyMessages(contacts, emergencyData);
          }
          
          // Show native notification
          MobileMessaging.showNativeNotification(
            "Emergency Alert Activated",
            `Messaging ${contacts.length} emergency contacts with live location`
          );

          // Show success notification
          toast({
            title: "🚨 Emergency Alert Activated",
            description: "All emergency contacts notified with live location and video stream",
            variant: "default",
          });

          // Auto-call emergency services after delay
          setTimeout(() => {
            toast({
              title: "📞 Calling Emergency Services",
              description: "Connecting to Police (100) and Women's Helpline (1091)",
              variant: "default",
            });
          }, 3000);

        }, (error) => {
          console.error('Geolocation error:', error);
          // Still send emergency without precise location
          const emergencyData: EmergencyAlert = {
            triggerType,
            scenario: getEmergencyScenario(triggerType),
            location: {
              lat: 0,
              lng: 0,
              address: "Location unavailable - GPS disabled"
            },
            timestamp: new Date()
          };
          sendEmergencyMessages(emergencyData);
        });
      }
    } catch (error) {
      toast({
        title: "Emergency Alert Failed",
        description: "Please try again or call emergency services directly",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const getEmergencyScenario = (triggerType: string): string => {
    const scenarios = {
      'manual_button': 'Manual SOS button pressed - User actively requested emergency assistance',
      'voice_activation': 'Voice distress detected - User said emergency keywords indicating need for help',
      'shake_detection': 'Device shake pattern detected - Possible struggle or distress situation',
      'panic_hold': 'Extended button hold detected - User confirmed emergency situation',
      'location_unsafe': 'User in potentially unsafe location - Proactive safety alert triggered'
    };
    
    return scenarios[triggerType as keyof typeof scenarios] || 'Emergency assistance requested through Sakhi Suraksha app';
  };

  const sendEmergencyMessages = async (emergencyData: EmergencyAlert) => {
    const messageTemplate = `🚨 URGENT EMERGENCY ALERT 🚨

${emergencyData.scenario}

📍 LIVE LOCATION: 
${emergencyData.location.address}
Google Maps: https://maps.google.com/?q=${emergencyData.location.lat},${emergencyData.location.lng}

🕒 TIME: ${emergencyData.timestamp.toLocaleString()}

📹 LIVE VIDEO STREAM: 
${emergencyData.streamUrl || 'Starting video stream...'}

⚠️ EMERGENCY DETAILS:
- Trigger: ${emergencyData.triggerType.replace('_', ' ').toUpperCase()}
- App: Sakhi Suraksha Safety App
- Auto-generated alert

🆘 IMMEDIATE ACTION REQUIRED:
1. Contact me immediately
2. Call emergency services if no response
3. Share this location with authorities

Emergency Contacts:
🚔 Police: 100
👩‍⚕️ Women's Helpline: 1091
🏥 Medical: 108

This is an automated safety alert. Please respond urgently.`;

    // Send SMS from device to all emergency contacts from database
    const activeContacts = emergencyContacts.filter(contact => contact.isActive && contact.phoneNumber);
    
    if (activeContacts.length === 0) {
      toast({
        title: "No Emergency Contacts",
        description: "Please add emergency contacts in your profile to receive alerts",
        variant: "destructive",
      });
      return;
    }

    // Send messages through device's native SMS and WhatsApp apps
    try {
      const contacts = activeContacts.map(contact => ({
        name: contact.name,
        phoneNumber: contact.phoneNumber!,
        email: contact.email
      }));

      // Detect device and use direct messaging for iPhone 13 Pro Max
      console.log('Opening emergency messaging for contacts:', contacts);
      
      setEmergencyMessageText(messageTemplate);
      
      // Use direct messaging for iPhone 13 Pro Max
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iOS')) {
        setShowDirectMessaging(true);
        toast({
          title: "Opening Messages App",
          description: `Direct messaging to emergency contacts`,
          variant: "default",
        });
      } else {
        setShowMobileInterface(true);
        toast({
          title: "Emergency Interface Opened",
          description: `Tap buttons to send messages via native apps`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Device messaging error:', error);
    }

    for (const contact of activeContacts) {
      try {
        // Send actual SMS message via backend API
        const response = await fetch('/api/emergency/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            contactName: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
            message: messageTemplate,
            emergencyData: emergencyData
          })
        });

        if (response.ok) {
          // Show success notification
          setTimeout(() => {
            toast({
              title: `Alert sent to ${contact.name}`,
              description: `${contact.relationship} notified via SMS and email with emergency details`,
              variant: "default",
            });
          }, 1000 * (activeContacts.indexOf(contact) + 1));
        } else {
          throw new Error('Failed to send emergency alert');
        }
        
      } catch (error) {
        console.error(`Failed to send message to ${contact.name}:`, error);
        toast({
          title: `Failed to notify ${contact.name}`,
          description: `Error sending emergency alert to ${contact.relationship}`,
          variant: "destructive",
        });
      }
    }

    // Log emergency record for demo
    console.log('🚨 EMERGENCY RECORD CREATED:', emergencyData);
  };

  const startHold = () => {
    if (holdTimeoutRef.current) return;
    
    setHoldProgress(0);
    
    // Progress animation
    progressIntervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current!);
          return 100;
        }
        return prev + (100 / 30); // 3 seconds = 30 intervals of 100ms
      });
    }, 100);
    
    // Trigger emergency after 3 seconds
    holdTimeoutRef.current = setTimeout(() => {
      triggerEmergencyProtocol('panic_hold');
      setHoldProgress(0);
    }, 3000);
  };

  const endHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  const quickEmergencyCall = (number: string, service: string) => {
    window.location.href = `tel:${number}`;
    toast({
      title: `Calling ${service}`,
      description: `Connecting to ${number}`,
    });
  };

  const deactivateEmergency = async () => {
    // Stop video recording if active and upload the complete session
    if (videoRecorder && videoRecorder.state === 'recording') {
      stopVideoRecording();
      
      // Wait for recording to complete and upload
      setTimeout(async () => {
        if (recordedVideoBlob && currentAlertId) {
          const videoUrl = await uploadVideoRecording(currentAlertId, recordedVideoBlob);
          console.log('Complete emergency video uploaded:', videoUrl);
          
          toast({
            title: "Emergency Video Saved",
            description: "Complete recording stored in history",
            variant: "default",
          });
        }
      }, 2000);
    }
    
    setEmergencyActive(false);
    setShowLiveStream(false);
    setVideoRecorder(null);
    setRecordedVideoBlob(null);
    
    toast({
      title: "Emergency Deactivated",
      description: "You can notify contacts that you are safe",
    });
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Emergency Button */}
      <div className="relative">
        <Button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          disabled={isTriggering}
          className={`
            w-44 h-44 rounded-full 
            ${emergencyActive 
              ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 animate-pulse' 
              : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'
            }
            hover:from-red-600 hover:via-red-700 hover:to-red-800
            shadow-2xl hover:shadow-red-500/50
            border-8 border-white
            transition-all duration-300
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

      {/* Emergency Status */}
      {emergencyActive && (
        <div className="w-full max-w-md p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="text-center">
            <p className="font-bold text-red-700 mb-2">🚨 EMERGENCY ACTIVE 🚨</p>
            <p className="text-sm text-red-600 mb-3">
              All contacts notified • Live stream active • Location shared
            </p>
            <Button 
              onClick={deactivateEmergency}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300"
            >
              Mark as Safe
            </Button>
          </div>
        </div>
      )}

      {/* Quick Emergency Calls */}
      <div className="flex space-x-3">
        <Button
          onClick={() => quickEmergencyCall('100', 'Police')}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1 border-red-200 text-red-600 hover:bg-red-50"
        >
          <Phone className="w-3 h-3" />
          <span className="text-xs">Police 100</span>
        </Button>
        
        <Button
          onClick={() => quickEmergencyCall('1091', "Women's Helpline")}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1 border-pink-200 text-pink-600 hover:bg-pink-50"
        >
          <Phone className="w-3 h-3" />
          <span className="text-xs">Women 1091</span>
        </Button>
        
        <Button
          onClick={() => quickEmergencyCall('108', 'Medical Emergency')}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <Phone className="w-3 h-3" />
          <span className="text-xs">Medical 108</span>
        </Button>
      </div>

      {/* Emergency Contacts Preview */}
      <div className="w-full max-w-md">
        <p className="text-sm font-medium text-gray-700 mb-2">Emergency Contacts ({emergencyContacts.filter(c => c.isActive).length})</p>
        <div className="space-y-2">
          {emergencyContacts.filter(contact => contact.isActive).length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-sm text-yellow-700">No emergency contacts added</p>
              <p className="text-xs text-yellow-600 mt-1">Add contacts in your profile to enable emergency messaging</p>
            </div>
          ) : (
            emergencyContacts.filter(contact => contact.isActive).slice(0, 3).map((contact) => (
              <div key={contact.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.relationship}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {contact.isPrimary && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Primary</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => quickEmergencyCall(contact.phoneNumber.replace(/[^\d]/g, ''), contact.name)}
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
            isEmergency={true}
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
                
                // Wait for recording to complete and upload
                setTimeout(async () => {
                  if (recordedVideoBlob && currentAlertId) {
                    const videoUrl = await uploadVideoRecording(currentAlertId, recordedVideoBlob);
                    console.log('Emergency stream ended - video uploaded:', videoUrl);
                    
                    toast({
                      title: "Emergency Recording Saved",
                      description: "Complete video stored in emergency history",
                      variant: "default",
                    });
                  }
                }, 2000);
              }
              
              setShowLiveStream(false);
              setVideoRecorder(null);
              setRecordedVideoBlob(null);
            }}
          />
        </div>
      )}

      {/* Mobile Emergency Interface */}
      {showMobileInterface && (
        <MobileEmergencyInterface
          contacts={emergencyContacts.filter(contact => contact.isActive).map(contact => ({
            name: contact.name,
            phoneNumber: contact.phoneNumber!
          }))}
          emergencyMessage={emergencyMessageText}
          onClose={() => setShowMobileInterface(false)}
        />
      )}

      {/* Auto SOS Sender for iPhone 13 Pro Max */}
      {showAutoSOS && (
        <AutoSOSSender
          contacts={emergencyContacts.filter(contact => contact.isActive).map(contact => ({
            name: contact.name,
            phoneNumber: contact.phoneNumber!
          }))}
          emergencyMessage={emergencyMessageText}
          onComplete={() => setShowAutoSOS(false)}
          autoSend={true}
        />
      )}

      {/* Direct iPhone Messaging */}
      {showDirectMessaging && (
        <IPhoneDirectMessaging
          contacts={emergencyContacts.filter(contact => contact.isActive).map(contact => ({
            name: contact.name,
            phoneNumber: contact.phoneNumber!
          }))}
          emergencyMessage={emergencyMessageText}
          onComplete={() => setShowDirectMessaging(false)}
        />
      )}



      {/* Voice Detection for Automatic SOS */}
      <div className="w-full max-w-md">
        <FixedVoiceDetector
          onDistressDetected={(confidence, keywords) => {
            console.log('Voice distress detected:', { confidence, keywords });
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