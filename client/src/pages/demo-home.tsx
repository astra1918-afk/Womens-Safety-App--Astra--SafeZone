import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EnhancedEmergencyButton from "@/components/enhanced-emergency-button";
import LiveStreaming from "@/components/live-streaming";
import { Shield, Phone, MapPin, Users, Camera, Mic, AlertTriangle, Clock, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DemoHome() {
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [emergencyContacts] = useState([
    { name: "Mom", phone: "+919876543211", relationship: "Mother" },
    { name: "Best Friend", phone: "+919876543212", relationship: "Friend" },
    { name: "Brother", phone: "+919876543213", relationship: "Sibling" }
  ]);
  
  const { toast } = useToast();

  const quickActions = [
    { 
      label: "Call Police", 
      number: "100", 
      color: "bg-red-500 hover:bg-red-600",
      icon: Phone 
    },
    { 
      label: "Women's Helpline", 
      number: "1091", 
      color: "bg-pink-500 hover:bg-pink-600",
      icon: Phone 
    },
    { 
      label: "Medical Emergency", 
      number: "108", 
      color: "bg-blue-500 hover:bg-blue-600",
      icon: Phone 
    }
  ];

  const safetyStatus = {
    location: "Safe Zone: Home",
    lastUpdate: "2 minutes ago",
    emergencyContacts: emergencyContacts.length,
    voiceActivation: true,
    shakeDetection: true
  };

  const callEmergencyNumber = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="p-4 pb-24 space-y-6 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Astra </h1>
        <p className="text-gray-600">Your safety companion</p>
        <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
          <Activity className="w-3 h-3 mr-1" />
          All Systems Active
        </Badge>
      </div>

      {/* Safety Status Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <Shield className="w-5 h-5 mr-2" />
            Safety Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Location Status</span>
              <Badge className="bg-green-100 text-green-700">{safetyStatus.location}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Emergency Contacts</span>
              <Badge variant="outline">{safetyStatus.emergencyContacts} contacts</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Voice Activation</span>
              <Badge className="bg-blue-100 text-blue-700">
                {safetyStatus.voiceActivation ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              Last updated {safetyStatus.lastUpdate}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency SOS Button */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-red-50 to-pink-50">
        <CardHeader className="text-center">
          <CardTitle className="text-red-700">Emergency SOS</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <EnhancedEmergencyButton />
        </CardContent>
      </Card>

      {/* Quick Emergency Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Quick Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={() => callEmergencyNumber(action.number)}
                  className={`${action.color} text-white h-12 flex items-center justify-between`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </div>
                  <span className="font-bold">{action.number}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Streaming */}
      <LiveStreaming 
        isEmergency={false}
        onStreamStart={(url) => {
          setIsLiveStreamActive(true);
          toast({
            title: "Live Stream Started",
            description: "Stream is now active and ready to share",
          });
        }}
        onStreamEnd={() => {
          setIsLiveStreamActive(false);
          toast({
            title: "Live Stream Ended",
            description: "Stream has been stopped",
          });
        }}
      />

      {/* Emergency Contacts Preview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emergencyContacts.slice(0, 3).map((contact, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-600">{contact.relationship}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => callEmergencyNumber(contact.phone.replace(/[^\d]/g, ''))}
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Call
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Safety Features */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Active Safety Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Mic className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Voice SOS</p>
              <p className="text-xs text-gray-600">Say "help" to activate</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Camera className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Live Stream</p>
              <p className="text-xs text-gray-600">Auto-start on emergency</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <MapPin className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Location Share</p>
              <p className="text-xs text-gray-600">Real-time tracking</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Shake Detection</p>
              <p className="text-xs text-gray-600">Motion-based SOS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Notice */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-orange-700 font-medium">
              Demo Mode - All features are functional for testing
            </p>
            <p className="text-xs text-orange-600 mt-1">
              In a real emergency, this app would immediately notify your contacts and emergency services
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}