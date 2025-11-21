// Device SMS service for sending emergency messages from user's device
export class DeviceSmsService {
  // Check if SMS is supported on the device
  static isSupported(): boolean {
    return 'navigator' in window && 'share' in navigator;
  }

  // Send SMS using device's native SMS capability
  static async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Method 1: Use SMS URL scheme (works on most mobile browsers)
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      
      // Open SMS app with pre-filled message
      window.open(smsUrl, '_self');
      
      return true;
    } catch (error) {
      console.error('Failed to open SMS app:', error);
      return false;
    }
  }

  // Send emergency SMS to multiple contacts
  static async sendEmergencyBroadcast(
    contacts: Array<{ name: string; phoneNumber: string }>,
    message: string
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        const success = await this.sendSMS(contact.phoneNumber, message);
        if (success) {
          sent++;
          console.log(`SMS opened for ${contact.name}: ${contact.phoneNumber}`);
        } else {
          failed++;
        }
        
        // Small delay between opening SMS apps
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.name}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  // Format emergency message with location and timestamp
  static formatEmergencyMessage(
    triggerType: string,
    location: { lat: number; lng: number; address: string },
    additionalInfo?: string
  ): string {
    const timestamp = new Date().toLocaleString();
    
    return `🚨 EMERGENCY ALERT - Sakhi Suraksha

${triggerType} detected at ${timestamp}

Location: ${location.address}
GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}

${additionalInfo || 'Please check on my safety immediately.'}

This is an automated emergency message.`;
  }

  // Create Google Maps link for location sharing
  static createLocationLink(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
}