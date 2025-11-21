import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Phone, MapPin, Users, Camera, Mic, AlertTriangle } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Astra
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your comprehensive AI-powered women's safety companion with emergency SOS, 
            live streaming, voice activation, and community safety features.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
          >
            Get Started - Sign In Securely
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
              <CardTitle className="text-lg">Emergency SOS</CardTitle>
              <CardDescription>
                Instant emergency alerts with location sharing to trusted contacts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Mic className="w-10 h-10 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Voice Activation</CardTitle>
              <CardDescription>
                Hands-free emergency activation with voice commands
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Camera className="w-10 h-10 text-green-500 mb-2" />
              <CardTitle className="text-lg">Live Streaming</CardTitle>
              <CardDescription>
                Real-time video streaming during emergencies for evidence
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Phone className="w-10 h-10 text-purple-500 mb-2" />
              <CardTitle className="text-lg">Emergency Contacts</CardTitle>
              <CardDescription>
                Manage trusted contacts for instant emergency notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <MapPin className="w-10 h-10 text-orange-500 mb-2" />
              <CardTitle className="text-lg">Safe Navigation</CardTitle>
              <CardDescription>
                Safe route planning with destination tracking and alerts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <Users className="w-10 h-10 text-teal-500 mb-2" />
              <CardTitle className="text-lg">Community Safety</CardTitle>
              <CardDescription>
                Share and receive safety alerts from your community
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Key Features List */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Complete Safety Solution</CardTitle>
            <CardDescription className="text-lg">
              Everything you need to stay safe and connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span>One-tap emergency SOS button</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Shake detection for hands-free alerts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Voice-activated emergency calls</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Fake call feature for discreet help</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Real-time location sharing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Live video streaming to contacts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Community safety alerts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Safe zone notifications</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Numbers */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-pink-50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-700">Emergency Helplines</CardTitle>
            <CardDescription>
              Important numbers for immediate help
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">100</div>
                <div className="text-sm text-gray-600">Police</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">1091</div>
                <div className="text-sm text-gray-600">Women's Helpline</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">108</div>
                <div className="text-sm text-gray-600">Medical Emergency</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center py-8">
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-12 py-4 text-lg"
          >
            Start Your Safety Journey
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Secure authentication powered by your existing account
          </p>
        </div>
      </div>
    </div>
  );
}