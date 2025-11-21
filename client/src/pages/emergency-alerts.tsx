import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, MapPin, Clock, CheckCircle, Video, Radio, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmergencyAlert {
  id: number;
  childName: string;
  childId: number;
  type: string;
  triggerType: string;
  message: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  timestamp: string;
  status: 'active' | 'resolved';
  isResolved: boolean;
  audioUrl?: string;
  videoUrl?: string;
  liveStreamUrl?: string;
  canStartStream?: boolean;
}

export default function EmergencyAlerts() {
  const [activeTab, setActiveTab] = useState("active");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeAlerts = [], isLoading: loadingActive } = useQuery({
    queryKey: ["/api/parent/emergency-alerts", { status: "active" }],
    queryFn: () => fetch("/api/parent/emergency-alerts?status=active").then(res => res.json()),
  });

  const { data: resolvedAlerts = [], isLoading: loadingResolved } = useQuery({
    queryKey: ["/api/parent/emergency-alerts", { status: "resolved" }],
    queryFn: () => fetch("/api/parent/emergency-alerts?status=resolved").then(res => res.json()),
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await fetch(`/api/parent/emergency-alerts/${alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    },
  });

  const startLiveStreamMutation = useMutation({
    mutationFn: async (childId: number) => {
      const response = await fetch(`/api/parent/start-live-stream/${childId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to start live stream");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Live Stream Started",
        description: "Emergency monitoring stream is now active",
      });
      window.open(data.streamUrl, '_blank');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start live stream",
        variant: "destructive",
      });
    },
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "voice_detection":
      case "audio_trigger":
        return <Radio className="h-4 w-4" />;
      case "sos_manual":
      case "panic_button":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "voice_detection":
      case "audio_trigger":
        return "bg-purple-500";
      case "sos_manual":
      case "panic_button":
        return "bg-red-500";
      case "geofence_exit":
        return "bg-orange-500";
      default:
        return "bg-yellow-500";
    }
  };

  const renderAlert = (alert: EmergencyAlert) => (
    <Card key={alert.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getAlertColor(alert.type)} text-white`}>
              {getAlertIcon(alert.type)}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {alert.childName}
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(alert.timestamp)}</span>
                <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                  {alert.status}
                </Badge>
              </div>
            </div>
          </div>
          {alert.status === 'active' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
              {alert.canStartStream && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startLiveStreamMutation.mutate(alert.childId)}
                  disabled={startLiveStreamMutation.isPending}
                  className="w-full sm:w-auto text-xs"
                >
                  <Video className="h-3 w-3 mr-1" />
                  Live Stream
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => resolveAlertMutation.mutate(alert.id)}
                disabled={resolveAlertMutation.isPending}
                className="w-full sm:w-auto text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-3">{alert.message}</p>
        
        {/* Voice Detection Details */}
        {alert.type === 'voice_detection' && alert.audioUrl && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-red-600 font-semibold text-sm">🎤 Voice Detection Details:</span>
            </div>
            <div className="text-sm text-red-800">
              <strong>Detected Text:</strong> "{(() => {
                try {
                  const data = JSON.parse(alert.audioUrl || '{}');
                  return data.detectedText || data.scenario || 'Voice distress keyword detected';
                } catch {
                  return alert.audioUrl || 'Voice distress keyword detected';
                }
              })()}"
            </div>
            <div className="text-xs text-red-600 mt-1">
              Automatic trigger activated by voice recognition system
            </div>
          </div>
        )}
        
        {alert.location && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <MapPin className="h-4 w-4" />
            <span>{alert.location.address}</span>
          </div>
        )}
        {alert.audioUrl && (
          <div className="mb-2">
            <audio controls className="w-full">
              <source src={alert.audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        {alert.videoUrl && (
          <div className="mb-2">
            <video controls className="w-full max-w-md">
              <source src={alert.videoUrl} type="video/mp4" />
              Your browser does not support the video element.
            </video>
          </div>
        )}
        {alert.liveStreamUrl && alert.status === 'active' && (
          <div className="mt-3">
            <Badge className="bg-green-500 text-white">
              Live Stream Available
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/parent-dashboard'}
              className="flex items-center space-x-2 text-xs"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-xl sm:text-3xl font-bold truncate">Emergency Alerts</h1>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Badge variant="destructive" className="text-xs">
              {activeAlerts.length} Active
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {resolvedAlerts.length} Resolved
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Alerts ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved Alerts ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {loadingActive ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                <p className="text-gray-600">All emergency situations have been resolved.</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {activeAlerts.map(renderAlert)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          {loadingResolved ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : resolvedAlerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Resolved Alerts</h3>
                <p className="text-gray-600">No emergency alerts have been resolved yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {resolvedAlerts.map(renderAlert)}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}