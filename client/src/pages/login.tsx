import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Phone, Mail, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function Login() {
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    password: ''
  });
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; email: string }) => {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to send OTP');
      return response.json();
    },
    onSuccess: () => {
      setStep('otp');
      toast({
        title: "OTP Sent",
        description: "Check your phone and email for verification codes"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; email: string; otp: string }) => {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Invalid OTP');
      return response.json();
    },
    onSuccess: () => {
      setStep('profile');
      toast({
        title: "Verified",
        description: "Phone and email verified successfully"
      });
    },
    onError: () => {
      toast({
        title: "Invalid OTP",
        description: "Please check your verification code and try again.",
        variant: "destructive"
      });
    }
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create profile');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Astra",
        description: "Your profile has been created successfully"
      });
      // Redirect to main app
      window.location.href = '/';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendOtp = () => {
    if (!phoneNumber || !email) {
      toast({
        title: "Missing Information",
        description: "Please enter both phone number and email",
        variant: "destructive"
      });
      return;
    }
    sendOtpMutation.mutate({ phoneNumber, email });
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit verification code",
        variant: "destructive"
      });
      return;
    }
    verifyOtpMutation.mutate({ phoneNumber, email, otp });
  };

  const handleCreateProfile = () => {
    if (!profile.firstName || !profile.lastName || !profile.password) {
      toast({
        title: "Incomplete Profile",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createProfileMutation.mutate({
      phoneNumber,
      email,
      ...profile
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Astra </CardTitle>
          <CardDescription>
            {step === 'phone' && "Secure login with phone and email verification"}
            {step === 'otp' && "Enter the verification codes sent to your devices"}
            {step === 'profile' && "Complete your security profile"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                {sendOtpMutation.isPending ? "Sending..." : "Send Verification Codes"}
              </Button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                Verification codes sent to:
                <br />
                <strong>{phoneNumber}</strong> and <strong>{email}</strong>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('phone')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={profile.password}
                  onChange={(e) => setProfile(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('otp')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateProfile}
                  disabled={createProfileMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {createProfileMutation.isPending ? "Creating..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}