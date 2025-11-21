import { apiRequest } from "./queryClient";
import type { InsertEmergencyAlert } from "@shared/schema";

export async function triggerEmergencyProtocol(alertData: InsertEmergencyAlert) {
  try {
    // Create emergency alert
    const response = await apiRequest("POST", "/api/emergency-alerts", alertData);
    const alert = await response.json();

    // Start location sharing
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          // In a real app, this would send location updates to the server
          console.log("Location update:", position.coords);
        },
        (error) => {
          console.error("Location error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    return alert;
  } catch (error) {
    console.error("Emergency protocol failed:", error);
    throw error;
  }
}

export async function sendSMSAlert(phoneNumber: string, message: string) {
  try {
    const response = await apiRequest("POST", "/api/send-sms", {
      phoneNumber,
      message
    });
    return await response.json();
  } catch (error) {
    console.error("SMS sending failed:", error);
    throw error;
  }
}

export function generateEmergencyMessage(location?: { latitude: number; longitude: number }) {
  const baseMessage = "🚨 EMERGENCY ALERT 🚨\n\nI need immediate help. This is an automated message from Sakhi Suraksha app.";
  
  if (location) {
    const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    return `${baseMessage}\n\nMy location: ${mapsUrl}\n\nTime: ${new Date().toLocaleString()}`;
  }
  
  return `${baseMessage}\n\nLocation unavailable\n\nTime: ${new Date().toLocaleString()}`;
}

export function createLocationShareLink(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}
