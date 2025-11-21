// Windows-specific automated messaging for emergency alerts
export class WindowsMessaging {
  private static isWindows(): boolean {
    return navigator.userAgent.includes('Windows');
  }

  // Automatically send emergency messages via Windows native apps
  static async sendEmergencyMessages(contacts: Array<{name: string; phoneNumber: string}>, emergencyData: any): Promise<void> {
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

      // Open Windows messaging apps
      this.openWhatsAppWindows(contact.phoneNumber, message);
      
      // Open default SMS app
      setTimeout(() => {
        this.openSMSWindows(contact.phoneNumber, message);
      }, 2000);
      
      // Copy to clipboard as backup
      setTimeout(() => {
        this.copyToClipboardWithNotification(contact.name, contact.phoneNumber, message);
      }, 4000);
    }
  }

  // Open WhatsApp for Windows
  private static openWhatsAppWindows(phoneNumber: string, message: string): void {
    try {
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      
      // Try WhatsApp desktop app first
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

  // Open Windows SMS app
  private static openSMSWindows(phoneNumber: string, message: string): void {
    try {
      // Windows 10/11 SMS URL scheme
      const smsUrl = `ms-chat:?Body=${encodeURIComponent(message)}&Addresses=${phoneNumber}`;
      window.location.href = smsUrl;

      // Fallback to standard SMS protocol
      setTimeout(() => {
        const fallbackSms = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        window.open(fallbackSms, '_blank');
      }, 1000);
    } catch (error) {
      console.error('Failed to open SMS app:', error);
    }
  }

  // Copy to clipboard with visual notification
  private static copyToClipboardWithNotification(contactName: string, phoneNumber: string, message: string): void {
    try {
      navigator.clipboard.writeText(`To: ${contactName} (${phoneNumber})\n\n${message}`);
      
      // Create visual notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #dc2626; color: white; padding: 15px; border-radius: 8px;
        font-family: Arial; max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: white; color: #dc2626; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">!</div>
          <div>
            <strong>Emergency Message Ready</strong><br>
            <small>Message copied for ${contactName}</small><br>
            <small>Paste in your messaging app</small>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 10000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
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
        this.openWhatsAppWindows(contact.phoneNumber, locationMessage);
      }, index * 1000);
    });
  }

  // Show Windows toast notification
  static showNativeNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }

  // Auto-dial emergency numbers
  static dialEmergencyNumber(number: string, serviceName: string): void {
    try {
      // Try Windows phone dialer
      window.location.href = `tel:${number}`;
      
      // Show confirmation
      this.showNativeNotification(
        `Calling ${serviceName}`,
        `Dialing ${number} for emergency assistance`
      );
    } catch (error) {
      console.error('Failed to dial emergency number:', error);
    }
  }
}