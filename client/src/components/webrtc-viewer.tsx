import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Phone, Eye } from 'lucide-react';

interface WebRTCViewerProps {
  streamId: string;
  emergency?: boolean;
}

export default function WebRTCViewer({ streamId, emergency = false }: WebRTCViewerProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectToStream();
    return () => {
      disconnect();
    };
  }, [streamId]);

  const connectToStream = async () => {
    setIsConnecting(true);
    setConnectionError('');

    try {
      // Check if stream exists in localStorage first
      const streamData = localStorage.getItem(`webrtc_stream_${streamId}`);
      if (!streamData) {
        setConnectionError('Stream not found or has ended');
        setIsConnecting(false);
        return;
      }

      const streamInfo = JSON.parse(streamData);
      if (!streamInfo.isActive) {
        setConnectionError('Stream has ended');
        setIsConnecting(false);
        return;
      }

      // Setup peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play();
          setIsConnected(true);
          setIsConnecting(false);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'viewer_ice_candidate',
            candidate: event.candidate,
            streamId: streamId
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false);
          setConnectionError('Connection lost');
        }
      };

      peerConnectionRef.current = pc;

      // Setup WebSocket for signaling
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      try {
        socketRef.current = new WebSocket(wsUrl);
        
        socketRef.current.onopen = async () => {
          // Send offer to streamer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socketRef.current?.send(JSON.stringify({
            type: 'viewer_offer',
            offer: offer,
            streamId: streamId
          }));
        };

        socketRef.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          await handleSignalingMessage(data);
        };

        socketRef.current.onerror = () => {
          setConnectionError('Unable to connect to stream. Trying alternative method...');
          tryDirectConnection();
        };
      } catch (error) {
        console.log('WebSocket not available, trying direct connection');
        tryDirectConnection();
      }

    } catch (error) {
      console.error('Error connecting to stream:', error);
      setConnectionError('Failed to connect to stream');
      setIsConnecting(false);
    }
  };

  const tryDirectConnection = () => {
    // Fallback: Try to connect using localStorage polling
    const checkInterval = setInterval(() => {
      const offerData = localStorage.getItem(`webrtc_offer_${streamId}`);
      if (offerData) {
        const { offer } = JSON.parse(offerData);
        handleDirectOffer(offer);
        clearInterval(checkInterval);
      }
    }, 1000);

    // Stop checking after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!isConnected) {
        setConnectionError('Stream is not available for viewing');
        setIsConnecting(false);
      }
    }, 10000);
  };

  const handleDirectOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Store answer for streamer to pick up
      localStorage.setItem(`webrtc_answer_${streamId}`, JSON.stringify({
        answer: answer,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error handling direct offer:', error);
    }
  };

  const handleSignalingMessage = async (data: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    switch (data.type) {
      case 'streamer_answer':
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        break;

      case 'streamer_ice_candidate':
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        break;

      case 'stream_ended':
        setIsConnected(false);
        setConnectionError('Stream has ended');
        break;
    }
  };

  const disconnect = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  };

  const retry = () => {
    disconnect();
    setTimeout(() => {
      connectToStream();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls
              autoPlay
              playsInline
            />
            
            {/* Status Overlays */}
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting to stream...</p>
                </div>
              </div>
            )}

            {connectionError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <p className="mb-4">{connectionError}</p>
                  <Button onClick={retry} variant="outline" className="text-black">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {isConnected && (
              <div className="absolute top-4 left-4">
                <Badge variant="destructive" className="animate-pulse">
                  🔴 LIVE
                </Badge>
              </div>
            )}

            {/* Emergency Indicator */}
            {emergency && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="bg-orange-600">
                  🚨 EMERGENCY
                </Badge>
              </div>
            )}

            {/* Viewer Count */}
            {isConnected && (
              <div className="absolute bottom-4 right-4">
                <div className="flex items-center space-x-1 bg-black/50 px-2 py-1 rounded text-white text-sm">
                  <Eye className="w-4 h-4" />
                  <span>Viewing</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      {emergency && isConnected && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Emergency Response</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => window.open('tel:100')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Police (100)
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => window.open('tel:108')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Ambulance (108)
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => window.open('tel:1091')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Women Helpline (1091)
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                <strong>Emergency Situation Active:</strong> If you can provide assistance 
                or have information about this emergency, please contact authorities immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Stream Status:</span>
            <span className={isConnected ? 'text-green-600' : 'text-gray-400'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <span>Technology:</span>
            <span>WebRTC P2P (Free)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}