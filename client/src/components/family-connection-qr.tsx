import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, 
  Scan, 
  Users, 
  Shield, 
  Copy, 
  Check,
  UserPlus,
  Smartphone
} from "lucide-react";

export default function FamilyConnectionQR() {
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate QR code for family connection
  const generateQRCode = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/family/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to generate QR code');
      return response.json();
    },
    onSuccess: (data) => {
      setQrCodeData(data.qrCode);
      setShowQRCode(true);
      toast({
        title: "QR Code Generated",
        description: "Share this code with your parent to connect",
      });
    }
  });

  // Get family connections
  const { data: connections = [] } = useQuery({
    queryKey: ["/api/family/connections"],
  });

  // Create QR code SVG
  const generateQRCodeSVG = (data: string) => {
    // Simple QR code representation - in production, use a proper QR library
    const size = 200;
    const cellSize = 8;
    const cells = size / cellSize;
    
    // Create a pattern based on the data
    const pattern = [];
    for (let i = 0; i < cells; i++) {
      pattern[i] = [];
      for (let j = 0; j < cells; j++) {
        // Create pseudo-random pattern based on data and position
        const hash = (data.charCodeAt((i + j) % data.length) + i * j) % 2;
        pattern[i][j] = hash === 0;
      }
    }

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;
    
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        if (pattern[i][j]) {
          svg += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    // Add corner markers
    const cornerSize = cellSize * 3;
    svg += `<rect x="0" y="0" width="${cornerSize}" height="${cornerSize}" fill="black"/>`;
    svg += `<rect x="${size - cornerSize}" y="0" width="${cornerSize}" height="${cornerSize}" fill="black"/>`;
    svg += `<rect x="0" y="${size - cornerSize}" width="${cornerSize}" height="${cornerSize}" fill="black"/>`;
    
    svg += '</svg>';
    return svg;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData);
      setCopiedCode(true);
      toast({
        title: "Code Copied",
        description: "Family connection code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Connection Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Connect with Parents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Generate a QR code for your parents to scan and connect to your safety app. 
                This allows them to receive emergency alerts and monitor your safety.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <QrCode className="w-5 h-5 mr-2 text-blue-600" />
                  <span className="font-semibold">Step 1: Generate Code</span>
                </div>
                <p className="text-sm text-gray-600">
                  Create a secure QR code that contains your connection details
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Scan className="w-5 h-5 mr-2 text-green-600" />
                  <span className="font-semibold">Step 2: Parent Scans</span>
                </div>
                <p className="text-sm text-gray-600">
                  Parent opens their Sakhi Suraksha parent app and scans your code
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Connection QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          {!showQRCode ? (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
              <Button 
                onClick={() => generateQRCode.mutate()}
                disabled={generateQRCode.isPending}
                className="w-full"
              >
                {generateQRCode.isPending ? (
                  "Generating..."
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code for Parents
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500">
                This code will be valid for 24 hours
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-4">Share this QR Code with your parents</h3>
                
                {/* QR Code Display */}
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: generateQRCodeSVG(qrCodeData) 
                    }}
                  />
                </div>
                
                {/* Connection Code */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Manual Connection Code:</p>
                  <div className="flex items-center justify-center space-x-2">
                    <code className="bg-white px-3 py-1 rounded border font-mono text-sm">
                      {qrCodeData}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={copyCode}
                    >
                      {copiedCode ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>For parents:</strong> Download "Sakhi Suraksha Parent" app, 
                  create an account, and scan this QR code to connect.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowQRCode(false)}
                  className="flex-1"
                >
                  Generate New Code
                </Button>
                <Button 
                  onClick={() => window.print()}
                  className="flex-1"
                >
                  Print QR Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Parents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connected Parents</span>
            <Badge variant="secondary">
              {connections.length} Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No parents connected yet</p>
              <p className="text-sm">Generate a QR code to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection: any) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">{connection.parentName || 'Parent'}</div>
                    <div className="text-sm text-gray-500">
                      {connection.relationshipType} • Connected {new Date(connection.acceptedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={connection.status === 'accepted' ? 'secondary' : 'outline'}>
                    {connection.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}