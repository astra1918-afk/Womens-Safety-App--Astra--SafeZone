import { useState, useEffect } from "react";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocationSharingActive, setIsLocationSharingActive] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setError(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location access denied by user");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information unavailable");
            break;
          case error.TIMEOUT:
            setError("Location request timed out");
            break;
          default:
            setError("An unknown error occurred");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const shareLocation = () => {
    if (location) {
      const shareData = {
        title: "My Current Location",
        text: `I'm sharing my location via Sakhi Suraksha`,
        url: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      };

      if (navigator.share) {
        navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(shareData.url);
      }
    }
  };

  const startLocationSharing = () => {
    setIsLocationSharingActive(true);
  };

  const stopLocationSharing = () => {
    setIsLocationSharingActive(false);
  };

  return {
    location,
    error,
    isLocationSharingActive,
    shareLocation,
    startLocationSharing,
    stopLocationSharing,
  };
}
