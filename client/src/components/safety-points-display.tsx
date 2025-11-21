import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Phone, Activity, Navigation, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SafetyPoint {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'transport' | 'safe_zone';
  distance?: number;
  address?: string;
}

interface SafetyPointsDisplayProps {
  userLocation?: { lat: number; lng: number };
}

export default function SafetyPointsDisplay({ userLocation }: SafetyPointsDisplayProps) {
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userLocation) {
      fetchNearbyPlaces();
    }
  }, [userLocation]);

  const fetchNearbyPlaces = async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);
    
    const placeTypes = [
      { type: 'police' as const, query: 'police station' },
      { type: 'hospital' as const, query: 'hospital' },
      { type: 'transport' as const, query: 'metro station' },
      { type: 'safe_zone' as const, query: 'shopping mall' }
    ];

    try {
      const allPoints: SafetyPoint[] = [];
      
      for (const placeType of placeTypes) {
        const response = await fetch(
          `/api/places/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&type=${placeType.query}&radius=5000`
        );
        
        if (response.ok) {
          const data = await response.json();
          const places = data.results || [];
          
          places.slice(0, 2).forEach((place: any, index: number) => {
            allPoints.push({
              id: `${placeType.type}-${index}`,
              name: place.name,
              type: placeType.type,
              distance: calculateDistance(
                userLocation.lat, 
                userLocation.lng, 
                place.geometry.location.lat, 
                place.geometry.location.lng
              ),
              address: place.vicinity
            });
          });
        } else {
          const errorData = await response.json();
          if (errorData.error.includes('REQUEST_DENIED')) {
            setError('billing');
            return;
          }
        }
      }

      // Sort by distance and take closest 6 points
      const sortedPoints = allPoints
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 6);
      
      setSafetyPoints(sortedPoints);
      
    } catch (error) {
      console.error('Error fetching places:', error);
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getPointIcon = (type: string) => {
    switch (type) {
      case 'police': return <Phone className="w-4 h-4 text-red-600" />;
      case 'hospital': return <Activity className="w-4 h-4 text-blue-600" />;
      case 'transport': return <Navigation className="w-4 h-4 text-green-600" />;
      case 'safe_zone': return <Shield className="w-4 h-4 text-yellow-600" />;
      default: return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPointColor = (type: string) => {
    switch (type) {
      case 'police': return 'bg-red-100';
      case 'hospital': return 'bg-blue-100';
      case 'transport': return 'bg-green-100';
      case 'safe_zone': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  const startNavigation = (point: SafetyPoint) => {
    if (userLocation) {
      const googleMapsUrl = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${point.name}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Nearest Safety Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-500 p-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-sm">Finding real nearby safety points...</p>
          </div>
        ) : error === 'billing' ? (
          <div className="text-center text-gray-500 p-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm font-medium mb-2">Google Places API Setup Needed</p>
            <p className="text-xs text-gray-600 mb-4">
              Enable billing on Google Cloud Platform to show real nearby safety locations
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('https://console.cloud.google.com/project/_/billing/enable', '_blank')}
            >
              Enable Billing
            </Button>
          </div>
        ) : error === 'network' ? (
          <div className="text-center text-gray-500 p-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">Unable to fetch safety points</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={fetchNearbyPlaces}
            >
              Retry
            </Button>
          </div>
        ) : safetyPoints.length > 0 ? (
          <div className="space-y-3">
            {safetyPoints.map((point) => (
              <div key={point.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPointColor(point.type)}`}>
                    {getPointIcon(point.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{point.name}</p>
                    <p className="text-xs text-gray-500">
                      {point.distance ? `${point.distance.toFixed(1)} km` : 'Distance unknown'}
                      {point.address && ` • ${point.address}`}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => startNavigation(point)}
                >
                  Navigate
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">No safety points found nearby</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}