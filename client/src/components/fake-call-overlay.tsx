import { Phone, PhoneOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface FakeCallData {
  name: string;
  number: string;
  avatar: string;
}

export default function FakeCallOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [callData, setCallData] = useState<FakeCallData>({
    name: "Mom",
    number: "+91 98765 43210",
    avatar: "👩‍💼"
  });

  useEffect(() => {
    const handleStartFakeCall = () => {
      setIsVisible(true);
    };

    const handleStopFakeCall = () => {
      setIsVisible(false);
    };

    window.addEventListener('startFakeCall', handleStartFakeCall);
    window.addEventListener('stopFakeCall', handleStopFakeCall);

    return () => {
      window.removeEventListener('startFakeCall', handleStartFakeCall);
      window.removeEventListener('stopFakeCall', handleStopFakeCall);
    };
  }, []);

  const handleAnswer = () => {
    setIsVisible(false);
    // Could trigger a fake conversation interface or just close
  };

  const handleDecline = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-gray-900 text-white p-6 flex-1 flex flex-col">
        {/* Status Bar Simulation */}
        <div className="flex justify-between items-center mb-8 text-sm">
          <span>9:41</span>
          <span>Incoming call...</span>
          <span>🔋 85%</span>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8 flex-1 flex flex-col justify-center">
          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center text-6xl">
            {callData.avatar}
          </div>
          <h2 className="text-3xl font-semibold mb-2">{callData.name}</h2>
          <p className="text-gray-400 text-lg mb-2">{callData.number}</p>
          <p className="text-green-400 text-lg">Incoming call...</p>
        </div>

        {/* Call Options */}
        <div className="text-center mb-4">
          <div className="flex justify-center space-x-4 mb-6">
            <Button
              variant="ghost"
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600"
            >
              <span className="text-xl">💬</span>
            </Button>
            <Button
              variant="ghost"
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600"
            >
              <User className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Answer/Decline Buttons */}
        <div className="flex justify-center space-x-20 pb-8">
          <Button
            onClick={handleDecline}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
          
          <Button
            onClick={handleAnswer}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center"
          >
            <Phone className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
