import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Users, Share2 } from 'lucide-react';

interface WebRTCStreamerProps {
  emergencyMode?: boolean;
  onStreamStart?: (streamData: any) => void;
  onStreamEnd?: () => void;
}

export default function WebRTCStreamer({ emergencyMode = false, onStreamStart, onStreamEnd }: WebRTCStreamerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startStream = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: emergencyMode ? 'environment' : 'user'
        },
        audio: true
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Generate emergency-specific stream ID
      const newStreamId = emergencyMode ? 
        `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` :
        `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setStreamId(newStreamId);
      
      const newShareLink = emergencyMode ? 
        `${window.location.origin}/emergency-watch/${newStreamId}` :
        `${window.location.origin}/watch/${newStreamId}`;
      setShareLink(newShareLink);

      // Store stream data in localStorage for peer discovery
      localStorage.setItem(`webrtc_stream_${newStreamId}`, JSON.stringify({
        id: newStreamId,
        startTime: Date.now(),
        isActive: true,
        emergency: emergencyMode,
        streamerId: 'demo-user'
      }));

      // Setup WebSocket for signaling (using same domain)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      try {
        socketRef.current = new WebSocket(wsUrl);
        
        socketRef.current.onopen = () => {
          console.log('WebSocket connected for signaling');
          socketRef.current?.send(JSON.stringify({
            type: 'register_streamer',
            streamId: newStreamId,
            emergency: emergencyMode
          }));
        };

        socketRef.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          await handleSignalingMessage(data);
        };
      } catch (error) {
        console.log('WebSocket not available, using localStorage signaling');
      }

      setIsStreaming(true);

      // Callback to parent component
      if (onStreamStart) {
        onStreamStart({
          streamId: newStreamId,
          streamUrl: `webrtc://${newStreamId}`,
          shareLink: newShareLink,
          isActive: true
        });
      }

    } catch (error) {
      console.error('Error starting stream:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const handleSignalingMessage = async (data: any) => {
    if (!peerConnectionRef.current) {
      setupPeerConnection();
    }

    const pc = peerConnectionRef.current!;

    switch (data.type) {
      case 'viewer_offer':
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'streamer_answer',
            answer: answer,
            streamId: streamId
          }));
        }
        break;

      case 'viewer_ice_candidate':
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        break;

      case 'viewer_connected':
        setViewerCount(prev => prev + 1);
        break;

      case 'viewer_disconnected':
        setViewerCount(prev => Math.max(0, prev - 1));
        break;
    }
  };

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add stream tracks to peer connection
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'streamer_ice_candidate',
          candidate: event.candidate,
          streamId: streamId
        }));
      }
    };

    peerConnectionRef.current = pc;
  };

  const stopStream = () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'stream_ended',
        streamId: streamId
      }));
      socketRef.current.close();
      socketRef.current = null;
    }

    // Clean up localStorage
    if (streamId) {
      localStorage.removeItem(`webrtc_stream_${streamId}`);
    }

    setIsStreaming(false);
    setViewerCount(0);
    setStreamId('');
    setShareLink('');

    if (onStreamEnd) {
      onStreamEnd();
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Stream link copied to clipboard!');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Video className="w-5 h-5" />
            <span>Free WebRTC Live Stream</span>
          </span>
          {isStreaming && (
            <div className="flex items-center space-x-2">
              <Badge variant="destructive" className="animate-pulse">
                🔴 LIVE
              </Badge>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{viewerCount}</span>
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              autoPlay
              playsInline
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <VideoOff className="w-12 h-12 text-white" />
              </div>
            )}
            {emergencyMode && isStreaming && (
              <div className="absolute top-2 left-2">
                <Badge variant="destructive" className="animate-pulse">
                  🚨 EMERGENCY STREAM
                </Badge>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex space-x-2">
            {!isStreaming ? (
              <Button 
                onClick={startStream}
                className={emergencyMode ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                size="lg"
              >
                <Video className="w-4 h-4 mr-2" />
                {emergencyMode ? 'Start Emergency Stream' : 'Start Stream'}
              </Button>
            ) : (
              <>
                <Button onClick={stopStream} variant="destructive" size="lg">
                  <VideoOff className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
                <Button onClick={copyShareLink} variant="outline" size="lg">
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </>
            )}
          </div>

          {/* Stream Info */}
          {isStreaming && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Stream Link:</strong>
              </p>
              <code className="text-xs bg-white p-2 rounded border block break-all">
                {shareLink}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Share this link with others to let them view your stream instantly.
                No registration or external services required.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}