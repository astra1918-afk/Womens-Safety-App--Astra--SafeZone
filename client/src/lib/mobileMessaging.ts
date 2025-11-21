// Mobile-specific automated messaging for emergency alerts
export class MobileMessaging {
  private static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private static isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  private static isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // Automatically send emergency messages via mobile native apps
  static async sendEmergencyMessages(contacts: Array<{name: string; phoneNumber: string}>, emergencyData: any): Promise<void> {
    const locationUrl = `https://www.google.com/maps?q=${emergencyData.location.lat},${emergencyData.location.lng}`;
    
    for (const contact of contacts) {
      const message = `🚨 EMERGENCY ALERT 🚨

I need immediate help!

📍 Location: ${emergencyData.location.address}
🗺️ Live Location: ${locationUrl}
🕒 Time: ${new Date().toLocaleString()}
📹 Live Stream: ${emergencyData.streamUrl || 'Starting soon...'}

Emergency Services:
• Police: 100
• Ambulance: 108
• Women Helpline: 1091

This is an automated safety alert from Sakhi Suraksha app.`;

      // Send messages immediately with multiple methods
      this.sendMultiChannelAlert(contact, message);
    }
  }

  // Enhanced multi-channel alert system
  private static sendMultiChannelAlert(contact: {name: string; phoneNumber: string}, message: string): void {
    // Method 1: Direct SMS (works on both platforms)
    this.openNativeSMS(contact.phoneNumber, message);
    
    // Method 2: WhatsApp with multiple fallbacks
    setTimeout(() => {
      this.openWhatsAppWithFallbacks(contact.phoneNumber, message);
    }, 1000);
    
    // Method 3: Additional platform-specific methods
    setTimeout(() => {
      if (this.isAndroid()) {
        this.openAndroidSpecificApps(contact.phoneNumber, message);
      } else if (this.isIOS()) {
        this.openIOSSpecificApps(contact.phoneNumber, message);
      }
    }, 2000);
  }

  // Open native SMS app with pre-filled message
  private static openNativeSMS(phoneNumber: string, message: string): void {
    try {
      // iOS and Android SMS URL scheme
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      
      // Create invisible link and click it
      const link = document.createElement('a');
      link.href = smsUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`SMS opened for ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to open SMS app:', error);
    }
  }

  // Enhanced WhatsApp opening with multiple fallback methods
  private static openWhatsAppWithFallbacks(phoneNumber: string, message: string): void {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    try {
      // Method 1: WhatsApp app URL scheme (works on both platforms)
      const whatsappApp = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
      window.location.href = whatsappApp;
      
      // Method 2: WhatsApp Web fallback
      setTimeout(() => {
        const whatsappWeb = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappWeb, '_blank');
      }, 1000);
      
      console.log(`WhatsApp opened for ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      // Final fallback: Direct web URL
      const fallbackUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
      window.open(fallbackUrl, '_blank');
    }
  }

  // Android-specific messaging apps
  private static openAndroidSpecificApps(phoneNumber: string, message: string): void {
    try {
      // Google Messages intent
      const googleMessages = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      const link = document.createElement('a');
      link.href = googleMessages;
      link.click();
      
      // Telegram fallback
      setTimeout(() => {
        const telegramUrl = `https://t.me/+${phoneNumber.replace(/\D/g, '')}`;
        window.open(telegramUrl, '_blank');
      }, 2000);
      
    } catch (error) {
      console.error('Android messaging error:', error);
    }
  }

  // iOS-specific messaging apps
  private static openIOSSpecificApps(phoneNumber: string, message: string): void {
    try {
      // iMessage intent
      const imessage = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;
      window.location.href = imessage;
      
      // Alternative SMS format for iOS
      setTimeout(() => {
        const iosSms = `sms://${phoneNumber}?&body=${encodeURIComponent(message)}`;
        window.location.href = iosSms;
      }, 1000);
      
    } catch (error) {
      console.error('iOS messaging error:', error);
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

    contacts.forEach((contact, index) => {
      setTimeout(() => {
        this.openWhatsAppWithFallbacks(contact.phoneNumber, locationMessage);
        this.openNativeSMS(contact.phoneNumber, locationMessage);
      }, index * 1000);
    });
  }

  // Show mobile notification
  static showNativeNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { 
            body, 
            icon: '/favicon.ico'
          });
        }
      });
    }
  }

  // Auto-dial emergency numbers
  static dialEmergencyNumber(number: string, serviceName: string): void {
    try {
      // Mobile phone dialer
      const telUrl = `tel:${number}`;
      window.location.href = telUrl;
      
      this.showNativeNotification(
        `Calling ${serviceName}`,
        `Dialing ${number} for emergency assistance`
      );
    } catch (error) {
      console.error('Failed to dial emergency number:', error);
    }
  }
}