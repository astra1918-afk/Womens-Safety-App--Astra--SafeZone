import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import WebRTCViewer from '@/components/webrtc-viewer';

interface StreamData {
  id: number;
  streamUrl: string;
  shareLink: string;
  isActive: boolean;
  userName: string;
  userEmail: string;
  startedAt: string;
}

export default function WatchStream() {
  const { streamId } = useParams();
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  // Check for stream data in localStorage first (WebRTC streams)
  useEffect(() => {
    if (streamId) {
      const localStreamData = localStorage.getItem(`webrtc_stream_${streamId}`);
      if (localStreamData) {
        const parsedData = JSON.parse(localStreamData);
        setStreamInfo(parsedData);
        setIsEmergency(parsedData.emergency || false);
      }
    }
  }, [streamId]);

  // Fallback: Fetch stream details from database
  const { data: stream, isLoading } = useQuery<StreamData>({
    queryKey: [`/api/live-stream/${streamId}`],
    enabled: !!streamId && !streamInfo
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stream...</p>
        </div>
      </div>
    );
  }

  // Use streamInfo from localStorage or fallback to API data
  const displayStream = streamInfo || stream;
  const streamTitle = isEmergency ? "Emergency Live Stream" : "Live Stream";
  const userName = displayStream?.streamerId || stream?.userName || "User";

  if (!displayStream && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Stream Not Found</h2>
            <p className="text-gray-600 mb-4">
              The live stream you're looking for is not available or has ended.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Stream Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{streamTitle}</h1>
            <div className="flex items-center space-x-4">
              {isEmergency && (
                <Badge variant="destructive" className="animate-pulse">
                  🚨 EMERGENCY
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{userName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>
                Started {displayStream?.startTime 
                  ? new Date(displayStream.startTime).toLocaleString('en-IN') 
                  : new Date().toLocaleString('en-IN')
                }
              </span>
            </div>
          </div>
        </div>

        {/* WebRTC Video Player */}
        {streamId && (
          <WebRTCViewer 
            streamId={streamId} 
            emergency={isEmergency}
          />
        )}

        {/* Stream Info */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Technology:</span>
                <span className="text-green-600">WebRTC P2P (Free)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stream ID:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{streamId}</code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This stream uses peer-to-peer technology for free, direct video streaming
                without requiring external services or subscriptions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}