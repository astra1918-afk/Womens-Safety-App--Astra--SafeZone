import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone, AlertTriangle, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmergencyStreamPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const [streamData, setStreamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (streamId) {
      // Extract alert ID from stream URL
      const alertId = streamId.split('_')[1];
      fetchEmergencyData(alertId);
    }
  }, [streamId]);

  const fetchEmergencyData = async (alertId: string) => {
    try {
      const response = await fetch(`/api/emergency-alerts/${alertId}`);
      if (response.ok) {
        const data = await response.json();
        setStreamData(data);
      } else {
        console.error('Failed to fetch emergency data');
      }
    } catch (error) {
      console.error('Error fetching emergency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const callEmergencyServices = (number: string, service: string) => {
    const telUrl = `tel:${number}`;
    window.location.href = telUrl;
    
    toast({
      title: `Calling ${service}`,
      description: `Dialing ${number}`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-red-600 font-medium">Loading emergency stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50">
      {/* Emergency Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            <h1 className="text-xl font-bold">EMERGENCY ALERT</h1>
          </div>
          <div className="text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            {streamData?.createdAt ? new Date(streamData.createdAt).toLocaleString() : 'Active'}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        {/* Emergency Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Emergency in Progress</h2>
          
          {streamData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Trigger Type</h3>
                  <p className="text-red-700">{streamData.triggerType?.replace('_', ' ').toUpperCase()}</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Alert Time</h3>
                  <p className="text-red-700">{new Date(streamData.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              {streamData.latitude && streamData.longitude && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h3>
                  <p className="text-blue-700 mb-2">{streamData.address || `${streamData.latitude}, ${streamData.longitude}`}</p>
                  <a 
                    href={`https://www.google.com/maps?q=${streamData.latitude},${streamData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Stream Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Live Emergency Stream</h3>
          <div className="bg-gray-100 aspect-video rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-600 font-medium">Emergency Stream Active</p>
              <p className="text-sm text-gray-500">Camera access initiated for emergency documentation</p>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-red-600">Emergency Response Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => callEmergencyServices('100', 'Police')}
              className="bg-red-600 hover:bg-red-700 text-white p-4 h-auto flex flex-col items-center gap-2"
            >
              <Phone className="w-6 h-6" />
              <div className="text-center">
                <div className="font-bold">Call Police</div>
                <div className="text-sm">100</div>
              </div>
            </Button>
            
            <Button
              onClick={() => callEmergencyServices('108', 'Medical Emergency')}
              className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex flex-col items-center gap-2"
            >
              <Phone className="w-6 h-6" />
              <div className="text-center">
                <div className="font-bold">Call Ambulance</div>
                <div className="text-sm">108</div>
              </div>
            </Button>
            
            <Button
              onClick={() => callEmergencyServices('1091', 'Women Helpline')}
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 h-auto flex flex-col items-center gap-2"
            >
              <Phone className="w-6 h-6" />
              <div className="text-center">
                <div className="font-bold">Women's Helpline</div>
                <div className="text-sm">1091</div>
              </div>
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• This is an active emergency situation</li>
              <li>• Contact the person immediately if you know them</li>
              <li>• Call emergency services if you cannot reach them</li>
              <li>• Share this location with authorities if needed</li>
              <li>• This alert was generated automatically by Astra app</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}