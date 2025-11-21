import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FamilyConnectionQR from "@/components/family-connection-qr";
import ParentQRScanner from "@/components/parent-qr-scanner";
import { Users, Baby, UserCheck } from "lucide-react";

export default function FamilyConnection() {
  const [userRole, setUserRole] = useState<'child' | 'parent' | null>(null);

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Safety Connection</h1>
            <p className="text-gray-600">Connect with your family members for enhanced safety monitoring</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setUserRole('child')}>
              <CardHeader className="text-center">
                <Baby className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <CardTitle>I'm a Child/Student</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Generate a QR code for your parents to scan and connect to your safety app
                </p>
                <Button className="w-full">
                  Generate Connection Code
                </Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setUserRole('parent')}>
              <CardHeader className="text-center">
                <UserCheck className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <CardTitle>I'm a Parent/Guardian</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Scan your child's QR code to receive emergency alerts and monitor their safety
                </p>
                <Button className="w-full">
                  Scan Child's Code
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Safety Connection</h1>
            <p className="text-gray-600">
              {userRole === 'child' ? 'Share your safety connection with parents' : 'Connect to your child\'s safety app'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setUserRole(null)}>
            Switch Role
          </Button>
        </div>

        {userRole === 'child' ? (
          <FamilyConnectionQR />
        ) : (
          <div className="space-y-6">
            <ParentQRScanner />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  After Connecting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Real-time Emergency Alerts</h3>
                    <p className="text-blue-700 text-sm">
                      Receive instant notifications when your child triggers an SOS alert
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Live Location Tracking</h3>
                    <p className="text-green-700 text-sm">
                      View your child's location during emergencies and safe zone updates
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Video Stream Access</h3>
                    <p className="text-purple-700 text-sm">
                      Access live video streams during emergency situations
                    </p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">Two-way Communication</h3>
                    <p className="text-orange-700 text-sm">
                      Communicate directly with your child through the safety app
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}