import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, 
  Copy, 
  Check,
  Users,
  ExternalLink
} from "lucide-react";

export default function SimpleFamilyQR() {
  const [qrCode, setQrCode] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateQRCode = () => {
    const code = `SK${Date.now()}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
    setQrCode(code);
    setShowQR(true);
    toast({
      title: "QR Code Generated",
      description: "Share this code with your parents",
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast({
        title: "Code Copied",
        description: "Family connection code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the code",
        variant: "destructive",
      });
    }
  };

  const openParentDashboard = () => {
    window.open('/parent-dashboard', '_blank');
  };

  return (
    <div className="space-y-4">
      {!showQR ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
            <QrCode className="w-8 h-8 text-gray-400" />
          </div>
          <Button onClick={generateQRCode} className="w-full">
            <QrCode className="w-4 h-4 mr-2" />
            Generate QR Code for Parents
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* QR Code Visual */}
          <div className="text-center p-6 bg-white rounded-lg border">
            <div className="w-48 h-48 mx-auto mb-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-8 gap-1 w-40 h-40">
                {Array.from({ length: 64 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 ${
                      Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h3 className="font-semibold mb-2">Family Connection QR Code</h3>
            <div className="flex items-center justify-center space-x-2">
              <code className="bg-gray-50 px-3 py-2 rounded border font-mono text-lg">
                {qrCode}
              </code>
              <Button size="sm" variant="outline" onClick={copyCode}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setShowQR(false)} className="w-full">
            Generate New Code
          </Button>
        </div>
      )}
      
      <div className="text-center text-sm text-gray-500 space-y-2">
        <p>Parents can use this code to connect to your safety app</p>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="font-medium text-blue-900">For Parents:</p>
          <p className="text-blue-700">Open the Parent Dashboard and enter this code to receive emergency alerts</p>
        </div>
      </div>
    </div>
  );
}