import { Users, Plus, Phone, Edit3, Trash2, X, QrCode, Scan } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmergencyContactSchema, type EmergencyContact, type InsertEmergencyContact } from "@shared/schema";
import { useState } from "react";
import SimpleFamilyQR from "@/components/simple-family-qr";

export default function Contacts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  
  // Fetch emergency contacts
  const { data: contacts = [], isLoading } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts"],
    retry: false
  });

  const form = useForm<InsertEmergencyContact>({
    resolver: zodResolver(insertEmergencyContactSchema.omit({ userId: true })),
    defaultValues: {
      name: "",
      phoneNumber: "",
      relationship: "",
      isActive: true,
      isPrimary: false
    }
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: InsertEmergencyContact) => {
      console.log('Creating contact with data:', data);
      const response = await fetch("/api/emergency-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create contact');
      }
      
      return response.json();
    },
    onSuccess: (newContact) => {
      console.log('Contact created successfully:', newContact);
      toast({
        title: "Contact Added",
        description: "Emergency contact has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      form.reset({
        name: "",
        phoneNumber: "",
        relationship: "",
        isActive: true,
        isPrimary: false
      });
      setSelectedCountryCode("+91");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Create contact error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add emergency contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertEmergencyContact> }) => {
      const response = await fetch(`/api/emergency-contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update contact');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contact Updated",
        description: "Emergency contact has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      form.reset();
      setEditingContact(null);
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update emergency contact.",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/emergency-contacts/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contact Deleted",
        description: "Emergency contact has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete emergency contact.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (contact: EmergencyContact) => {
    setEditingContact(contact);
    
    // Extract country code from phone number
    const phoneWithoutCode = contact.phoneNumber?.replace(/^\+\d{1,3}/, '') || '';
    const countryCode = contact.phoneNumber?.match(/^\+\d{1,3}/)?.[0] || '+91';
    
    setSelectedCountryCode(countryCode);
    
    form.reset({
      name: contact.name || '',
      phoneNumber: phoneWithoutCode,
      relationship: contact.relationship || '',
      isActive: contact.isActive !== null ? contact.isActive : true,
      isPrimary: contact.isPrimary !== null ? contact.isPrimary : false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: InsertEmergencyContact) => {
    try {
      console.log('Form submitted with data:', data);
      console.log('Form errors:', form.formState.errors);
      
      const fullPhoneNumber = selectedCountryCode + data.phoneNumber.replace(/\D/g, '');
      const contactData = {
        ...data,
        phoneNumber: fullPhoneNumber
      };

      console.log('Submitting contact data:', contactData);

      if (editingContact) {
        updateContactMutation.mutate({ 
          id: editingContact.id, 
          data: contactData 
        });
      } else {
        createContactMutation.mutate(contactData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteContactMutation.mutate(id);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    form.reset();
    setSelectedCountryCode("+91");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading contacts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Emergency Contacts</h1>
          <p className="text-gray-600">Manage your trusted contacts for emergency situations</p>
        </div>

        {/* Family Connection QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Connect with Parents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleFamilyQR />
          </CardContent>
        </Card>

        {/* Add Contact Button */}
        <Card>
          <CardContent className="p-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  onClick={() => {
                    setEditingContact(null);
                    form.reset();
                    setSelectedCountryCode("+91");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Emergency Contact
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? "Edit Contact" : "Add Emergency Contact"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter contact's full name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <div className="flex gap-2">
                            <Select 
                              value={selectedCountryCode} 
                              onValueChange={setSelectedCountryCode}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="+1">🇺🇸 +1</SelectItem>
                                <SelectItem value="+91">🇮🇳 +91</SelectItem>
                                <SelectItem value="+44">🇬🇧 +44</SelectItem>
                                <SelectItem value="+86">🇨🇳 +86</SelectItem>
                                <SelectItem value="+81">🇯🇵 +81</SelectItem>
                                <SelectItem value="+49">🇩🇪 +49</SelectItem>
                                <SelectItem value="+33">🇫🇷 +33</SelectItem>
                                <SelectItem value="+61">🇦🇺 +61</SelectItem>
                                <SelectItem value="+55">🇧🇷 +55</SelectItem>
                                <SelectItem value="+7">🇷🇺 +7</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormControl>
                              <Input 
                                placeholder="9876543210" 
                                {...field}
                                onChange={(e) => {
                                  const cleanNumber = e.target.value.replace(/\D/g, '');
                                  field.onChange(cleanNumber);
                                }}
                                className="flex-1"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Colleague">Colleague</SelectItem>
                              <SelectItem value="Neighbor">Neighbor</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name="isPrimary"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Primary Contact</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Active</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createContactMutation.isPending || updateContactMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      >
                        {(createContactMutation.isPending || updateContactMutation.isPending) 
                          ? "Saving..." 
                          : editingContact 
                            ? "Update Contact" 
                            : "Add Contact"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Emergency Contacts List */}
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Emergency Contacts</h3>
                <p className="text-gray-600 mb-4">
                  Add trusted contacts who will be notified during emergencies
                </p>
              </CardContent>
            </Card>
          ) : (
            contacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {contact.name}
                        </h3>
                        <div className="flex gap-2">
                          {contact.isPrimary && (
                            <Badge variant="default" className="bg-orange-100 text-orange-800">
                              Primary
                            </Badge>
                          )}
                          <Badge 
                            variant={contact.isActive ? "secondary" : "outline"}
                            className={contact.isActive ? "bg-green-100 text-green-800" : ""}
                          >
                            {contact.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{contact.phoneNumber}</span>
                        </div>
                        <div>
                          <span className="font-medium">Relationship:</span> {contact.relationship}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(contact)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deleteContactMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer spacing to prevent content cutoff */}
        <div className="h-32 pb-8"></div>
      </div>
    </div>
  );
}