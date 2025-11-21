import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/qr-scanner";

import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Clock, 
  Shield, 
  Heart,
  CheckCircle,
  Bell,
  User,
  Settings,
  Home,
  QrCode,
  Camera,
  LogOut,
  X
} from "lucide-react";

interface EmergencyAlert {
  id: number;
  userId: string;
  triggerType: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'active' | 'resolved' | 'responding';
  createdAt: string;
  resolvedAt?: string;
  childName?: string;
}

interface ChildProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastSeen: string;
  status: 'safe' | 'emergency' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
}

export default function SimpleParentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionCode, setConnectionCode] = useState("");
  const [currentView, setCurrentView] = useState<'home' | 'children' | 'settings'>('home');
  const [showScanner, setShowScanner] = useState(false);
  
  // No client-side persistence to prevent duplicates

  // Fetch connected children from server only
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["/api/parent/children"],
    refetchInterval: 30000,
  });

  // Use only server data to prevent duplicates
  const allChildren = (children as ChildProfile[]);

  // Fetch only active emergency alerts for home screen
  const { data: emergencyAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/parent/emergency-alerts", { status: "active" }],
    queryFn: () => fetch("/api/parent/emergency-alerts?status=active").then(res => res.json()),
    refetchInterval: 5000,
  });

  // Calculate active alerts count
  const activeAlertsCount = (emergencyAlerts as EmergencyAlert[]).filter(alert => alert.status === 'active').length;

  const connectChildMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/parent/connect-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionCode: code }),
      });
      if (!response.ok) throw new Error("Failed to connect child");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Child Connected",
        description: "Successfully connected to child's account",
      });
      setConnectionCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Please check the connection code and try again",
        variant: "destructive",
      });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await fetch(`/api/parent/emergency-alerts/${alertId}/resolve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to resolve alert");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "Emergency alert has been marked as resolved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/emergency-alerts"] });
    },
  });

  useEffect(() => {
    const activeAlerts = (emergencyAlerts as EmergencyAlert[]).filter(alert => alert.status === 'active');
    if (activeAlerts.length > 0) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwfCjSU2/DJeSkGLoLO8tzPkRALdLvw/5tnGQo8ltfz67JMHAZVN6');
        audio.play().catch(() => {});
      } catch (error) {
        // Audio not supported
      }
    }
  }, [emergencyAlerts]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200';
      case 'responding': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderHomeView = () => (
    <div className="space-y-6">
      {/* Emergency Alerts */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Active Emergency Alerts
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/emergency-alerts'}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Bell className="w-4 h-4 mr-2" />
              View All History
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center py-4">Loading alerts...</div>
          ) : (emergencyAlerts as EmergencyAlert[]).length === 0 ? (
            <div className="text-center py-4 text-green-700">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              No active emergencies
            </div>
          ) : (
            <div className="space-y-4">
              {(emergencyAlerts as any[]).map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-red-300 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">{alert.childName}</span>
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {alert.type}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      disabled={resolveAlertMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-700 whitespace-pre-line mb-3">
                    {alert.message}
                  </div>
                  
                  {/* Voice Detection Details */}
                  {alert.type === 'VOICE DISTRESS DETECTED' && alert.audioRecordingUrl && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-600 font-semibold text-sm">🎤 Voice Detection Details:</span>
                      </div>
                      <div className="text-sm text-red-800">
                        <strong>Detected Text:</strong> "{(() => {
                          try {
                            const data = JSON.parse(alert.audioRecordingUrl || '{}');
                            return data.detectedText || data.scenario || 'Voice distress keyword detected';
                          } catch {
                            return alert.audioRecordingUrl || 'Voice distress keyword detected';
                          }
                        })()}"
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Automatic trigger activated by voice recognition system
                      </div>
                    </div>
                  )}
                  
                  {alert.location && (
                    <div className="flex items-center space-x-2 text-sm text-blue-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <a 
                        href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View on Maps: {alert.location.address}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 w-full sm:w-auto text-xs"
                      onClick={() => {
                        // Open emergency watch page for this specific alert
                        const streamId = `emergency_${alert.id}`;
                        const watchUrl = `${window.location.origin}/emergency-watch/${streamId}`;
                        window.open(watchUrl, '_blank');
                      }}
                    >
                      🔴 Live Stream
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50 w-full sm:w-auto text-xs"
                      onClick={() => {
                        if (alert.location) {
                          const googleMapsUrl = `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}&z=18&t=h`;
                          window.open(googleMapsUrl, '_blank');
                        }
                      }}
                    >
                      📍 Google Maps
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Children Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Connected Children ({allChildren.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {childrenLoading ? (
            <div className="text-center py-4">Loading children...</div>
          ) : allChildren.length === 0 ? (
            <div className="text-center py-4 text-gray-600">
              <p className="mb-4">No children connected yet</p>
              <Button
                onClick={() => setCurrentView('children')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <User className="w-4 h-4 mr-2" />
                Connect Your First Child
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allChildren.map((child) => (
                <div key={child.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{child.name}</h4>
                      <p className="text-sm text-gray-600">{child.phone}</p>
                    </div>
                    <Badge className={getStatusColor(child.status)}>
                      {child.status}
                    </Badge>
                  </div>
                  {child.currentLocation && (
                    <div className="mt-2 text-sm text-gray-600">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {child.currentLocation.address}
                    </div>
                  )}
                </div>
              ))}
              <Button
                onClick={() => setCurrentView('children')}
                variant="outline"
                className="w-full mt-4"
              >
                <User className="w-4 h-4 mr-2" />
                Manage All Children
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderChildrenView = () => (
    <div className="space-y-6">
      {/* Connect Child */}
      <Card>
        <CardHeader>
          <CardTitle>Connect New Child</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!showScanner ? (
              <>
                <Input
                  placeholder="Enter connection code from child's app"
                  value={connectionCode}
                  onChange={(e) => setConnectionCode(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={() => connectChildMutation.mutate(connectionCode)}
                    disabled={!connectionCode || connectChildMutation.isPending}
                    className="flex-1"
                  >
                    {connectChildMutation.isPending ? "Connecting..." : "Connect Child"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                    className="flex-1"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                </div>
              </>
            ) : (
              <QRScanner
                onScanResult={(code) => {
                  setConnectionCode(code);
                  connectChildMutation.mutate(code);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connected Children Details */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Children</CardTitle>
        </CardHeader>
        <CardContent>
          {(children as ChildProfile[]).length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No children connected yet</p>
              <p className="text-sm">Use the connection code from your child's app</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(children as ChildProfile[]).map((child) => (
                <div key={child.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{child.name}</h3>
                    <Badge className={getStatusColor(child.status)}>
                      {child.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Phone className="w-3 h-3 mr-2" />
                      {child.phone}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-2" />
                      Last seen: {formatTime(child.lastSeen)}
                    </div>
                    {child.currentLocation && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-2" />
                        {child.currentLocation.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const exitParentDashboard = () => {
    // Close the current tab/window or redirect to a safe page
    if (window.opener) {
      window.close();
    } else {
      // If opened in same window, go to a neutral page
      window.location.href = '/';
    }
  };

  const renderSettingsView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parent Dashboard Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Notification Preferences</h4>
              <p className="text-sm text-gray-600">
                Emergency alerts are automatically enabled for immediate notifications
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-2">Connection Status</h4>
              <p className="text-sm text-gray-600">
                Connected to {(children as ChildProfile[]).length} child(ren)
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium mb-2">Support</h4>
              <p className="text-sm text-gray-600">
                For help or technical support, contact your child's safety app administrator
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit Parent Dashboard */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800">Dashboard Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium mb-2 text-red-800">Exit Parent Dashboard</h4>
              <p className="text-sm text-red-600 mb-4">
                This will close the parent monitoring interface. You can return anytime using the connection link.
              </p>
              <Button
                variant="destructive"
                onClick={exitParentDashboard}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit Parent Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">Parent Dashboard</h1>
                <p className="text-xs text-gray-600 truncate">Monitor your child's safety</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
                onClick={() => window.location.href = '/emergency-alerts'}
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {(emergencyAlerts as EmergencyAlert[]).filter(alert => alert.status === 'active').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {(emergencyAlerts as EmergencyAlert[]).filter(alert => alert.status === 'active').length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('home')}
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            variant={currentView === 'children' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('children')}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            Children
          </Button>
          <Button
            variant={currentView === 'settings' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('settings')}
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {currentView === 'home' && renderHomeView()}
        {currentView === 'children' && renderChildrenView()}
        {currentView === 'settings' && renderSettingsView()}
      </div>
    </div>
  );
}