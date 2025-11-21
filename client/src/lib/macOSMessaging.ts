// macOS-specific automated messaging for emergency alerts
export class MacOSMessaging {
  private static isMacOS(): boolean {
    return navigator.userAgent.includes('Macintosh');
  }

  // Automatically send emergency SMS via Messages app
  static async sendEmergencyMessages(contacts: Array<{name: string; phoneNumber: string}>, emergencyData: any): Promise<void> {
    if (!this.isMacOS()) {
      console.log('Non-macOS device detected, using fallback messaging');
      return;
    }

    const locationUrl = `https://www.google.com/maps?q=${emergencyData.location.lat},${emergencyData.location.lng}`;
    
    for (const contact of contacts) {
      const message = `🚨 EMERGENCY ALERT 🚨

I need immediate help!

📍 Location: ${emergencyData.location.address}
🗺️ Live Location: ${locationUrl}
🕒 Time: ${new Date().toLocaleString()}

Emergency Services:
• Police: 100
• Ambulance: 108
• Women Helpline: 1091

This is an automated safety alert from Sakhi Suraksha app.`;

      // Open Messages app with pre-filled content
      this.openMessagesApp(contact.phoneNumber, message);
      
      // Open WhatsApp with emergency content
      setTimeout(() => {
        this.openWhatsApp(contact.phoneNumber, message);
      }, 2000);
    }
  }

  // Open macOS Messages app directly
  private static openMessagesApp(phoneNumber: string, message: string): void {
    try {
      // Primary method: Messages URL scheme
      const messagesUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.location.href = messagesUrl;

      // Backup method: iMessage protocol
      setTimeout(() => {
        const imessageUrl = `imessage:${phoneNumber}?body=${encodeURIComponent(message)}`;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = imessageUrl;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 3000);
      }, 1000);
    } catch (error) {
      console.error('Failed to open Messages app:', error);
    }
  }

  // Open WhatsApp for macOS
  private static openWhatsApp(phoneNumber: string, message: string): void {
    try {
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      
      // Try WhatsApp desktop app protocol
      const whatsappDesktop = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
      window.location.href = whatsappDesktop;

      // Fallback to WhatsApp Web
      setTimeout(() => {
        const whatsappWeb = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappWeb, '_blank');
      }, 1500);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
    }
  }

  // Send live location updates
  static sendLiveLocationUpdate(contacts: Array<{name: string; phoneNumber: string}>, location: any, streamUrl: string): void {
    const locationMessage = `🔴 LIVE LOCATION UPDATE 🔴

Current Location: ${location.address}
Live Map: https://www.google.com/maps?q=${location.lat},${location.lng}
Live Stream: ${streamUrl}

Time: ${new Date().toLocaleString()}

Emergency contact if needed: 100 (Police) | 108 (Ambulance)`;

    contacts.forEach(contact => {
      this.openWhatsApp(contact.phoneNumber, locationMessage);
    });
  }

  // Show native macOS notification
  static showNativeNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }
}