import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/hooks/use-location";
import { triggerEmergencyProtocol } from "@/lib/emergency";
import { useState } from "react";

export default function EmergencyButton() {
  const { toast } = useToast();
  const { location } = useLocation();
  const [isActivated, setIsActivated] = useState(false);

  const emergencyMutation = useMutation({
    mutationFn: async () => {
      if (!location) {
        throw new Error("Location not available");
      }
      
      return triggerEmergencyProtocol({
        userId: 1, // Demo user ID
        triggerType: 'button',
        latitude: location.latitude,
        longitude: location.longitude,
        address: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      });
    },
    onMutate: () => {
      setIsActivated(true);
      // Show immediate visual feedback
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-red-500 bg-opacity-95 flex items-center justify-center z-50';
      overlay.innerHTML = `
        <div class="text-center text-white">
          <div class="text-8xl mb-4 animate-pulse">🚨</div>
          <h2 class="text-2xl font-bold mb-2">SOS ACTIVATED</h2>
          <p class="text-lg">Alerting trusted contacts...</p>
        </div>
      `;
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 3000);
    },
    onSuccess: () => {
      toast({
        title: "SOS Alert Sent",
        description: "Emergency alert sent to all trusted contacts with your location.",
        variant: "default",
      });
      
      setTimeout(() => {
        setIsActivated(false);
      }, 5000);
    },
    onError: (error) => {
      setIsActivated(false);
      toast({
        title: "Emergency Alert Failed",
        description: error instanceof Error ? error.message : "Failed to send emergency alert. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEmergencyClick = () => {
    if (emergencyMutation.isPending) return;
    emergencyMutation.mutate();
  };

  return (
    <Button
      onClick={handleEmergencyClick}
      disabled={emergencyMutation.isPending}
      className={`w-32 h-32 rounded-full shadow-lg transform transition-all duration-150 hover:scale-105 active:scale-95 flex flex-col items-center justify-center ${
        isActivated 
          ? 'bg-red-600 hover:bg-red-700 emergency-pulse' 
          : 'bg-emergency hover:bg-red-600 active:bg-red-700'
      } text-white`}
    >
      <AlertCircle className="h-12 w-12 mb-1" />
      <span className="text-sm font-semibold">SOS</span>
    </Button>
  );
}
