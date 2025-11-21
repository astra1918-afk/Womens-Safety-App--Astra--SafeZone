import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Bell, Shield, Phone, Save, Palette, Moon, Sun, LogOut, Mic, Camera, Volume2, MapPin, Check, X, Mail, Watch, Bluetooth, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useLocation } from "@/hooks/use-location";
import { queryClient } from "@/lib/queryClient";
import { userSession } from "@/lib/userSession";
import SmartwatchIntegration from "@/components/smartwatch-integration";

export default function Settings() {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [voiceActivation, setVoiceActivation] = useState(true);
  const [autoLiveStream, setAutoLiveStream] = useState(true);
  const [emergencyMessage, setEmergencyMessage] = useState(
    "🚨 EMERGENCY ALERT 🚨\nI need immediate help! This is an automated SOS from Astra app.\n\nLocation: [LIVE_LOCATION]\nTime: [TIMESTAMP]\nLive Stream: [STREAM_LINK]\n\nPlease contact me immediately or call emergency services."
  );
  const [firstName, setFirstName] = useState("Demo");
  const [lastName, setLastName] = useState("User");
  const [email, setEmail] = useState("demo@astra.com");
  const [phoneNumber, setPhoneNumber] = useState("+919876543210");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [homeAddress, setHomeAddress] = useState("");
  const [isSettingHomeLocation, setIsSettingHomeLocation] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isPhoneOtpDialogOpen, setIsPhoneOtpDialogOpen] = useState(false);
  const [isEmailOtpDialogOpen, setIsEmailOtpDialogOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  const { toast } = useToast();
  const { isListening, startListening, stopListening, isSupported } = useVoiceRecognition();
  const { location } = useLocation();

  // Handle smartwatch SOS triggers
  const handleSmartwatchSOS = async (source: string, deviceInfo: any) => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          const emergencyData = {
            triggerType: `smartwatch-${deviceInfo.type}`,
            latitude,
            longitude,
            audioRecordingUrl: null,
            videoRecordingUrl: null,
            metadata: {
              deviceName: deviceInfo.name,
              deviceType: deviceInfo.type,
              batteryLevel: deviceInfo.batteryLevel,
              lastSync: deviceInfo.lastSync
            }
          };

          const response = await fetch('/api/emergency-alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emergencyData)
          });

          if (response.ok) {
            toast({
              title: "SOS Alert Sent",
              description: `Emergency alert triggered from ${deviceInfo.name}`,
              variant: "destructive",
            });
          }
        });
      }
    } catch (error) {
      toast({
        title: "SOS Failed",
        description: "Could not send smartwatch emergency alert",
        variant: "destructive",
      });
    }
  };

  // Load user profile data
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const userId = userSession.getUserId();
      const response = await fetch(`/api/user/profile?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    }
  });

  // Populate form fields with user data when loaded
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setEmail(userProfile.email || "");
      setPhoneNumber(userProfile.phoneNumber || "");
      setEmergencyMessage(userProfile.emergencyMessage || emergencyMessage);
    }
  }, [userProfile]);

  // Fetch user's home location
  const { data: homeLocation } = useQuery({
    queryKey: ["/api/user/home-location"],
    queryFn: async () => {
      const response = await fetch("/api/user/home-location");
      if (!response.ok && response.status !== 404) {
        throw new Error("Failed to fetch home location");
      }
      return response.status === 404 ? null : response.json();
    },
  });



  useEffect(() => {
    if (homeLocation) {
      setHomeAddress(homeLocation.address || `${homeLocation.latitude}, ${homeLocation.longitude}`);
    }
  }, [homeLocation]);

  // Set home location using current location
  const setHomeLocationMutation = useMutation({
    mutationFn: async () => {
      if (!location) {
        throw new Error("Current location not available");
      }
      
      const response = await fetch("/api/user/home-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          address: homeAddress || `${location.latitude}, ${location.longitude}`
        }),
      });
      
      if (!response.ok) throw new Error("Failed to set home location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/home-location"] });
      toast({
        title: "Home Location Set",
        description: "Your home location has been saved successfully",
      });
      setIsSettingHomeLocation(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set home location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send OTP for phone verification
  const sendPhoneOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      
      if (!response.ok) throw new Error("Failed to send OTP");
      return response.json();
    },
    onSuccess: () => {
      setIsPhoneOtpDialogOpen(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your phone number",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please check your phone number.",
        variant: "destructive",
      });
    },
  });

  // Send OTP for email verification
  const sendEmailOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) throw new Error("Failed to send OTP");
      return response.json();
    },
    onSuccess: () => {
      setIsEmailOtpDialogOpen(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your email address",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please check your email address.",
        variant: "destructive",
      });
    },
  });

  // Verify phone OTP
  const verifyPhoneOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/verify-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp: phoneOtp }),
      });
      
      if (!response.ok) throw new Error("Invalid OTP");
      return response.json();
    },
    onSuccess: () => {
      setPhoneVerified(true);
      setIsPhoneOtpDialogOpen(false);
      setPhoneOtp("");
      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully",
      });
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save profile settings
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const userId = userSession.getUserId();
      const profileData = {
        firstName,
        lastName,
        email,
        phoneNumber,
        emergencyMessage,
        profilePicture: null
      };

      const response = await fetch(`/api/user/profile?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) throw new Error("Failed to save profile");
      return response.json();
    },
    onSuccess: (data) => {
      // If the actualUserId is different, update the session to the correct user
      if (data.actualUserId && data.actualUserId !== userSession.getUserId()) {
        userSession.setUserId(data.actualUserId);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Settings Saved",
        description: "Your profile and safety settings have been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Verify email OTP
  const verifyEmailOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp }),
      });
      
      if (!response.ok) throw new Error("Invalid OTP");
      return response.json();
    },
    onSuccess: () => {
      setEmailVerified(true);
      setIsEmailOtpDialogOpen(false);
      setEmailOtp("");
      toast({
        title: "Email Verified",
        description: "Your email address has been verified successfully",
      });
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyTheme = (selectedTheme: string) => {
    setTheme(selectedTheme);
    const root = document.documentElement;
    
    if (selectedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    switch (selectedTheme) {
      case "dark":
        root.style.setProperty("--background", "222.2 84% 4.9%");
        root.style.setProperty("--foreground", "210 40% 98%");
        break;
      case "pink":
        root.style.setProperty("--background", "330 100% 98%");
        root.style.setProperty("--foreground", "330 30% 10%");
        break;
      case "purple":
        root.style.setProperty("--background", "270 100% 98%");
        root.style.setProperty("--foreground", "270 30% 10%");
        break;
      default:
        root.style.setProperty("--background", "0 0% 100%");
        root.style.setProperty("--foreground", "222.2 84% 4.9%");
    }
    
    toast({
      title: "Theme Updated",
      description: `Switched to ${selectedTheme} theme`,
    });
  };

  const testVoiceRecognition = () => {
    if (isListening) {
      stopListening();
      toast({
        title: "Voice Recognition Stopped",
        description: "Voice monitoring has been disabled",
      });
    } else {
      startListening();
      toast({
        title: "Voice Recognition Started",
        description: "Say 'help me' or 'emergency' to test voice SOS",
      });
    }
  };

  const handleSave = () => {
    saveProfileMutation.mutate();
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your safety preferences and profile</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-2xl">
                {firstName[0]}{lastName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-xl">{firstName} {lastName}</CardTitle>
          <CardDescription>{email}</CardDescription>
          <Badge className="bg-green-100 text-green-700 mx-auto mt-2">
            Safety Profile Active
          </Badge>
        </CardHeader>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and emergency details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select 
                  value={selectedCountryCode} 
                  onValueChange={setSelectedCountryCode}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+86">🇨🇳 +86</SelectItem>
                    <SelectItem value="+81">🇯🇵 +81</SelectItem>
                    <SelectItem value="+49">🇩🇪 +49</SelectItem>
                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                    <SelectItem value="+61">🇦🇺 +61</SelectItem>
                    <SelectItem value="+55">🇧🇷 +55</SelectItem>
                    <SelectItem value="+7">🇷🇺 +7</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber.startsWith(selectedCountryCode) ? phoneNumber.substring(selectedCountryCode.length) : phoneNumber}
                  onChange={(e) => {
                    const cleanNumber = e.target.value.replace(/\D/g, '');
                    setPhoneNumber(selectedCountryCode + cleanNumber);
                  }}
                  placeholder="7892937490"
                  className="flex-1 min-w-[200px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-mono">{phoneNumber}</span>
                <div className="flex items-center gap-2">
                  {phoneVerified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="emergency-message">Emergency Message Template</Label>
            <Textarea
              id="emergency-message"
              value={emergencyMessage}
              onChange={(e) => setEmergencyMessage(e.target.value)}
              placeholder="Custom message sent during emergencies"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use [LIVE_LOCATION], [TIMESTAMP], and [STREAM_LINK] for dynamic content
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Home Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Home Location
          </CardTitle>
          <CardDescription>
            Set your home location for quick emergency navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="homeAddress">Home Address</Label>
            <div className="flex gap-2">
              <Input
                id="homeAddress"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                placeholder={homeLocation ? "Home location set" : "Enter home address or use current location"}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setHomeLocationMutation.mutate()}
                disabled={!location || setHomeLocationMutation.isPending}
              >
                {setHomeLocationMutation.isPending ? "Setting..." : "Use Current"}
              </Button>
            </div>
            {homeLocation && (
              <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-center text-sm text-green-800">
                  <Check className="w-4 h-4 mr-2" />
                  Home location set: {homeLocation.address || `${homeLocation.latitude}, ${homeLocation.longitude}`}
                </div>
              </div>
            )}
            {!location && (
              <p className="text-xs text-gray-500 mt-1">
                Allow location access to set current location as home
              </p>
            )}
          </div>
        </CardContent>
      </Card>



      {/* IoT Device Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Watch className="w-5 h-5 mr-2" />
            Smart Device Connection
          </CardTitle>
          <CardDescription>
            Connect your smartwatch and IoT devices for enhanced safety monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Smartwatch Integration</Label>
              <p className="text-sm text-gray-500">
                Connect your smartwatch for health monitoring and emergency triggers
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/iot-devices'}
              className="flex items-center gap-2"
            >
              <Bluetooth className="w-4 h-4" />
              Manage Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the app's look and feel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">App Theme</Label>
            <Select value={theme} onValueChange={applyTheme}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center">
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center">
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="pink">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 bg-pink-500 rounded"></div>
                    Pink
                  </div>
                </SelectItem>
                <SelectItem value="purple">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 bg-purple-500 rounded"></div>
                    Purple
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Safety Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Safety Features
          </CardTitle>
          <CardDescription>
            Configure emergency response and safety features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="voice-activation">Voice SOS Activation</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Activate SOS by saying "help me" or "emergency"
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="voice-activation"
                checked={voiceActivation}
                onCheckedChange={setVoiceActivation}
              />
              {isSupported && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testVoiceRecognition}
                  className={isListening ? "bg-red-50 text-red-600" : ""}
                >
                  <Mic className="w-3 h-3 mr-1" />
                  {isListening ? "Stop Test" : "Test Voice"}
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-livestream">Auto Live Streaming</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically start live streaming during emergencies
              </p>
            </div>
            <Switch
              id="auto-livestream"
              checked={autoLiveStream}
              onCheckedChange={setAutoLiveStream}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="location-sharing">Live Location Sharing</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share real-time location during emergencies
              </p>
            </div>
            <Switch
              id="location-sharing"
              checked={locationSharing}
              onCheckedChange={setLocationSharing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Smartwatch Integration */}
      <SmartwatchIntegration onSosTriggered={handleSmartwatchSOS} />

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Push Notifications</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive emergency and safety alerts
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound-alerts">Sound Alerts</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Play sound for emergency notifications
              </p>
            </div>
            <Switch
              id="sound-alerts"
              checked={soundAlerts}
              onCheckedChange={setSoundAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Emergency Services
          </CardTitle>
          <CardDescription>
            Quick access to emergency helplines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-16 flex flex-col hover:bg-red-50"
              onClick={() => window.location.href = "tel:100"}
            >
              <span className="font-bold text-lg text-red-600">100</span>
              <span className="text-xs">Police</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col hover:bg-pink-50"
              onClick={() => window.location.href = "tel:1091"}
            >
              <span className="font-bold text-lg text-pink-600">1091</span>
              <span className="text-xs">Women's Helpline</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col hover:bg-blue-50"
              onClick={() => window.location.href = "tel:108"}
            >
              <span className="font-bold text-lg text-blue-600">108</span>
              <span className="text-xs">Medical Emergency</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Recognition Status */}
      {isSupported && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="font-medium">Voice Recognition Status</p>
                  <p className="text-sm text-gray-600">
                    {isListening ? "Listening for emergency commands..." : "Voice monitoring inactive"}
                  </p>
                </div>
              </div>
              <Badge variant={isListening ? "default" : "secondary"}>
                {isListening ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={handleSave} 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
        >
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
        
        <Button 
          onClick={() => window.location.href = "/auth"}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Authentication Settings
        </Button>
      </div>

      {/* Phone OTP Verification Dialog */}
      <Dialog open={isPhoneOtpDialogOpen} onOpenChange={setIsPhoneOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Phone Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit verification code sent to {phoneNumber}
            </p>
            <Input
              placeholder="Enter 6-digit OTP"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value)}
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => verifyPhoneOtpMutation.mutate()}
                disabled={phoneOtp.length !== 6 || verifyPhoneOtpMutation.isPending}
                className="flex-1"
              >
                {verifyPhoneOtpMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
              <Button
                variant="outline"
                onClick={() => sendPhoneOtpMutation.mutate()}
                disabled={sendPhoneOtpMutation.isPending}
              >
                {sendPhoneOtpMutation.isPending ? "Sending..." : "Resend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}