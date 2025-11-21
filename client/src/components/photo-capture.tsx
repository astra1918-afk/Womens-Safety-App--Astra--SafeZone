import React, { useRef, useCallback, useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void;
  isEmergency?: boolean;
  autoCapture?: boolean;
}

export function PhotoCapture({ onPhotoCapture, isEmergency = false, autoCapture = false }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: isEmergency ? 'user' : 'environment' // Front camera for emergencies
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Auto-capture for voice SOS triggers
        if (autoCapture && isEmergency) {
          setTimeout(() => {
            capturePhoto();
          }, 1000); // Capture after 1 second delay
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, [isEmergency, autoCapture]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add emergency overlay for voice SOS
    if (isEmergency) {
      context.fillStyle = 'rgba(220, 38, 38, 0.8)';
      context.fillRect(0, 0, canvas.width, 40);
      context.fillStyle = 'white';
      context.font = 'bold 24px Arial';
      context.textAlign = 'center';
      context.fillText('EMERGENCY ALERT', canvas.width / 2, 28);
      
      // Add timestamp
      const timestamp = new Date().toLocaleString();
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, canvas.height - 40, canvas.width, 40);
      context.fillStyle = 'white';
      context.font = '16px Arial';
      context.fillText(timestamp, canvas.width / 2, canvas.height - 15);
    }

    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onPhotoCapture(photoDataUrl);
    
    // Stop camera after capture in emergency mode
    if (isEmergency) {
      stopCamera();
    }
  }, [isEmergency, onPhotoCapture, stopCamera]);

  // Auto-start camera for emergency voice SOS
  React.useEffect(() => {
    if (autoCapture && isEmergency) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [autoCapture, isEmergency, startCamera, stopCamera]);

  if (error) {
    return (
      <div className="flex flex-col items-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <Camera className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-red-700 text-center">{error}</p>
        <Button 
          onClick={startCamera} 
          variant="outline" 
          className="mt-2"
          size="sm"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isStreaming && !autoCapture && (
        <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <Camera className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-gray-600 text-center mb-3">
            {isEmergency ? 'Emergency Photo Capture' : 'Take a Photo'}
          </p>
          <Button onClick={startCamera} className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Start Camera
          </Button>
        </div>
      )}

      {isStreaming && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg"
            style={{ maxHeight: '300px' }}
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <Button
              onClick={capturePhoto}
              size="lg"
              className={`rounded-full ${isEmergency ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              <Camera className="w-6 h-6" />
            </Button>
            
            {!autoCapture && (
              <Button
                onClick={stopCamera}
                variant="outline"
                size="lg"
                className="rounded-full"
              >
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>

          {isEmergency && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-bold">
              EMERGENCY
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  );
}

// Utility function to upload photo to server
export async function uploadEmergencyPhoto(photoDataUrl: string, alertId: number): Promise<string | null> {
  try {
    const response = await fetch('/api/upload-emergency-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photoDataUrl,
        alertId,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }

    const data = await response.json();
    return data.photoUrl;
  } catch (error) {
    console.error('Error uploading emergency photo:', error);
    return null;
  }
}