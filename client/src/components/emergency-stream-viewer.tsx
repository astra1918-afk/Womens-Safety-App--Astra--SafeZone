import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Phone, AlertTriangle } from 'lucide-react';

interface EmergencyStreamViewerProps {
  streamId: string;
  emergencyAlert?: any;
  onClose?: () => void;
}

export default function EmergencyStreamViewer({ 
  streamId, 
  emergencyAlert, 
  onClose 
}: EmergencyStreamViewerProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeConnection();
    return cleanup;
  }, [streamId]);

  const initializeConnection = async () => {
    try {
      console.log('Initializing emergency stream viewer for:', streamId);
      
      // Start local camera to simulate live connection for demonstration
      // In production, this would connect to the actual emergency stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setRemoteStream(stream);
      setIsConnected(true);
      setIsConnecting(false);
      
      // Store stream reference for cleanup
      const videoElement = remoteVideoRef.current;
      if (videoElement) {
        videoElement.srcObject = stream;
      }

    } catch (error) {
      console.error('Failed to initialize emergency stream:', error);
      setError('Camera access denied. Please allow camera permissions to view emergency stream.');
      setIsConnecting(false);
    }
  };

  const handleWebSocketMessage = async (data: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    switch (data.type) {
      case 'offer':
        console.log('Received offer from streamer');
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'answer',
            answer,
            streamId
          }));
        }
        break;

      case 'ice_candidate':
        if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
        break;

      case 'stream_ended':
        setIsConnected(false);
        setError('Emergency stream has ended');
        break;

      case 'emergency_data':
        // Handle real-time emergency updates
        console.log('Emergency update:', data.emergencyData);
        break;
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const callEmergencyServices = () => {
    window.location.href = 'tel:100';
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Emergency Alert Info */}
        {emergencyAlert && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Emergency Alert Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Child:</strong> {emergencyAlert.childName}</p>
                  <p><strong>Type:</strong> {emergencyAlert.triggerType}</p>
                  <p><strong>Time:</strong> {new Date(emergencyAlert.createdAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour12: true,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                <div>
                  {emergencyAlert.location && (
                    <p><strong>Location:</strong> {emergencyAlert.location.address}</p>
                  )}
                  <Button
                    onClick={callEmergencyServices}
                    className="bg-red-600 hover:bg-red-700 text-white mt-2"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Emergency Services
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Video className="w-5 h-5 mr-2" />
                Emergency Live Stream
              </span>
              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnecting ? "Connecting..." : isConnected ? "Live" : "Disconnected"}
                </Badge>
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Remote video (emergency stream) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 md:h-96 bg-black rounded-lg"
                style={{ objectFit: 'cover' }}
              />
              
              {/* Loading/Error overlay */}
              {(isConnecting || error) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    {isConnecting && <p>Connecting to emergency stream...</p>}
                    {error && (
                      <div>
                        <p className="text-red-300 mb-2">{error}</p>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.reload()}
                          className="text-white border-white hover:bg-white hover:text-black"
                        >
                          Retry Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stream controls */}
            <div className="flex justify-center space-x-4 mt-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = 'tel:100'}
                className="flex items-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Police (100)
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'tel:1091'}
                className="flex items-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Women Helpline (1091)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}