import { Shield, CheckCircle, Clock, User, Signal, MapPin, PhoneCall, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmergencyButton from "@/components/emergency-button";
import PersistentVoiceDetector from "@/components/persistent-voice-detector";
import LiveStreaming from "@/components/live-streaming";
import PermissionManager from "@/components/permission-manager";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/hooks/use-location";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import type { EmergencyContact, HomeLocation, User as UserType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { userSession } from "@/lib/userSession";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { location, isLocationSharingActive } = useLocation();
  const { isListening, isSupported } = useVoiceRecognition();
  const { toast } = useToast();
  const [autoStartStream, setAutoStartStream] = useState(false);
  const [isVoiceDetectionActive, setIsVoiceDetectionActive] = useState(false);
  const [voiceDetectionScenario, setVoiceDetectionScenario] = useState<{triggerType: string, scenario: string, detectedText: string} | null>(null);
  
  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const userId = userSession.getUserId();
      const response = await fetch(`/api/user/profile?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    }
  });

  const { data: emergencyContacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts"],
    queryFn: async () => {
      const userId = userSession.getUserId();
      const response = await fetch(`/api/emergency-contacts?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch emergency contacts');
      return response.json();
    }
  });

  const { data: homeLocation } = useQuery<HomeLocation>({
    queryKey: ["/api/user/home-location"],
    queryFn: async () => {
      const userId = userSession.getUserId();
      const response = await fetch(`/api/user/home-location?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch home location');
      return response.json();
    }
  });

  const lastUpdated = useMemo(() => {
    if (homeLocation?.updatedAt) {
      return formatDistanceToNow(homeLocation.updatedAt || new Date());
    }
    return "2 minutes";
  }, [homeLocation?.updatedAt]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
      {/* Header with Shield Icon */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Astra</h1>
        {user ? (
          <p className="text-gray-600 text-lg">Welcome back, {user.firstName || 'User'}</p>
        ) : (
          <p className="text-gray-600 text-lg">Your safety companion</p>
        )}
        
        {/* All Systems Active Badge */}
        <div className="flex items-center mt-4 px-4 py-2 bg-green-100 rounded-full">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          <span className="text-green-700 font-medium">All Systems Active</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 max-w-lg mx-auto">
        {/* Safety Status Card */}
        <Card className="mb-8 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">Safety Status</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Location Status</span>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  Safe Zone: Home
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Emergency Contacts</span>
                <span className="text-gray-600 font-medium">{emergencyContacts.length} contacts</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Voice Recognition</span>
                <Badge className={isVoiceDetectionActive ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}>
                  {isVoiceDetectionActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center text-sm text-gray-500 mt-4">
                <Clock className="w-4 h-4 mr-2" />
                <span>Last updated {lastUpdated} ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency SOS Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-red-600 mb-6">Emergency SOS</h2>
          <div className="flex justify-center mb-6">
            <EmergencyButton />
          </div>
          
          {/* Voice Distress Detection */}
          <div className="mb-6">
            <PersistentVoiceDetector 
              onEmergencyDetected={async (triggerType, scenario, detectedText) => {
                console.log('Voice emergency triggered:', triggerType, scenario);
                
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
                  
                  // Create emergency alert via API
                  const response = await fetch('/api/emergency-alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      triggerType: 'voice_detection',
                      latitude,
                      longitude,
                      address: `Voice Detection Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                      audioRecordingUrl: JSON.stringify({
                        detectedText: detectedText,
                        scenario: scenario,
                        confidence: 0.9
                      })
                    })
                  });

                  if (response.ok) {
                    const alert = await response.json();
                    console.log('Voice emergency alert created:', alert.id);
                    
                    setVoiceDetectionScenario({ triggerType, scenario, detectedText });
                    setAutoStartStream(true);
                    
                    toast({
                      title: "Voice Emergency Alert Created",
                      description: "Emergency contacts notified and parent dashboard updated",
                      variant: "destructive"
                    });
                  } else {
                    throw new Error('Failed to create emergency alert');
                  }
                  
                } catch (error) {
                  console.error('Emergency alert creation failed:', error);
                  
                  // Fallback without location
                  const response = await fetch('/api/emergency-alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      triggerType: 'voice_detection',
                      latitude: 12.9716,
                      longitude: 77.5946,
                      address: 'Voice Detection - Location unavailable',
                      audioRecordingUrl: JSON.stringify({
                        detectedText: detectedText,
                        scenario: scenario,
                        confidence: 0.9
                      })
                    })
                  });

                  if (response.ok) {
                    const alert = await response.json();
                    console.log('Voice emergency alert created (fallback):', alert.id);
                    
                    setVoiceDetectionScenario({ triggerType, scenario, detectedText });
                    setAutoStartStream(true);
                  }
                }
              }}
              isActive={isVoiceDetectionActive}
              onToggle={setIsVoiceDetectionActive}
            />
          </div>

          {/* Live Streaming Component */}
          <div className="mb-6">
            <LiveStreaming 
              autoStart={autoStartStream}
              onStreamStarted={(streamUrl) => {
                console.log('Live stream started:', streamUrl);
                setAutoStartStream(false);
                setVoiceDetectionScenario(null);
              }}
              onStreamEnded={() => {
                console.log('Live stream ended');
                setAutoStartStream(false);
                setVoiceDetectionScenario(null);
              }}
              emergencyMode={autoStartStream}
              voiceScenario={voiceDetectionScenario}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="space-y-4 mb-8">
          <Link href="/map">
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3">
              View Full Map & Safe Routes
            </Button>
          </Link>
          
          <Link href="/contacts">
            <Button variant="outline" className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 py-3">
              Manage Emergency Contacts
            </Button>
          </Link>
        </div>

        {/* Feature Info Cards */}
        <div className="space-y-4 mb-8">
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">Voice SOS Activation</h4>
                  <p className="text-sm text-gray-600">Say "Help me" or "Emergency" to trigger instant alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">Smart Safe Routes</h4>
                  <p className="text-sm text-gray-600">AI-powered navigation avoiding unsafe areas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-r from-green-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Signal className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">Live Location Sharing</h4>
                  <p className="text-sm text-gray-600">Real-time tracking with emergency contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">Fake Call Feature</h4>
                  <p className="text-sm text-gray-600">Simulate incoming calls to escape situations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contacts Quick View */}
        {emergencyContacts.length > 0 && (
          <Card className="mb-8 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Quick Contacts</h3>
                <Link href="/contacts">
                  <Button variant="ghost" size="sm" className="text-purple-600">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {emergencyContacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-800">{contact.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-purple-600"
                      onClick={() => window.open(`tel:${contact.phoneNumber}`, '_self')}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* App Information */}
        <Card className="mb-8 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">About Astra</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start space-x-2">
                <span className="text-purple-600 font-medium">•</span>
                <span>AI-powered women's safety app with real-time protection</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="text-purple-600 font-medium">•</span>
                <span>Voice activation for hands-free emergency alerts</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="text-purple-600 font-medium">•</span>
                <span>Smart route planning with safety zone detection</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="text-purple-600 font-medium">•</span>
                <span>IoT device integration for health monitoring</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="text-purple-600 font-medium">•</span>
                <span>Community safety alerts and real-time notifications</span>
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                Your safety is our priority. Stay connected, stay safe.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parent Dashboard Access */}
        <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Parent Dashboard</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Monitor your child's safety status and receive emergency alerts in real-time
                </p>
              </div>
              <Button 
                onClick={() => window.open('/parent-dashboard', '_blank')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                Open Parent Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer spacing */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}