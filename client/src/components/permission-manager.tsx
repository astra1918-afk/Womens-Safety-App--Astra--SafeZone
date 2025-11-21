import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Camera, MapPin, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
}

interface PermissionManagerProps {
  onPermissionsGranted?: () => void;
}

export default function PermissionManager({ onPermissionsGranted }: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    microphone: 'unknown',
    camera: 'unknown',
    location: 'unknown'
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkPermissions = async () => {
    setIsChecking(true);
    
    try {
      // Check microphone permission
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({ ...prev, microphone: micPermission.state }));
      } catch {
        setPermissions(prev => ({ ...prev, microphone: 'unknown' }));
      }

      // Check camera permission
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissions(prev => ({ ...prev, camera: cameraPermission.state }));
      } catch {
        setPermissions(prev => ({ ...prev, camera: 'unknown' }));
      }

      // Check location permission
      try {
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissions(prev => ({ ...prev, location: locationPermission.state }));
      } catch {
        setPermissions(prev => ({ ...prev, location: 'unknown' }));
      }
    } catch (error) {
      console.error('Permission check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
    } catch (error) {
      console.error('Camera permission denied:', error);
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
    }
  };

  const requestLocationPermission = async () => {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false
        });
      });
      setPermissions(prev => ({ ...prev, location: 'granted' }));
    } catch (error) {
      console.error('Location permission denied:', error);
      setPermissions(prev => ({ ...prev, location: 'denied' }));
    }
  };

  const requestAllPermissions = async () => {
    await Promise.all([
      requestMicrophonePermission(),
      requestCameraPermission(),
      requestLocationPermission()
    ]);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    const allGranted = Object.values(permissions).every(status => status === 'granted');
    if (allGranted && onPermissionsGranted) {
      onPermissionsGranted();
    }
  }, [permissions, onPermissionsGranted]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const allPermissionsGranted = Object.values(permissions).every(status => status === 'granted');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Safety Permissions
        </CardTitle>
        <CardDescription>
          Grant access to essential features for your safety
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!allPermissionsGranted && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some safety features require device permissions to function properly.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5" />
              <div>
                <p className="font-medium">Microphone</p>
                <p className="text-sm text-gray-600">Voice distress detection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.microphone)}
              {permissions.microphone !== 'granted' && (
                <Button size="sm" onClick={requestMicrophonePermission}>
                  Allow
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5" />
              <div>
                <p className="font-medium">Camera</p>
                <p className="text-sm text-gray-600">Emergency live streaming</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.camera)}
              {permissions.camera !== 'granted' && (
                <Button size="sm" onClick={requestCameraPermission}>
                  Allow
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-gray-600">Emergency location sharing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.location)}
              {permissions.location !== 'granted' && (
                <Button size="sm" onClick={requestLocationPermission}>
                  Allow
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={requestAllPermissions} 
            className="flex-1"
            disabled={allPermissionsGranted}
          >
            {allPermissionsGranted ? 'All Permissions Granted' : 'Grant All Permissions'}
          </Button>
          <Button 
            variant="outline" 
            onClick={checkPermissions}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {allPermissionsGranted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All safety features are now available and ready to protect you.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}