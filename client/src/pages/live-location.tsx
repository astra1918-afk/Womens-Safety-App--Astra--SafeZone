import { useEffect, useState, useRef } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, ArrowLeft, RefreshCw } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
  accuracy?: number;
}

interface EmergencyAlert {
  id: number;
  childName: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  createdAt: string;
  triggerType: string;
  voiceDetectionText?: string;
  isResolved: boolean;
}

export default function LiveLocation() {
  const [, params] = useRoute('/live-location/:alertId');
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<LocationData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (params?.alertId) {
      fetchAlertData(params.alertId);
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [params?.alertId]);

  const fetchAlertData = async (alertId: string) => {
    try {
      const response = await fetch(`/api/parent/emergency-alerts/${alertId}`);
      if (response.ok) {
        const alertData = await response.json();
        setAlert(alertData);
        
        // Set initial location from alert
        if (alertData.location) {
          const initialLocation: LocationData = {
            lat: alertData.location.lat,
            lng: alertData.location.lng,
            address: alertData.location.address,
            timestamp: alertData.createdAt
          };
          setCurrentLocation(initialLocation);
          setTrackingHistory([initialLocation]);
        }
      }
    } catch (error) {
      console.error('Error fetching alert data:', error);
      setError('Failed to load emergency alert data');
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: `Live Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy
        };
        setCurrentLocation(newLocation);
        setTrackingHistory(prev => [...prev, newLocation]);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to access location. Please enable location services.');
        setIsTracking(false);
      }
    );

    // Watch position changes
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: `Live Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy
        };
        setCurrentLocation(newLocation);
        setTrackingHistory(prev => {
          const updated = [...prev, newLocation];
          // Keep only last 50 locations to avoid memory issues
          return updated.slice(-50);
        });
      },
      (error) => {
        console.error('Geolocation watch error:', error);
        setError('Location tracking interrupted. Please check location permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const stopLocationTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const refreshLocation = () => {
    if (isTracking) {
      stopLocationTracking();
    }
    setTimeout(() => {
      startLocationTracking();
    }, 500);
  };

  const openInGoogleMaps = () => {
    if (currentLocation) {
      const googleMapsUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}&z=18&t=h`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Live Location Tracking</h1>
          <Badge variant={isTracking ? "default" : "secondary"} className="ml-auto">
            {isTracking ? "🟢 Live" : "⚫ Offline"}
          </Badge>
        </div>

        {/* Alert Information */}
        {alert && (
          <Card className="mb-6 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <MapPin className="h-5 w-5" />
                Emergency Alert #{alert.id}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Person:</span> {alert.childName}
                </div>
                <div>
                  <span className="font-semibold">Trigger:</span> {alert.triggerType?.replace('_', ' ').toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold">Started:</span> {formatTime(alert.createdAt)}
                </div>
              </div>
              {alert.voiceDetectionText && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <span className="font-semibold text-red-700">Voice Detection:</span>
                  <span className="ml-2 italic">"{alert.voiceDetectionText}"</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Current Location */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Current Location
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLocation}
              disabled={!currentLocation}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Coordinates:</span>
                    <br />
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-semibold">Last Updated:</span>
                    <br />
                    {formatTime(currentLocation.timestamp)}
                  </div>
                  <div>
                    <span className="font-semibold">Address:</span>
                    <br />
                    {currentLocation.address}
                  </div>
                  {currentLocation.accuracy && (
                    <div>
                      <span className="font-semibold">Accuracy:</span>
                      <br />
                      ±{Math.round(currentLocation.accuracy)}m
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={openInGoogleMaps} className="flex-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    Open in Google Maps
                  </Button>
                  <Button
                    variant={isTracking ? "destructive" : "default"}
                    onClick={isTracking ? stopLocationTracking : startLocationTracking}
                  >
                    {isTracking ? "Stop Tracking" : "Start Tracking"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Location data not available</p>
                <Button onClick={startLocationTracking} className="mt-4">
                  Start Location Tracking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Location History ({trackingHistory.length} points)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trackingHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trackingHistory.slice().reverse().map((location, index) => {
                  const isLatest = index === 0;
                  const prevLocation = index < trackingHistory.length - 1 ? trackingHistory[trackingHistory.length - 1 - index - 1] : null;
                  const distance = prevLocation ? calculateDistance(
                    prevLocation.lat, prevLocation.lng,
                    location.lat, location.lng
                  ) : 0;

                  return (
                    <div
                      key={`${location.timestamp}-${index}`}
                      className={`p-3 rounded-lg border ${isLatest ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-mono">
                            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {formatTime(location.timestamp)}
                            {location.accuracy && ` • ±${Math.round(location.accuracy)}m`}
                            {distance > 0 && ` • ${distance.toFixed(1)}m moved`}
                          </div>
                        </div>
                        {isLatest && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No location history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}