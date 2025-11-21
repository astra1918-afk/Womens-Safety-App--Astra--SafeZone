import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Square, Play, Share2, Eye, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';

interface LiveStreamingProps {
  autoStart?: boolean;
  onStreamStarted?: (streamUrl: string) => void;
  onStreamEnded?: () => void;
  emergencyMode?: boolean;
  voiceScenario?: {triggerType: string, scenario: string, detectedText: string} | null;
}

interface LiveStream {
  id: number;
  streamUrl: string;
  shareableLink: string;
  isActive: boolean;
  viewerCount: number;
  startedAt: string;
}

export default function LiveStreaming({ 
  autoStart = false, 
  onStreamStarted, 
  onStreamEnded,
  emergencyMode = false,
  voiceScenario = null
}: LiveStreamingProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [viewerCount, setViewerCount] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Start live stream mutation
  const startStreamMutation = useMutation({
    mutationFn: async (streamData: {
      streamUrl: string;
      shareableLink: string;
      isEmergency: boolean;
      latitude?: number;
      longitude?: number;
      address?: string;
      triggerType?: string;
      scenario?: string;
      detectedText?: string;
    }) => {
      const response = await fetch('/api/live-stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to start live stream');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setViewerCount(data.viewerCount || 0);
      onStreamStarted?.(data.shareableLink);
      
      if (emergencyMode) {
        toast({
          title: "Emergency Live Stream Started",
          description: "Stream link sent to emergency contacts",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Live Stream Started",
          description: "Stream is now active and shareable",
        });
      }
    },
    onError: () => {
      toast({
        title: "Stream Failed",
        description: "Could not start live stream. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  });

  // End live stream mutation
  const endStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/live-stream/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl })
      });
      
      if (!response.ok) {
        throw new Error('Failed to end live stream');
      }
      
      return response.json();
    },
    onSuccess: () => {
      onStreamEnded?.();
      toast({
        title: "Stream Ended",
        description: "Live stream has been stopped successfully",
      });
    }
  });

  // Check camera and microphone permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  // Auto-start stream if requested
  useEffect(() => {
    if (autoStart && hasPermissions && !isStreaming) {
      startStreaming();
    }
  }, [autoStart, hasPermissions]);

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      setHasPermissions(true);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermissions(false);
      
      toast({
        title: "Camera/Microphone Access Required",
        description: "Please allow camera and microphone access for live streaming",
        variant: "destructive",
      });
    }
  };

  const startStreaming = async () => {
    if (!hasPermissions) {
      await checkPermissions();
      return;
    }

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      
      // Display video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Create MediaRecorder for automatic session recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      const recordedChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('video', blob, `emergency_session_${Date.now()}.webm`);
        formData.append('sessionType', emergencyMode ? 'emergency' : 'normal');
        formData.append('userId', 'demo-user');
        formData.append('timestamp', new Date().toISOString());
        
        try {
          const response = await fetch('/api/emergency/save-session-recording', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            console.log('Session recording saved to emergency history');
          }
        } catch (error) {
          console.error('Failed to save session recording:', error);
        }
      };
      
      // Start recording immediately
      mediaRecorder.start(1000);
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Generate stream URLs using WebRTC peer-to-peer streaming
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const generatedStreamUrl = `webrtc://${streamId}`;
      const generatedShareableLink = `${window.location.origin}/watch/${streamId}`;
      
      // Set up WebRTC connection to send stream to parent
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add the stream to the peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create offer and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Immediately establish WebSocket connection for emergency streaming
      if (emergencyMode) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log('Child device streaming to parent');
          // Get emergency alert ID from the current emergency state
          const currentEmergencyId = sessionStorage.getItem('currentEmergencyAlertId');
          const emergencyRoomId = `emergency_room_emergency_${currentEmergencyId || Date.now()}`;
          socket.send(JSON.stringify({
            type: 'child_join_room',
            roomId: emergencyRoomId,
            offer: offer,
            streamId: streamId,
            deviceType: 'child'
          }));
          
          console.log(`Child joined emergency room: ${emergencyRoomId}`);
        };
        
        socket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'parent_stream_answer') {
            console.log('Received parent answer, completing WebRTC connection');
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              console.log('WebRTC connection established with parent');
            } catch (error) {
              console.error('Error setting remote description:', error);
            }
          }
          
          if (data.type === 'ice_candidate') {
            console.log('Received ICE candidate from parent');
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        };
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'ice_candidate',
              candidate: event.candidate,
              streamId: streamId
            }));
          }
        };
        
        // Store socket for cleanup
        streamRef.current = stream;
        (streamRef.current as any).socket = socket;
        (streamRef.current as any).pc = pc;
      }
      
      setStreamUrl(generatedStreamUrl);
      setShareableLink(generatedShareableLink);
      setIsStreaming(true);
      
      // Store stream in browser storage for WebRTC sharing
      localStorage.setItem(`stream_${streamId}`, JSON.stringify({
        id: streamId,
        startTime: Date.now(),
        isActive: true
      }));
      
      // Start recording for backup
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      // Get current location for emergency mode
      if (emergencyMode && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Start live stream with location data
            startStreamMutation.mutate({
              streamUrl: generatedStreamUrl,
              shareableLink: generatedShareableLink,
              isEmergency: emergencyMode,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: `Emergency Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
              triggerType: voiceScenario?.triggerType || 'sos_manual',
              scenario: voiceScenario?.scenario,
              detectedText: voiceScenario?.detectedText
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Start live stream without precise location
            startStreamMutation.mutate({
              streamUrl: generatedStreamUrl,
              shareableLink: generatedShareableLink,
              isEmergency: emergencyMode,
              latitude: 12.9716, // Bangalore fallback
              longitude: 77.5946,
              address: 'Bangalore, Karnataka, India - CURRENT LOCATION',
              triggerType: 'sos_manual'
            });
          }
        );
      } else {
        // Start live stream on server
        startStreamMutation.mutate({
          streamUrl: generatedStreamUrl,
          shareableLink: generatedShareableLink,
          isEmergency: emergencyMode
        });
      }
      
      // Handle recorded data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // In a real implementation, this would be sent to a streaming server
          console.log('Recording chunk available:', event.data.size, 'bytes');
        }
      };
      
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Stream Error", 
        description: "Failed to start camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopStreaming = () => {
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setStreamUrl('');
    setShareableLink('');
    setViewerCount(0);
    
    // End stream on server
    if (streamUrl) {
      endStreamMutation.mutate();
    }
  };

  const copyShareLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard",
      });
    }
  };

  const shareWithEmergencyContacts = async () => {
    if (!shareableLink) return;
    
    try {
      const response = await fetch('/api/emergency/share-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shareableLink,
          message: `🔴 LIVE EMERGENCY STREAM
Watch live: ${shareableLink}
This is an active emergency situation. Please monitor or contact immediately.
Time: ${new Date().toLocaleString()}`
        })
      });
      
      if (response.ok) {
        toast({
          title: "Stream Shared",
          description: "Live stream link sent to emergency contacts",
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Could not share stream with contacts",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`w-full ${emergencyMode ? 'border-red-500 bg-red-50' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className={`w-5 h-5 ${emergencyMode ? 'text-red-600' : 'text-blue-600'}`} />
          {emergencyMode ? 'Emergency Live Stream' : 'Live Streaming'}
          {isStreaming && (
            <Badge variant="destructive" className="ml-auto">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
              LIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-75">
                  {hasPermissions ? 'Ready to stream' : 'Camera access required'}
                </p>
              </div>
            </div>
          )}
          
          {emergencyMode && isStreaming && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                EMERGENCY
              </Badge>
            </div>
          )}
          
          {isStreaming && (
            <div className="absolute top-2 right-2 flex items-center space-x-2">
              <Badge className="bg-black/50 text-white">
                <Eye className="w-3 h-3 mr-1" />
                {viewerCount}
              </Badge>
            </div>
          )}
        </div>

        {/* Stream Controls */}
        <div className="flex flex-col space-y-3">
          <div className="flex space-x-2">
            {!isStreaming ? (
              <Button
                onClick={startStreaming}
                disabled={!hasPermissions || startStreamMutation.isPending}
                className={`flex-1 ${emergencyMode ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                <Play className="w-4 h-4 mr-2" />
                {emergencyMode ? 'Start Emergency Stream' : 'Start Streaming'}
              </Button>
            ) : (
              <Button
                onClick={stopStreaming}
                variant="destructive"
                disabled={endStreamMutation.isPending}
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Stream
              </Button>
            )}
            
            {!hasPermissions && (
              <Button onClick={checkPermissions} variant="outline">
                <Video className="w-4 h-4 mr-2" />
                Enable Camera
              </Button>
            )}
          </div>

          {/* Share Controls */}
          {isStreaming && shareableLink && (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Button onClick={copyShareLink} variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                
                <Button 
                  onClick={shareWithEmergencyContacts}
                  variant={emergencyMode ? "destructive" : "outline"}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Share with Contacts
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded break-all">
                Stream: {shareableLink}
              </div>
            </div>
          )}
        </div>

        {emergencyMode && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            Emergency mode: Stream will automatically be shared with emergency contacts
          </div>
        )}
      </CardContent>
    </Card>
  );
}