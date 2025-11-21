import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, MapPin, Camera, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/hooks/use-location";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function SafetyIssueReporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("");
  const { location: userLocation } = useLocation();
  const { toast } = useToast();

  const reportIssueMutation = useMutation({
    mutationFn: async (issueData: any) => {
      const response = await fetch('/api/safety-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: issueData.type,
          description: issueData.description,
          location: {
            latitude: issueData.latitude,
            longitude: issueData.longitude
          },
          severity: issueData.severity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit safety report');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Safety Issue Reported",
        description: "Your report has been submitted to the community and authorities",
      });
      
      // Reset form
      setIssueType("");
      setDescription("");
      setLocation("");
      setSeverity("");
      setIsOpen(false);
      
      // Invalidate alerts cache to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/community-alerts"] });
    },
    onError: (error) => {
      console.error("Error reporting issue:", error);
      toast({
        title: "Report Failed",
        description: "Failed to submit your safety report. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType || !description || !severity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const currentLocation = userLocation || { latitude: 12.9716, longitude: 77.5946 };
    
    const issueData = {
      type: issueType,
      description,
      location: location || `${currentLocation.latitude}, ${currentLocation.longitude}`,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      severity,
      reportedAt: new Date().toISOString(),
      verified: false
    };

    reportIssueMutation.mutate(issueData);
  };

  const issueTypes = [
    "Poor Lighting",
    "Suspicious Activity",
    "Harassment",
    "Unsafe Infrastructure",
    "Emergency Situation",
    "Traffic Safety",
    "Other"
  ];

  const severityLevels = [
    { value: "low", label: "Low - General Concern", color: "text-yellow-600" },
    { value: "medium", label: "Medium - Needs Attention", color: "text-orange-600" },
    { value: "high", label: "High - Immediate Action Required", color: "text-red-600" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Safety Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Report Safety Issue
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="issue-type">Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="severity">Severity Level *</Label>
            <Select value={severity} onValueChange={setSeverity} required>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <span className={level.color}>{level.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="flex space-x-2">
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Current location will be used if empty"
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (userLocation) {
                    setLocation(`${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`);
                  }
                }}
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the safety issue in detail..."
              rows={3}
              required
            />
          </div>

          <div className="flex space-x-2">
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={reportIssueMutation.isPending}
            >
              {reportIssueMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}