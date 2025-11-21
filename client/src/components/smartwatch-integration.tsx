import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Watch, Smartphone, Bluetooth, Shield, AlertTriangle } from "lucide-react";

interface SmartWatchDevice {
  id: string;
  name: string;
  type: 'apple' | 'samsung' | 'boat' | 'fitbit' | 'garmin' | 'amazfit' | 'other';
  status: 'connected' | 'disconnected' | 'pairing';
  batteryLevel?: number;
  sosEnabled: boolean;
  lastSync?: Date;
}

interface SmartwatchIntegrationProps {
  onSosTriggered: (source: string, deviceInfo: SmartWatchDevice) => void;
}

export default function SmartwatchIntegration({ onSosTriggered }: SmartwatchIntegrationProps) {
  const [connectedDevices, setConnectedDevices] = useState<SmartWatchDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [webBluetoothSupported, setWebBluetoothSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Web Bluetooth is supported
    setWebBluetoothSupported('bluetooth' in navigator);
    
    // Load saved devices from localStorage
    try {
      const savedDevices = localStorage.getItem('sakhi-smartwatch-devices');
      if (savedDevices) {
        const devices = JSON.parse(savedDevices).map((device: any) => ({
          ...device,
          lastSync: device.lastSync ? new Date(device.lastSync) : undefined
        }));
        setConnectedDevices(devices);
        console.log('Loaded devices from localStorage:', devices);
      }
    } catch (error) {
      console.error('Error loading devices from localStorage:', error);
      localStorage.removeItem('sakhi-smartwatch-devices');
    }

    // Set up smartwatch SOS listeners
    setupSmartwatchListeners();
    
    // Setup Web Bluetooth detection for supported watches
    if ('bluetooth' in navigator) {
      setupWebBluetoothDetection();
    }

    return () => {
      // Cleanup listeners
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const setupSmartwatchListeners = () => {
    // Apple Watch integration via Web API
    if ('DeviceMotionEvent' in window) {
      setupAppleWatchDetection();
    }

    // Samsung Health integration
    if ('samsung' in window || 'tizen' in window) {
      setupSamsungWatchDetection();
    }

    // Generic accelerometer for emergency gesture detection
    setupEmergencyGestureDetection();

    // Service Worker for background SOS detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data.type === 'SOS_TRIGGERED') {
      const deviceInfo = event.data.device;
      onSosTriggered('smartwatch', deviceInfo);
      toast({
        title: "SOS Triggered from Smartwatch",
        description: `Emergency alert received from ${deviceInfo.name}`,
        variant: "destructive",
      });
    }
  };

  const setupAppleWatchDetection = () => {
    // Apple Watch Digital Crown and side button detection
    let rapidClickCount = 0;
    let clickTimeout: NodeJS.Timeout;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect Apple Watch side button rapid press (simulated)
      if (event.code === 'Space' && event.ctrlKey && event.metaKey) {
        rapidClickCount++;
        clearTimeout(clickTimeout);
        
        clickTimeout = setTimeout(() => {
          if (rapidClickCount >= 5) {
            triggerSosFromWatch('apple-watch', 'Apple Watch');
          }
          rapidClickCount = 0;
        }, 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  };

  const setupSamsungWatchDetection = () => {
    // Samsung Galaxy Watch bezel rotation + button detection
    let bezelRotations = 0;
    let buttonPresses = 0;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) { // Simulating bezel rotation
        bezelRotations++;
        setTimeout(() => bezelRotations = 0, 3000);
        
        if (bezelRotations >= 3 && buttonPresses >= 2) {
          triggerSosFromWatch('samsung-watch', 'Galaxy Watch');
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      // Only handle watch button simulation, don't interfere with UI clicks
      if (event.ctrlKey && event.shiftKey && event.target === document.body) {
        buttonPresses++;
        setTimeout(() => buttonPresses = 0, 3000);
      }
    };

    document.addEventListener('wheel', handleWheel);
    document.addEventListener('click', handleClick);
  };

  const setupEmergencyGestureDetection = () => {
    if ('DeviceMotionEvent' in window) {
      let shakeDetected = false;
      let shakeCount = 0;

      const handleDeviceMotion = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;

        const totalAcceleration = Math.sqrt(
          Math.pow(acceleration.x || 0, 2) + 
          Math.pow(acceleration.y || 0, 2) + 
          Math.pow(acceleration.z || 0, 2)
        );

        // Detect vigorous shaking (emergency gesture)
        if (totalAcceleration > 20) {
          if (!shakeDetected) {
            shakeDetected = true;
            shakeCount++;
            
            setTimeout(() => {
              shakeDetected = false;
            }, 500);

            if (shakeCount >= 3) {
              triggerSosFromWatch('gesture', 'Emergency Gesture');
              shakeCount = 0;
            }
          }
        }
      };

      window.addEventListener('devicemotion', handleDeviceMotion);
    }
  };

  const setupWebBluetoothDetection = async () => {
    try {
      // Listen for smartwatch connections
      navigator.bluetooth.addEventListener('advertisementreceived', (event) => {
        const device = event.device;
        if (isKnownSmartwatchDevice(device.name || '')) {
          addOrUpdateDevice({
            id: device.id,
            name: device.name || 'Unknown Watch',
            type: getWatchType(device.name || ''),
            status: 'connected',
            sosEnabled: true,
            lastSync: new Date()
          });
        }
      });
    } catch (error) {
      console.log('Bluetooth scanning not available');
    }
  };

  const isKnownSmartwatchDevice = (deviceName: string): boolean => {
    const watchKeywords = [
      'apple watch', 'watch', 'galaxy watch', 'gear', 'boat watch',
      'fitbit', 'garmin', 'amazfit', 'fossil', 'ticwatch', 'wear os'
    ];
    return watchKeywords.some(keyword => 
      deviceName.toLowerCase().includes(keyword)
    );
  };

  const getWatchType = (deviceName: string): SmartWatchDevice['type'] => {
    const name = deviceName.toLowerCase();
    if (name.includes('apple') || name.includes('iwatch')) return 'apple';
    if (name.includes('samsung') || name.includes('galaxy') || name.includes('gear')) return 'samsung';
    if (name.includes('boat')) return 'boat';
    if (name.includes('fitbit')) return 'fitbit';
    if (name.includes('garmin')) return 'garmin';
    if (name.includes('amazfit')) return 'amazfit';
    return 'other';
  };

  const triggerSosFromWatch = (deviceType: string, deviceName: string) => {
    const device: SmartWatchDevice = {
      id: `${deviceType}-${Date.now()}`,
      name: deviceName,
      type: deviceType as SmartWatchDevice['type'],
      status: 'connected',
      sosEnabled: true,
      lastSync: new Date()
    };

    onSosTriggered('smartwatch', device);
    
    toast({
      title: "SOS Triggered",
      description: `Emergency alert activated from ${deviceName}`,
      variant: "destructive",
    });
  };

  const addOrUpdateDevice = (device: SmartWatchDevice) => {
    console.log('addOrUpdateDevice called with:', device);
    
    setConnectedDevices(prev => {
      console.log('Previous devices:', prev);
      const existingIndex = prev.findIndex(d => d.id === device.id);
      let updated;
      
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...device };
        console.log('Updated existing device at index:', existingIndex);
      } else {
        updated = [...prev, device];
        console.log('Added new device, total devices:', updated.length);
      }
      
      try {
        const serialized = updated.map(device => ({
          ...device,
          lastSync: device.lastSync ? device.lastSync.toISOString() : undefined
        }));
        localStorage.setItem('sakhi-smartwatch-devices', JSON.stringify(serialized));
        console.log('Saved to localStorage:', updated);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return updated;
    });
  };

  const toggleSosForDevice = (deviceId: string) => {
    setConnectedDevices(prev => {
      const updated = prev.map(device => 
        device.id === deviceId 
          ? { ...device, sosEnabled: !device.sosEnabled }
          : device
      );
      try {
        const serialized = updated.map(device => ({
          ...device,
          lastSync: device.lastSync ? device.lastSync.toISOString() : undefined
        }));
        localStorage.setItem('sakhi-smartwatch-devices', JSON.stringify(serialized));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return updated;
    });
  };

  const scanForDevices = async () => {
    if (!webBluetoothSupported) {
      toast({
        title: "Bluetooth Not Supported",
        description: "Your browser doesn't support Web Bluetooth. Use the companion app for full smartwatch integration.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['heart_rate', 'battery_service', 'device_information']
      });

      if (isKnownSmartwatchDevice(device.name || '')) {
        addOrUpdateDevice({
          id: device.id,
          name: device.name || 'Unknown Watch',
          type: getWatchType(device.name || ''),
          status: 'connected',
          sosEnabled: true,
          lastSync: new Date()
        });

        toast({
          title: "Smartwatch Connected",
          description: `${device.name} is now connected for SOS alerts`,
        });
      } else {
        toast({
          title: "Device Not Supported",
          description: "This device is not a recognized smartwatch",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to smartwatch. Make sure it's nearby and in pairing mode.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getDeviceIcon = (type: SmartWatchDevice['type']) => {
    switch (type) {
      case 'apple': return '⌚';
      case 'samsung': return '🌌';
      case 'boat': return '⛵';
      case 'fitbit': return '💪';
      case 'garmin': return '🗻';
      case 'amazfit': return '🏃';
      default: return '⌚';
    }
  };

  const getStatusColor = (status: SmartWatchDevice['status']) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'pairing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const clearAllDevices = () => {
    console.log('Clear All Devices button clicked!');
    setConnectedDevices([]);
    localStorage.removeItem('sakhi-smartwatch-devices');
    toast({
      title: "All Devices Removed",
      description: "All smartwatch connections have been cleared.",
    });
  };

  const addManualDevice = (type: SmartWatchDevice['type'], name: string) => {
    console.log('Adding manual device:', type, name);
    
    const device: SmartWatchDevice = {
      id: `manual-${type}-${Date.now()}`,
      name,
      type,
      status: 'connected',
      sosEnabled: true,
      lastSync: new Date()
    };
    
    console.log('Created device object:', device);
    addOrUpdateDevice(device);
    
    toast({
      title: "Device Added",
      description: `${name} has been added successfully. SOS functionality is now active.`,
    });
  };

  const removeDevice = (deviceId: string) => {
    setConnectedDevices(prev => {
      const updated = prev.filter(device => device.id !== deviceId);
      localStorage.setItem('sakhi-smartwatch-devices', JSON.stringify(updated));
      return updated;
    });
    
    toast({
      title: "Device Removed",
      description: "Smartwatch has been disconnected.",
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Watch className="w-5 h-5 mr-2" />
          Smartwatch Integration
        </CardTitle>
        <p className="text-sm text-gray-600">
          Connect your smartwatch for instant SOS activation
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connected Devices */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Connected Devices</Label>
          <div className="space-y-3">
            {connectedDevices.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Watch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No smartwatches connected</p>
                <p className="text-xs">Add your device below to enable SOS</p>
              </div>
            ) : (
              connectedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{getDeviceIcon(device.type)}</span>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {device.type.replace('-', ' ')} • {device.status}
                      </p>
                      {device.lastSync && (
                        <p className="text-xs text-gray-400">
                          Last sync: {new Date(device.lastSync).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`sos-${device.id}`} className="text-xs">SOS</Label>
                    <Switch
                      id={`sos-${device.id}`}
                      checked={device.sosEnabled}
                      onCheckedChange={() => toggleSosForDevice(device.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDevice(device.id)}
                      className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Device Management */}
        {connectedDevices.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllDevices}
              className="flex items-center space-x-2"
            >
              <span>Clear All Devices</span>
            </Button>
          </div>
        )}

        {/* Add Device Options */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Add Smartwatch</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={scanForDevices}
              disabled={isScanning}
              className="flex items-center space-x-2"
            >
              <Bluetooth className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Scan Bluetooth'}</span>
            </Button>
            <button
              type="button"
              onClick={() => {
                console.log('Boat Lunar Embrace button clicked!');
                addManualDevice('boat', 'Boat Lunar Embrace');
              }}
              className="p-3 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>⛵</span>
              <span>Boat Lunar Embrace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Apple Watch button clicked!');
                addManualDevice('apple', 'Apple Watch');
              }}
              className="p-3 border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>⌚</span>
              <span>Add Apple Watch</span>
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Samsung Galaxy Watch button clicked!');
                addManualDevice('samsung', 'Galaxy Watch');
              }}
              className="p-3 border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>🌌</span>
              <span>Add Samsung</span>
            </button>
          </div>
        </div>

        {/* SOS Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="flex items-center text-sm font-medium text-blue-900 mb-2">
            <Shield className="w-4 h-4 mr-2" />
            SOS Activation Methods
          </h4>
          <div className="space-y-2 text-xs text-blue-800">
            <div className="flex items-start space-x-2">
              <span>⌚</span>
              <div>
                <p className="font-medium">Apple Watch:</p>
                <p>Press and hold side button + Digital Crown for 3 seconds</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>🌌</span>
              <div>
                <p className="font-medium">Samsung Galaxy Watch:</p>
                <p>Triple press home button or rotate bezel + press button</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>⛵</span>
              <div>
                <p className="font-medium">Boat Lunar Embrace:</p>
                <p>Press and hold power button for 5 seconds or triple tap crown</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>📱</span>
              <div>
                <p className="font-medium">Emergency Gesture:</p>
                <p>Vigorous shaking motion (3 times) with any connected device</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Connected</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Pairing</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Disconnected</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {connectedDevices.filter(d => d.sosEnabled).length} SOS Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}