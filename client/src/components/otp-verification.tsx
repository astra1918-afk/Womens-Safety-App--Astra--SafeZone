import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Phone, CheckCircle } from "lucide-react";

interface OTPVerificationProps {
  identifier: string;
  type: 'phone';
  onVerified: () => void;
  onCancel?: () => void;
}

export default function OTPVerification({ identifier, type, onVerified, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/otp/send', 'POST', {
        identifier,
        type
      });
    },
    onSuccess: () => {
      setIsOtpSent(true);
      setResendCooldown(30); // 30 second cooldown
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "OTP Sent",
        description: `Verification code sent to your ${type === 'phone' ? 'phone number' : 'email address'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/otp/verify', 'POST', {
        identifier,
        type,
        otp
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.verified) {
        toast({
          title: "Verification Successful",
          description: `Your ${type === 'phone' ? 'phone number' : 'email address'} has been verified`,
        });
        onVerified();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
      setOtp("");
    },
  });

  const handleSendOtp = () => {
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate();
  };

  const handleResendOtp = () => {
    if (resendCooldown === 0) {
      setOtp("");
      sendOtpMutation.mutate();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center">
          {type === 'phone' ? (
            <Phone className="w-8 h-8 text-pink-600" />
          ) : (
            <Mail className="w-8 h-8 text-pink-600" />
          )}
        </div>
        <CardTitle className="text-xl font-semibold">
          Verify {type === 'phone' ? 'Phone Number' : 'Email Address'}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          {isOtpSent 
            ? `Enter the 6-digit code sent to ${identifier}`
            : `We'll send a verification code to ${identifier}`
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isOtpSent ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click the button below to receive your verification code
            </p>
            <Button 
              onClick={handleSendOtp}
              disabled={sendOtpMutation.isPending}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            >
              {sendOtpMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send Verification Code`
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <Button 
              onClick={handleVerifyOtp}
              disabled={verifyOtpMutation.isPending || otp.length !== 6}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            >
              {verifyOtpMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Code
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn't receive the code?{" "}
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || sendOtpMutation.isPending}
                  className="text-pink-600 hover:text-pink-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {onCancel && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}