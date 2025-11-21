import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Scan, 
  Users, 
  Shield, 
  UserCheck,
  Camera,
  Smartphone
} from "lucide-react";

export default function ParentQRScanner() {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scan QR code mutation
  const scanQRCode = useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await fetch('/api/family/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/connections"] });
      toast({
        title: "Connection Successful",
        description: `Connected to ${data.childInfo.name}'s safety app`,
      });
      setManualCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleManualCodeSubmit = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid connection code",
        variant: "destructive",
      });
      return;
    }
    scanQRCode.mutate(manualCode.trim().toUpperCase());
  };

  const startCameraScanning = () => {
    setIsScanning(true);
    // In a real implementation, this would open camera for QR scanning
    // For demo purposes, we'll simulate scanning after 3 seconds
    setTimeout(() => {
      setIsScanning(false);
      toast({
        title: "Demo Mode",
        description: "Use manual code entry for now. Camera scanning coming soon!",
      });
    }, 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Connect to Your Child's Safety App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Scan the QR code from your child's Sakhi Suraksha app to receive 
              emergency alerts and monitor their safety status.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* QR Code Scanning Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Camera Scanning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {isScanning ? (
                  <div className="animate-pulse">
                    <Scan className="w-16 h-16 text-blue-500" />
                  </div>
                ) : (
                  <Scan className="w-16 h-16 text-gray-400" />
                )}
              </div>
              
              <Button 
                onClick={startCameraScanning}
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  "Scanning..."
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Open Camera Scanner
                  </>
                )}
              </Button>
              
              <p className="text-sm text-gray-500 mt-2">
                Point your camera at the QR code
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Manual Code Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Enter Code Manually
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Connection Code
              </label>
              <Input
                placeholder="SK1234567890ABCDEF"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the code shown on your child's app
              </p>
            </div>
            
            <Button 
              onClick={handleManualCodeSubmit}
              disabled={scanQRCode.isPending || !manualCode.trim()}
              className="w-full"
            >
              {scanQRCode.isPending ? (
                "Connecting..."
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Connect to Child
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Family Connection Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Child Generates Code</h3>
              <p className="text-sm text-gray-600">
                Your child opens their Sakhi Suraksha app and generates a QR code for you
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Parent Scans Code</h3>
              <p className="text-sm text-gray-600">
                You scan the QR code or enter the code manually to establish connection
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Instant Connection</h3>
              <p className="text-sm text-gray-600">
                You'll receive emergency alerts, location updates, and safety notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}