import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Video, 
  Clock, 
  Shield, 
  Heart,
  MessageCircle,
  Navigation,
  CheckCircle,
  Bell,
  Eye
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
  streamUrl?: string;
  message?: string;
  timestamp?: string;
  videoUrl?: string;
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

export default function ParentDashboard() {
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [childrenData, setChildrenData] = useState<ChildProfile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active emergency alerts for all children
  const { data: emergencyAlerts = [], isLoading } = useQuery<EmergencyAlert[]>({
    queryKey: ["/api/parent/emergency-alerts"],
    refetchInterval: 5000, // Check for new alerts every 5 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch children profiles and their status
  const { data: children = [] } = useQuery<ChildProfile[]>({
    queryKey: ["/api/parent/children"],
    refetchInterval: 30000, // Update children status every 30 seconds
  });

  // Mark alert as responding
  const respondToAlert = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await fetch(`/api/emergency-alerts/${alertId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'responding' })
      });
      if (!response.ok) throw new Error('Failed to respond to alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/emergency-alerts"] });
      toast({
        title: "Response Confirmed",
        description: "Child has been notified that you're responding",
      });
    }
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await fetch(`/api/emergency-alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/emergency-alerts"] });
      toast({
        title: "Alert Resolved",
        description: "Emergency has been marked as resolved",
      });
    }
  });

  // Auto-play emergency notification sound
  useEffect(() => {
    const activeAlerts = emergencyAlerts?.filter((alert: EmergencyAlert) => alert.status === 'active') || [];
    if (activeAlerts.length > 0) {
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUCBzqN1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUCBz6N1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmU=');
      audio.play().catch(console.error);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('🚨 EMERGENCY ALERT', {
          body: `${activeAlerts[0].childName || 'Child'} has triggered an emergency SOS`,
          icon: '/emergency-icon.png'
        });
      }
    }
  }, [emergencyAlerts]);

  // Request notification permission on load
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getAlertSeverity = (alert: EmergencyAlert) => {
    const minutesAgo = (Date.now() - new Date(alert.createdAt).getTime()) / (1000 * 60);
    if (minutesAgo < 5 && alert.status === 'active') return 'critical';
    if (alert.status === 'active') return 'high';
    if (alert.status === 'responding') return 'medium';
    return 'low';
  };

  const formatTimeAgo = (timestamp: string) => {
    const minutesAgo = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60));
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parent Safety Dashboard</h1>
              <p className="text-gray-600">Monitor and respond to your children's safety alerts</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={emergencyAlerts?.some((a: EmergencyAlert) => a.status === 'active') ? 'destructive' : 'secondary'}>
                {emergencyAlerts?.filter((a: EmergencyAlert) => a.status === 'active').length || 0} Active Alerts
              </Badge>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
            </div>
          </div>
        </div>

        {/* Active Emergency Alerts */}
        {emergencyAlerts?.some((alert: EmergencyAlert) => alert.status === 'active') && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <span className="font-semibold">ACTIVE EMERGENCY:</span> Your child has triggered an SOS alert. Please respond immediately.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Emergency Alerts List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                  Emergency Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading alerts...</div>
                ) : emergencyAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>All children are safe</p>
                    <p className="text-sm">No active emergency alerts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emergencyAlerts?.map((alert: EmergencyAlert) => (
                      <div 
                        key={alert.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          getAlertSeverity(alert) === 'critical' ? 'bg-red-100 border-red-300' :
                          getAlertSeverity(alert) === 'high' ? 'bg-orange-50 border-orange-200' :
                          getAlertSeverity(alert) === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={
                                alert.status === 'active' ? 'destructive' :
                                alert.status === 'responding' ? 'default' : 'secondary'
                              }>
                                {alert.status.toUpperCase()}
                              </Badge>
                              <span className="font-semibold">{alert.childName || 'Child'}</span>
                              <span className="text-sm text-gray-500">{formatTimeAgo(alert.createdAt)}</span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                {alert.address}
                              </div>
                              <div className="flex items-center text-sm">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                {new Date(alert.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            {alert.status === 'active' && (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  respondToAlert.mutate(alert.id);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Respond
                              </Button>
                            )}
                            
                            {alert.streamUrl && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(alert.streamUrl, '_blank');
                                }}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                View Stream
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`, '_blank');
                              }}
                            >
                              <Navigation className="w-4 h-4 mr-1" />
                              Navigate
                            </Button>
                            
                            {alert.status !== 'resolved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveAlert.mutate(alert.id);
                                }}
                                className="text-green-600 border-green-300"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Children Status Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-pink-500" />
                  Children Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {children?.map((child: ChildProfile) => (
                    <div key={child.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{child.name}</span>
                        <Badge variant={
                          child.status === 'safe' ? 'secondary' :
                          child.status === 'emergency' ? 'destructive' : 'outline'
                        }>
                          {child.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Last seen: {formatTimeAgo(child.lastSeen)}</div>
                        {child.currentLocation && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {child.currentLocation.address}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {children.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p>No children registered</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Add Child Profile
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    Emergency Services
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    Family Locations
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="w-4 h-4 mr-2" />
                    Live Tracking
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Safety Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Alert Details Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Emergency Alert Details</h2>
                  <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                    Close
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Alert Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Child:</span> {selectedAlert.childName || 'Unknown'}</div>
                      <div><span className="font-medium">Time:</span> {new Date(selectedAlert.createdAt).toLocaleString()}</div>
                      <div><span className="font-medium">Type:</span> {selectedAlert.triggerType}</div>
                      <div><span className="font-medium">Status:</span> {selectedAlert.status}</div>
                      {selectedAlert.triggerType === 'voice_detection' && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <span className="font-medium text-red-800">Voice SOS:</span>
                          <span className="text-red-700 ml-1">Automatic distress detection triggered</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Address:</span> {selectedAlert.address}</div>
                      <div><span className="font-medium">Coordinates:</span> {selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                </div>

                {/* Emergency Video Recording Display */}
                {selectedAlert.videoUrl && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2 text-red-700">Emergency Video Recording</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 mb-3">
                        Video automatically recorded during emergency alert
                      </p>
                      <div className="max-w-md mx-auto">
                        <video 
                          src={selectedAlert.videoUrl} 
                          controls
                          className="w-full rounded-lg shadow-lg border-2 border-red-300"
                          style={{ maxHeight: '300px' }}
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Recorded: {new Date(selectedAlert.timestamp || selectedAlert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => window.open(`https://maps.google.com/?q=${selectedAlert.latitude},${selectedAlert.longitude}`, '_blank')}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Navigate to Location
                  </Button>
                  
                  {selectedAlert.streamUrl && (
                    <Button variant="outline" onClick={() => window.open(selectedAlert.streamUrl, '_blank')}>
                      <Video className="w-4 h-4 mr-2" />
                      View Live Stream
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={() => window.open(`tel:100`)}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Emergency Services
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}