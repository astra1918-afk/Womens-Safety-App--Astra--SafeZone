import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDestinationSchema, type InsertDestination } from "@shared/schema";
import { MapPin, Plus, Navigation, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Destinations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ["/api/destinations"],
    queryFn: async () => {
      const response = await fetch("/api/destinations");
      if (!response.ok) throw new Error("Failed to fetch destinations");
      return response.json();
    },
  });

  const createDestinationMutation = useMutation({
    mutationFn: async (data: InsertDestination) => {
      const response = await fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create destination");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      setIsDialogOpen(false);
      toast({
        title: "Destination Added",
        description: "Your safe destination has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add destination. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/destinations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete destination");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      toast({
        title: "Destination Removed",
        description: "The destination has been deleted successfully",
      });
    },
  });

  const form = useForm<InsertDestination>({
    resolver: zodResolver(insertDestinationSchema),
    defaultValues: {
      userId: user?.id || "",
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const onSubmit = (data: InsertDestination) => {
    createDestinationMutation.mutate({
      ...data,
      userId: user?.id || "",
    });
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue("latitude", latitude);
          form.setValue("longitude", longitude);
          form.setValue("address", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast({
            title: "Location Updated",
            description: "Current location has been set as destination",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not get current location. Please enter manually.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const startNavigation = (destination: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safe Destinations</h1>
          <p className="text-gray-600">Manage your frequently visited safe places</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Destination
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Safe Destination</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Home, Office, Friend's House..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full address or coordinates" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any" 
                            placeholder="0.000000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any" 
                            placeholder="0.000000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={getCurrentLocation}
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>

                <div className="flex gap-2">
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
                    disabled={createDestinationMutation.isPending}
                    className="flex-1"
                  >
                    {createDestinationMutation.isPending ? "Adding..." : "Add Destination"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {destinations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Destinations Yet</h3>
            <p className="text-gray-600 mb-4">
              Add your frequently visited safe places for quick navigation
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Destination
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {destinations.map((destination: any) => (
            <Card key={destination.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                      {destination.name}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{destination.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDestinationMutation.mutate(destination.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    onClick={() => startNavigation(destination)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Navigate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Share destination location
                      if (navigator.share) {
                        navigator.share({
                          title: `Safe Destination: ${destination.name}`,
                          text: `I'm heading to ${destination.name}`,
                          url: `https://www.google.com/maps?q=${destination.latitude},${destination.longitude}`,
                        });
                      }
                    }}
                  >
                    Share Location
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Added {new Date(destination.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}