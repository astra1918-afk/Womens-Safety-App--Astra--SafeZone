import { useState, useEffect, useCallback } from "react";
import { triggerEmergencyProtocol } from "@/lib/emergency";
import { useLocation } from "./use-location";
import { useToast } from "./use-toast";

export function useShakeDetection() {
  const [isActive, setIsActive] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const { location } = useLocation();
  const { toast } = useToast();

  const SHAKE_THRESHOLD = 15; // Acceleration threshold
  const SHAKE_COUNT_REQUIRED = 3; // Number of shakes required
  const SHAKE_TIMEOUT = 2000; // Time window for shakes (ms)

  const handleEmergencyTrigger = useCallback(async () => {
    try {
      toast({
        title: "Shake Emergency Detected",
        description: "Triggering emergency protocol from shake detection",
        variant: "default",
      });

      if (location) {
        await triggerEmergencyProtocol({
          userId: 1, // Demo user ID
          triggerType: 'shake',
          latitude: location.latitude,
          longitude: location.longitude,
          address: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        });
      }

      setShakeCount(0);
      setIsActive(false);
    } catch (error) {
      toast({
        title: "Emergency Alert Failed",
        description: "Failed to send emergency alert. Please try manual SOS.",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let shakeTimer: NodeJS.Timeout;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (!isActive || !event.accelerationIncludingGravity) return;

      const { x = 0, y = 0, z = 0 } = event.accelerationIncludingGravity;
      
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      
      const totalDelta = deltaX + deltaY + deltaZ;

      if (totalDelta > SHAKE_THRESHOLD) {
        setShakeCount(prev => {
          const newCount = prev + 1;
          
          if (newCount >= SHAKE_COUNT_REQUIRED) {
            handleEmergencyTrigger();
            return 0;
          }
          
          return newCount;
        });

        // Reset shake count after timeout
        clearTimeout(shakeTimer);
        shakeTimer = setTimeout(() => {
          setShakeCount(0);
        }, SHAKE_TIMEOUT);
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    if (isActive && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      clearTimeout(shakeTimer);
    };
  }, [isActive, handleEmergencyTrigger]);

  useEffect(() => {
    const handleStartShake = () => {
      setIsActive(true);
      toast({
        title: "Shake Detection Active",
        description: "Shake your device 3 times quickly to trigger emergency alert",
        variant: "default",
      });
    };

    const handleStopShake = () => {
      setIsActive(false);
      setShakeCount(0);
    };

    window.addEventListener('startShakeDetection', handleStartShake);
    window.addEventListener('stopShakeDetection', handleStopShake);

    return () => {
      window.removeEventListener('startShakeDetection', handleStartShake);
      window.removeEventListener('stopShakeDetection', handleStopShake);
    };
  }, [toast]);

  const startShakeDetection = useCallback(() => {
    setIsActive(true);
  }, []);

  const stopShakeDetection = useCallback(() => {
    setIsActive(false);
    setShakeCount(0);
  }, []);

  return {
    isActive,
    shakeCount,
    startShakeDetection,
    stopShakeDetection,
    isSupported: 'DeviceMotionEvent' in window,
  };
}
