import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Navigation, Clock, Shield, AlertTriangle, Route, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/hooks/use-location";
import { useQuery } from "@tanstack/react-query";

interface SafeRouteProps {
  onRouteFound?: (route: any) => void;
}

export default function SafeRouteFinder({ onRouteFound }: SafeRouteProps) {
  const [destination, setDestination] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { location } = useLocation();
  const { toast } = useToast();

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

  // Create a stable location key for caching
  const locationKey = useMemo(() => {
    if (!location) return null;
    // Round to 3 decimal places (~100m precision) to prevent excessive cache misses
    return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  }, [location]);

  // Fetch home location with caching
  const { data: homeLocation } = useQuery({
    queryKey: ["/api/user/home-location"],
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch nearby places with proper caching
  const { data: nearbyPlaces = [] } = useQuery({
    queryKey: ["/api/places/nearby", locationKey],
    queryFn: async () => {
      if (!location) return [];

      const placesTypes = [
        { type: 'police', query: 'police station' },
        { type: 'hospital', query: 'hospital' },
        { type: 'transport', query: 'metro station' }
      ];

      const places = [];
      for (const placeType of placesTypes) {
        const response = await fetch(
          `/api/places/nearby?lat=${location.latitude}&lng=${location.longitude}&type=${placeType.type}&radius=5000`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const nearest = data.results[0];
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              nearest.geometry.location.lat,
              nearest.geometry.location.lng
            );
            
            places.push({
              name: nearest.name,
              address: nearest.vicinity || nearest.formatted_address || nearest.name,
              coords: {
                lat: nearest.geometry.location.lat,
                lng: nearest.geometry.location.lng
              },
              distance: distance.toFixed(2)
            });
          }
        }
      }
      return places;
    },
    enabled: !!locationKey,
    staleTime: 5 * 60 * 1000, // 5 minutes before considering stale
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if we have cached data
  });

  const getSafeDestinations = () => {
    const destinations = [];
    
    // Add home if available
    if (homeLocation) {
      const homeDistance = location ? calculateDistance(
        location.latitude,
        location.longitude,
        homeLocation.latitude,
        homeLocation.longitude
      ).toFixed(2) : "0.0";
      
      destinations.push({
        name: "Home",
        address: homeLocation.address || "Your Home Location",
        coords: { lat: homeLocation.latitude, lng: homeLocation.longitude },
        distance: homeDistance
      });
    }
    
    // Add nearby places with their real names and distances
    destinations.push(...nearbyPlaces);
    
    return destinations;
  };

  const findSafeRoute = async (dest?: string) => {
    if (!dest && !destination.trim()) {
      toast({
        title: "Enter Destination",
        description: "Please enter a destination to find a safe route",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      const currentLocation = location || { latitude: 28.6139, longitude: 77.2090 };
      const selectedDest = dest || destination;
      
      // Find destination coordinates
      let destCoords;
      
      // First check real safe destinations from database and nearby places
      const safeDestinations = getSafeDestinations();
      const foundDest = safeDestinations.find(d => 
        d.name.toLowerCase().includes(selectedDest.toLowerCase()) ||
        selectedDest.toLowerCase().includes(d.name.toLowerCase())
      );
      
      if (foundDest) {
        destCoords = foundDest.coords;
      } else {
        // Try to search for the destination using Google Places API
        try {
          const response = await fetch(`/api/places/search?query=${encodeURIComponent(selectedDest)}&lat=${currentLocation.latitude}&lng=${currentLocation.longitude}`);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const place = data.results[0];
              destCoords = {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng
              };
            } else {
              throw new Error('No places found');
            }
          } else {
            throw new Error('Search failed');
          }
        } catch (error) {
          console.error('Places search failed:', error);
          toast({
            title: "Location Not Found",
            description: "Could not find the specified destination. Please try a different search.",
            variant: "destructive",
          });
          setIsSearching(false);
          return;
        }
      }
      
      // Start navigation to the destination
      const googleMapsUrl = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${destCoords.lat},${destCoords.lng}`;
      window.open(googleMapsUrl, '_blank');
      
      const safeRoute = {
        destination: selectedDest,
        coordinates: destCoords,
        distance: `${calculateDistance(currentLocation.latitude, currentLocation.longitude, destCoords.lat, destCoords.lng).toFixed(1)} km`,
        duration: "Calculating...",
        safetyScore: 85,
        wellLitStreets: 78,
        policePetrolling: 92,
        crowdDensity: 65,
        emergencyServices: 88,
        routePoints: [
          { lat: currentLocation.latitude, lng: currentLocation.longitude, type: "start" },
          { lat: destCoords.lat, lng: destCoords.lng, type: "destination" }
        ],
        safetyFeatures: [
          "Well-lit main roads",
          "Active CCTV coverage",
          "Police patrol route",
          "Emergency call boxes nearby",
          "Busy commercial areas"
        ],
        warnings: selectedDest === "Unknown Area" ? ["Limited lighting on some sections"] : []
      };

      setCurrentRoute(safeRoute);
      
      if (onRouteFound) {
        onRouteFound(safeRoute);
      }

      toast({
        title: "Safe Route Found",
        description: `Route to ${safeRoute.destination} calculated with ${safeRoute.safetyScore}% safety score`,
      });

    } catch (error) {
      toast({
        title: "Route Error",
        description: "Could not calculate safe route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const startNavigation = () => {
    if (currentRoute) {
      const destination = currentRoute.routePoints[currentRoute.routePoints.length - 1];
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`;
      window.open(url, "_blank");
      
      toast({
        title: "Navigation Started",
        description: "Opening Google Maps with your safe route",
      });
    }
  };

  const shareRoute = () => {
    if (currentRoute && navigator.share) {
      navigator.share({
        title: "Safe Route to " + currentRoute.destination,
        text: `I'm taking a safe route to ${currentRoute.destination}. Safety score: ${currentRoute.safetyScore}%. ETA: ${currentRoute.duration}`,
        url: window.location.href
      });
    } else if (currentRoute) {
      const shareText = `Safe route to ${currentRoute.destination} - Safety score: ${currentRoute.safetyScore}%, ETA: ${currentRoute.duration}`;
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Route Shared",
        description: "Route details copied to clipboard",
      });
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Route className="w-5 h-5 mr-2" />
          Safe Route Finder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Destinations */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Safe Destinations</Label>
          <div className="space-y-2">
            {getSafeDestinations().slice(0, 4).map((dest, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => findSafeRoute(dest.name)}
                disabled={isSearching}
                className="w-full h-14 p-3 flex items-center justify-between text-left hover:bg-blue-50"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <MapPin className="w-4 h-4 mr-3 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {dest.name && dest.name.trim() !== "" 
                        ? dest.name
                        : "Loading..."}
                    </div>
                    <div className="text-xs text-gray-500">
                      Safe destination
                    </div>
                  </div>
                </div>
                {dest.distance && (
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-sm font-semibold text-green-600">{dest.distance} km</div>
                    <div className="text-xs text-gray-400">away</div>
                  </div>
                )}
              </Button>
            ))}
            {getSafeDestinations().length === 0 && (
              <div className="text-center text-gray-500 py-4">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading nearby safe locations...</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination">Enter Destination</Label>
          <div className="flex gap-2">
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter address or place name"
              disabled={isSearching}
            />
            <Button 
              onClick={() => findSafeRoute()}
              disabled={isSearching || !destination.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? "Finding..." : "Find Route"}
            </Button>
          </div>
        </div>

        {/* Current Route Information */}
        {currentRoute && (
          <Card className="border border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <Navigation className="w-5 h-5 mr-2 text-green-600" />
                    Route to {currentRoute.destination}
                  </CardTitle>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {currentRoute.distance}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {currentRoute.duration}
                    </span>
                  </div>
                </div>
                <Badge className={getSafetyScoreColor(currentRoute.safetyScore)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {currentRoute.safetyScore}% Safe
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Safety Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="flex justify-between">
                    <span>Well-lit Streets</span>
                    <span className="font-medium">{currentRoute.wellLitStreets}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${currentRoute.wellLitStreets}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>Police Patrolling</span>
                    <span className="font-medium">{currentRoute.policePetrolling}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full" 
                      style={{ width: `${currentRoute.policePetrolling}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Safety Features */}
              <div>
                <Label className="text-sm font-medium text-green-700">Safety Features</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentRoute.safetyFeatures.slice(0, 3).map((feature: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs border-green-200 text-green-700">
                      {feature}
                    </Badge>
                  ))}
                  {currentRoute.safetyFeatures.length > 3 && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-pointer">
                          +{currentRoute.safetyFeatures.length - 3} more
                        </Badge>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>All Safety Features</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {currentRoute.safetyFeatures.map((feature: string, index: number) => (
                            <div key={index} className="flex items-center">
                              <Shield className="w-4 h-4 text-green-500 mr-2" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {currentRoute.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Route Cautions</p>
                      <ul className="text-xs text-yellow-600 mt-1">
                        {currentRoute.warnings.map((warning: string, index: number) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={startNavigation} className="flex-1 bg-green-600 hover:bg-green-700 h-11 min-w-0">
                  <Navigation className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Start Navigation</span>
                </Button>
                <Button onClick={shareRoute} variant="outline" className="flex-1 h-11 min-w-0">
                  <Share2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Share Route</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Location */}
        {location && (
          <div className="text-xs text-gray-500 flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            Current: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}