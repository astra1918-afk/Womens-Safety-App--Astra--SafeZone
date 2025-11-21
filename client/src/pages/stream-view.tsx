import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VideoIcon, Users, Clock, MapPin, AlertTriangle, Phone } from 'lucide-react';
import { useRoute } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

interface StreamData {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  streamUrl: string;
  shareLink: string;
  isActive: boolean;
  createdAt: string;
  endedAt?: string;
  emergencyAlertId?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export default function StreamView() {
  const [match, params] = useRoute('/stream/:streamId');
  const [viewerCount, setViewerCount] = useState(1);
  
  const { data: stream, isLoading, error } = useQuery<StreamData>({
    queryKey: ['/api/live-stream', params?.streamId],
    enabled: !!params?.streamId,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  useEffect(() => {
    // Simulate viewer count changes
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <VideoIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Loading stream...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Stream Not Found</h2>
              <p className="text-gray-600 mb-4">
                This stream may have ended or the link is invalid.
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-red-500 hover:bg-red-600"
              >
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Emergency Alert Banner */}
        {stream.emergencyAlertId && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Emergency Live Stream</h3>
                  <p className="text-red-700 text-sm">This is an emergency broadcast. If you know this person, please contact them or emergency services.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stream Info Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <VideoIcon className="w-6 h-6 text-red-600" />
                  {stream.emergencyAlertId ? 'Emergency Stream' : 'Live Stream'}
                  {stream.isActive && (
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started {formatDistanceToNow(new Date(stream.createdAt))} ago
                  </span>
                </div>
              </div>
              
              {stream.emergencyAlertId && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => window.open('tel:112', '_self')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Emergency
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Video Stream */}
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {stream.isActive ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <VideoIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Live video stream would display here</p>
                    <p className="text-sm opacity-75 mt-2">Stream URL: {stream.streamUrl}</p>
                    {stream.emergencyAlertId && (
                      <div className="mt-4 p-3 bg-red-600 rounded">
                        <p className="font-semibold">Emergency Broadcast Active</p>
                        <p className="text-sm">Broadcasting from: {stream.userName}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <VideoIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Stream has ended</p>
                    <p className="text-sm opacity-75 mt-2">
                      Ended {stream.endedAt ? formatDistanceToNow(new Date(stream.endedAt)) + ' ago' : 'recently'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Streamer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Broadcaster Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Name: </span>
                <span>{stream.userName}</span>
              </div>
              <div>
                <span className="font-medium">Email: </span>
                <span>{stream.userEmail}</span>
              </div>
              {stream.location && (
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location: 
                  </span>
                  <span className="ml-5">{stream.location.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            Back to Home
          </Button>
          {stream.emergencyAlertId && (
            <Button 
              onClick={() => {
                const message = `I received an emergency stream link from ${stream.userName} (${stream.userEmail}). Please check on them immediately.`;
                window.open(`tel:112`, '_self');
              }}
              variant="destructive"
              className="flex-1"
            >
              Report Emergency
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}