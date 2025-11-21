import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIotDeviceSchema, type IotDevice, type InsertIotDevice } from "@shared/schema";
import { 
  Watch, 
  Smartphone, 
  Heart, 
  Activity, 
  Battery, 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothSearching,
  Plus,
  Settings,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff
} from "lucide-react";

interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  gatt?: BluetoothRemoteGATTServer;
}

export default function IoTDeviceManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<BluetoothDevice | null>(null);

  // Fetch connected IoT devices
  const { data: devices = [], isLoading } = useQuery<IotDevice[]>({
    queryKey: ["/api/iot-devices"],
    retry: false
  });

  const form = useForm<InsertIotDevice>({
    resolver: zodResolver(insertIotDeviceSchema),
    defaultValues: {
      userId: "demo-user",
      deviceName: "",
      deviceType: "smartwatch",
      macAddress: "",
      bluetoothId: "",
      isConnected: false,
      batteryLevel: 100,
      firmwareVersion: "",
      connectionStatus: "disconnected"
    }
  });

  // Add new IoT device
  const addDeviceMutation = useMutation({
    mutationFn: async (data: InsertIotDevice) => {
      const response = await fetch("/api/iot-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add device');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Added",
        description: "IoT device has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/iot-devices"] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add IoT device.",
        variant: "destructive",
      });
    },
  });

  // Connect device
  const connectDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await fetch(`/api/iot-devices/${deviceId}/connect`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect device');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Connected",
        description: "IoT device connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/iot-devices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to device.",
        variant: "destructive",
      });
    },
  });

  // Disconnect device
  const disconnectDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await fetch(`/api/iot-devices/${deviceId}/disconnect`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect device');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Disconnected",
        description: "IoT device disconnected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/iot-devices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect device.",
        variant: "destructive",
      });
    },
  });

  // Delete device
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await fetch(`/api/iot-devices/${deviceId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete device');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Removed",
        description: "IoT device has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/iot-devices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove device.",
        variant: "destructive",
      });
    },
  });

  // Bluetooth Low Energy scanning
  const scanForBluetoothDevices = async () => {
    if (!('bluetooth' in navigator)) {
      toast({
        title: "Manual Device Setup",
        description: "Safari browser doesn't support Bluetooth scanning. Please add your smartwatch device manually using the form below.",
        variant: "default",
      });
      return;
    }

    setIsScanning(true);
    try {
      // Request Bluetooth device with health and fitness services
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['heart_rate'] },
          { services: ['fitness_machine'] },
          { services: ['health_thermometer'] },
          { namePrefix: 'Apple Watch' },
          { namePrefix: 'Samsung' },
          { namePrefix: 'Fitbit' },
          { namePrefix: 'Garmin' },
          { namePrefix: 'EMBRACE' },
          { name: 'EMBRACE_C869' }
        ],
        optionalServices: [
          'battery_service',
          'device_information',
          'generic_attribute',
          'generic_access'
        ]
      });

      if (device) {
        const bluetoothDevice: BluetoothDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          connected: device.gatt?.connected || false,
          gatt: device.gatt
        };

        setBluetoothDevices(prev => [...prev, bluetoothDevice]);
        setSelectedBluetoothDevice(bluetoothDevice);
        
        // Try to connect and read device information
        try {
          if (device.gatt) {
            const server = await device.gatt.connect();
            let batteryLevel = 100; // Default
            let firmwareVersion = "1.0.0"; // Default
            
            // Try to read battery level
            try {
              const batteryService = await server.getPrimaryService('battery_service');
              const batteryCharacteristic = await batteryService.getCharacteristic('battery_level');
              const batteryData = await batteryCharacteristic.readValue();
              batteryLevel = batteryData.getUint8(0);
              console.log('Real battery level:', batteryLevel);
            } catch (batteryError) {
              console.log('Battery service not available for', device.name);
            }
            
            // Try to read device information
            try {
              const deviceInfoService = await server.getPrimaryService('device_information');
              const firmwareCharacteristic = await deviceInfoService.getCharacteristic('firmware_revision_string');
              const firmwareData = await firmwareCharacteristic.readValue();
              firmwareVersion = new TextDecoder().decode(firmwareData);
            } catch (firmwareError) {
              console.log('Device info service not available for', device.name);
            }
            
            // Pre-fill form with real device information
            form.setValue('deviceName', bluetoothDevice.name);
            form.setValue('bluetoothId', bluetoothDevice.id);
            form.setValue('batteryLevel', batteryLevel);
            form.setValue('firmwareVersion', firmwareVersion);
            form.setValue('isConnected', true);
            form.setValue('connectionStatus', 'connected');
            
            toast({
              title: "Device Connected",
              description: `Connected to ${bluetoothDevice.name}. Battery: ${batteryLevel}%`,
            });
          }
        } catch (connectionError) {
          console.log('Failed to connect for initial reading:', connectionError);
          // Pre-fill form with basic device information
          form.setValue('deviceName', bluetoothDevice.name);
          form.setValue('bluetoothId', bluetoothDevice.id);
          
          toast({
            title: "Device Found",
            description: `Found ${bluetoothDevice.name}. Ready to add to your devices.`,
          });
        }
      }
    } catch (error) {
      console.error('Bluetooth scan error:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to scan for Bluetooth devices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Connect to Bluetooth device
  const connectToBluetoothDevice = async (device: BluetoothDevice) => {
    try {
      if (device.gatt && !device.gatt.connected) {
        const server = await device.gatt.connect();
        setBluetoothDevices(prev =>
          prev.map(d => d.id === device.id ? { ...d, connected: true } : d)
        );
        
        // Start battery monitoring for this device
        startBatteryMonitoring(device, server);
        
        toast({
          title: "Connected",
          description: `Connected to ${device.name} via Bluetooth.`,
        });
      }
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Bluetooth device.",
        variant: "destructive",
      });
    }
  };

  // Battery monitoring for connected devices
  const startBatteryMonitoring = async (device: BluetoothDevice, server: BluetoothRemoteGATTServer) => {
    const monitorBattery = async () => {
      try {
        const batteryService = await server.getPrimaryService('battery_service');
        const batteryCharacteristic = await batteryService.getCharacteristic('battery_level');
        const batteryData = await batteryCharacteristic.readValue();
        const batteryLevel = batteryData.getUint8(0);
        
        // Update the device battery level via API
        const matchingDevice = queryClient.getQueryData(["/api/iot-devices"]) as any[];
        const deviceToUpdate = matchingDevice?.find((iotDevice: any) => 
          iotDevice.bluetoothId === device.id
        );
        
        if (deviceToUpdate) {
          try {
            await fetch(`/api/iot-devices/${deviceToUpdate.id}/battery`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batteryLevel })
            });
            
            // Invalidate cache to refresh the UI with updated battery level
            queryClient.invalidateQueries({ queryKey: ["/api/iot-devices"] });
            
            console.log(`Battery update for ${device.name}: ${batteryLevel}%`);
          } catch (error) {
            console.error(`Failed to update battery for ${device.name}:`, error);
          }
        }
      } catch (error) {
        console.log(`Battery monitoring failed for ${device.name}:`, error);
      }
    };

    // Monitor battery every 30 seconds
    const intervalId = setInterval(monitorBattery, 30000);
    
    // Stop monitoring when device disconnects
    device.addEventListener('gattserverdisconnected', () => {
      clearInterval(intervalId);
      console.log(`Stopped battery monitoring for ${device.name}`);
    });
    
    // Initial battery read
    monitorBattery();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'smartwatch':
        return <Watch className="w-6 h-6" />;
      case 'fitness_tracker':
        return <Activity className="w-6 h-6" />;
      case 'health_monitor':
        return <Heart className="w-6 h-6" />;
      default:
        return <Smartphone className="w-6 h-6" />;
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      case 'pairing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = (data: InsertIotDevice) => {
    console.log('Form submission started:', data);
    console.log('Form errors:', form.formState.errors);
    
    // Validate required fields
    if (!data.deviceName || data.deviceName.trim() === '') {
      console.error('Device name is required');
      toast({
        title: "Validation Error",
        description: "Device name is required",
        variant: "destructive",
      });
      return;
    }
    
    // Add userId from session to the device data
    const deviceData = {
      ...data,
      userId: "demo-user",
      connectionStatus: "disconnected",
      isConnected: false
    };
    
    console.log('Submitting device data:', deviceData);
    addDeviceMutation.mutate(deviceData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading IoT devices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">IoT Device Manager</h1>
          <p className="text-gray-600">Connect and manage your smartwatch and health monitoring devices</p>
        </div>

        {/* Add Device Button */}
        <Card>
          <CardContent className="p-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  onClick={() => {
                    form.reset({
                      userId: "demo-user",
                      deviceName: "EMBRACE_C869",
                      deviceType: "smartwatch",
                      macAddress: "",
                      bluetoothId: "",
                      isConnected: false,
                      batteryLevel: 100,
                      firmwareVersion: "1.0.0",
                      connectionStatus: "disconnected"
                    });
                    setSelectedBluetoothDevice(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add IoT Device
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New IoT Device</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Bluetooth Scan Button - Safari compatible */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={scanForBluetoothDevices}
                      disabled={isScanning}
                      className="w-full"
                    >
                      {isScanning ? (
                        <BluetoothSearching className="w-4 h-4 mr-2 animate-pulse" />
                      ) : (
                        <Bluetooth className="w-4 h-4 mr-2" />
                      )}
                      {isScanning ? "Scanning for devices..." : "Scan for Bluetooth Devices"}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Safari users: Use manual setup below if scanning doesn't work
                    </p>
                  </div>

                  {/* Selected Bluetooth Device */}
                  {selectedBluetoothDevice && (
                    <div className="p-3 border rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedBluetoothDevice.name}</span>
                        <Badge variant={selectedBluetoothDevice.connected ? "default" : "secondary"}>
                          {selectedBluetoothDevice.connected ? "Connected" : "Found"}
                        </Badge>
                      </div>
                      {!selectedBluetoothDevice.connected && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => connectToBluetoothDevice(selectedBluetoothDevice)}
                          className="mt-2"
                        >
                          <BluetoothConnected className="w-3 h-3 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                  )}
                
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="deviceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Device Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="My Apple Watch" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Device Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select device type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="smartwatch">Smartwatch</SelectItem>
                                <SelectItem value="fitness_tracker">Fitness Tracker</SelectItem>
                                <SelectItem value="health_monitor">Health Monitor</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="firmwareVersion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firmware Version (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="1.0.0" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addDeviceMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                          {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Devices List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <Watch className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No IoT Devices</h3>
                <p className="text-gray-600 mb-4">
                  Connect your smartwatch or health monitoring devices to start tracking vital signs and stress levels
                </p>
              </CardContent>
            </Card>
          ) : (
            devices.map((device) => (
              <Card key={device.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(device.deviceType)}
                      <div>
                        <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                        <p className="text-sm text-gray-500 capitalize">{device.deviceType.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={getConnectionStatusColor(device.connectionStatus)}>
                      {device.connectionStatus}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Battery Level */}
                  {device.batteryLevel && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Battery className="w-4 h-4" />
                          Battery
                        </span>
                        <span>{device.batteryLevel}%</span>
                      </div>
                      <Progress value={device.batteryLevel} className="h-2" />
                    </div>
                  )}

                  {/* Device Info */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {device.firmwareVersion && (
                      <div className="flex justify-between">
                        <span>Firmware:</span>
                        <span>{device.firmwareVersion}</span>
                      </div>
                    )}
                    {device.lastConnected && (
                      <div className="flex justify-between">
                        <span>Last Connected:</span>
                        <span>{new Date(device.lastConnected).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {device.isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disconnectDeviceMutation.mutate(device.id)}
                        disabled={disconnectDeviceMutation.isPending}
                        className="flex-1"
                      >
                        <WifiOff className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectDeviceMutation.mutate(device.id)}
                        disabled={connectDeviceMutation.isPending}
                        className="flex-1"
                      >
                        <Wifi className="w-3 h-3 mr-1" />
                        Connect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDeviceMutation.mutate(device.id)}
                      disabled={deleteDeviceMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}