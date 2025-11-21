import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Video, MapPin, Clock } from "lucide-react";

export default function EmergencyWatchPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const [emergencyAlertId, setEmergencyAlertId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (streamId) {
      // Extract emergency alert ID from stream ID (format: emergency_123 or emergency_123_timestamp)
      const match = streamId.match(/emergency_(\d+)/);
      if (match) {
        setEmergencyAlertId(match[1]);
      }
    }
  }, [streamId]);

  // Connect to child device stream via WebRTC
  useEffect(() => {
    const connectToChildDevice = async () => {
      try {
        console.log('Parent connecting to child device stream...');
        
        // Connect to WebSocket server
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log('Parent WebSocket connected');
          // Join the same emergency room as the child using emergency alert ID
          const emergencyRoomId = `emergency_room_emergency_${emergencyAlertId}`;
          socket.send(JSON.stringify({
            type: 'parent_join_room',
            roomId: emergencyRoomId,
            deviceType: 'parent'
          }));
          
          console.log(`Parent joined emergency room: ${emergencyRoomId}`);
        };
        
        socket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          console.log('Parent received message:', data.type);
          
          if (data.type === 'child_stream_offer') {
            console.log('Received child device stream offer');
            
            // Set up WebRTC peer connection to receive child's stream
            const pc = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            // When we receive the child's stream, display it
            pc.ontrack = (event) => {
              console.log('Received child device camera stream');
              if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setIsStreaming(true);
                
                // Start recording the child's stream
                const mediaRecorder = new MediaRecorder(event.streams[0], {
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
                  formData.append('video', blob, `emergency_${emergencyAlertId}_${Date.now()}.webm`);
                  formData.append('emergencyAlertId', emergencyAlertId?.toString() || '');
                  
                  try {
                    const response = await fetch('/api/emergency/save-recording', {
                      method: 'POST',
                      body: formData
                    });
                    
                    if (response.ok) {
                      console.log('Child device recording saved');
                    }
                  } catch (error) {
                    console.error('Failed to save recording:', error);
                  }
                };
                
                mediaRecorder.start(1000);
                (videoRef.current as any).mediaRecorder = mediaRecorder;
                
                console.log('Now recording child device stream');
              }
            };
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.send(JSON.stringify({
                  type: 'ice_candidate',
                  candidate: event.candidate,
                  roomId: data.roomId
                }));
              }
            };
            
            try {
              // Set remote description and create answer
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              
              // Send answer back to child
              socket.send(JSON.stringify({
                type: 'parent_stream_answer',
                answer: answer,
                roomId: data.roomId
              }));
              
              console.log('WebRTC handshake completed with child device');
            } catch (error) {
              console.error('WebRTC handshake error:', error);
            }
          }
        };
        
        socket.onerror = (error) => {
          console.error('Parent WebSocket error:', error);
          setIsStreaming(false);
        };
        
        // Store socket for cleanup
        return () => {
          socket.close();
        };
      } catch (error) {
        console.error('Failed to connect to child device:', error);
        setIsStreaming(false);
      }
    };

    // Connect to child device when stream ID exists
    if (streamId && emergencyAlertId) {
      connectToChildDevice();
    }
  }, [streamId, emergencyAlertId]);

  const { data: emergencyAlert, isLoading } = useQuery({
    queryKey: ["/api/emergency-alerts", emergencyAlertId],
    enabled: !!emergencyAlertId,
    queryFn: async () => {
      const response = await fetch(`/api/emergency-alerts/${emergencyAlertId}`);
      if (!response.ok) throw new Error("Failed to fetch emergency alert");
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
              <p>Loading emergency stream...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!streamId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
              <p>Invalid stream ID</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4">
        {/* Manual Room Entry */}
        <Card className="mb-4 border-blue-500 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Video className="h-5 w-5" />
              Emergency Camera Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-700">
                  Room ID: emergency_{emergencyAlertId}
                </label>
                <div className="mt-1 p-2 bg-blue-100 rounded text-sm font-mono text-blue-800">
                  emergency_{emergencyAlertId}
                </div>
              </div>
              <div className="text-sm text-blue-600">
                Child device will join this room to stream camera
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Alert Header */}
        <Card className="mb-4 border-red-500 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Emergency Live Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emergencyAlert && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>{new Date(emergencyAlert.createdAt).toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span>{emergencyAlert.location?.address || 'Location tracking active'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-gray-600" />
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    isStreaming ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isStreaming ? 'Live Stream Active' : 'Connecting...'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Video Stream */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                controls
                muted={false}
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#000' }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play();
                  }
                }}
              />
              
              {/* Overlay for stream status */}
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center" style={{ 
                display: isStreaming ? 'none' : 'flex' 
              }}>
                <div className="text-center text-white">
                  <Video className="w-12 h-12 mx-auto mb-4 animate-pulse" />
                  <p className="text-lg font-semibold">Connecting to Child's Camera...</p>
                  <p className="text-sm text-gray-300 mt-2">Establishing secure emergency stream</p>
                </div>
              </div>

              {/* Live indicator with recording status */}
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                {isStreaming ? 'LIVE • RECORDING' : 'CONNECTING...'}
              </div>
              
              {/* Child device indicator */}
              {isStreaming && (
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                  📱 Child Device Camera
                </div>
              )}

              {/* Emergency info overlay */}
              {emergencyAlert && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm max-w-xs">
                  <div className="font-semibold text-red-400 mb-1">EMERGENCY ACTIVE</div>
                  <div>Child: {emergencyAlert.childName || 'Sharanya'}</div>
                  <div>Type: {emergencyAlert.triggerType?.replace('_', ' ').toUpperCase()}</div>
                  {emergencyAlert.voiceDetectionText && (
                    <div className="mt-1 text-yellow-300">Voice: "{emergencyAlert.voiceDetectionText}"</div>
                  )}
                </div>
              )}

              {/* Stream controls */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                  onClick={() => window.open('tel:100')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  📞 Call Police (100)
                </button>
                <button 
                  onClick={() => {
                    if (emergencyAlert?.location) {
                      window.open(`https://www.google.com/maps?q=${emergencyAlert.location.lat},${emergencyAlert.location.lng}&z=18&t=h`, '_blank');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  📍 Track Location
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Information */}
        {emergencyAlert && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Emergency Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">Trigger Type:</span>
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    {emergencyAlert.triggerType?.replace('_', ' ').toUpperCase() || 'EMERGENCY ALERT'}
                  </span>
                </div>
                
                {emergencyAlert.voiceDetectionText && (
                  <div>
                    <span className="font-semibold text-gray-700">Voice Detection:</span>
                    <span className="ml-2 italic text-gray-600">"{emergencyAlert.voiceDetectionText}"</span>
                  </div>
                )}
                
                {emergencyAlert.location && (
                  <div>
                    <span className="font-semibold text-gray-700">Location:</span>
                    <div className="ml-2 mt-1">
                      <p className="text-sm text-gray-600">{emergencyAlert.location.address}</p>
                      <a 
                        href={`https://www.google.com/maps?q=${emergencyAlert.location.lat},${emergencyAlert.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}