import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DemoHome from "@/pages/demo-home";
import Map from "@/pages/map";
import Contacts from "@/pages/contacts";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Destinations from "@/pages/destinations";
import ProfileSetup from "@/pages/profile-setup";
import StreamView from "@/pages/stream-view";
import EmergencyStreamPage from "@/pages/emergency-stream";
import WatchStream from "@/pages/watch-stream";
import EmergencyWatchPage from "@/pages/emergency-watch";
import SimpleParentDashboard from "@/pages/simple-parent-dashboard";
import EmergencyAlerts from "@/pages/emergency-alerts";
import IoTDeviceManager from "@/components/iot-device-manager";
import BottomNavigation from "@/components/bottom-navigation";
import VoiceIndicator from "@/components/voice-indicator";
import FakeCallOverlay from "@/components/fake-call-overlay";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show login page first if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-mobile mx-auto bg-gradient-to-br from-pink-50 to-purple-50 min-h-screen">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/auth" component={Landing} />
          <Route path="/emergency-stream/:streamId" component={EmergencyStreamPage} />
          <Route path="/watch/:streamId" component={WatchStream} />
          <Route path="/emergency-watch/:streamId" component={EmergencyWatchPage} />
          <Route path="/parent-dashboard" component={SimpleParentDashboard} />
          <Route component={Login} />
        </Switch>
      </div>
    );
  }

  return (
    <Switch>
      {/* Parent dashboard route - completely independent */}
      <Route path="/parent-dashboard">
        <SimpleParentDashboard />
      </Route>
      
      {/* Emergency alerts page for parent dashboard */}
      <Route path="/emergency-alerts">
        <EmergencyAlerts />
      </Route>
      
      {/* Emergency watch page for live streaming */}
      <Route path="/emergency-watch/:streamId">
        <EmergencyWatchPage />
      </Route>
      
      {/* Main app routes with navigation */}
      <Route>
        <div className="max-w-mobile mx-auto bg-gradient-to-br from-pink-50 to-purple-50 min-h-screen relative">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/map" component={Map} />
            <Route path="/contacts" component={Contacts} />
            <Route path="/settings" component={Settings} />
            <Route path="/destinations" component={Destinations} />
            <Route path="/iot-devices" component={IoTDeviceManager} />
            <Route path="/profile-setup" component={ProfileSetup} />
            <Route path="/stream/:streamId" component={StreamView} />
            <Route path="/emergency-stream/:streamId" component={EmergencyStreamPage} />
            <Route component={NotFound} />
          </Switch>
          
          <BottomNavigation />
          <VoiceIndicator />
          <FakeCallOverlay />
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
