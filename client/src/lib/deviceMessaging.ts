// Device native messaging functionality
export interface DeviceMessage {
  phoneNumber: string;
  message: string;
  type: 'sms' | 'whatsapp';
}

// Send SMS through device's default SMS app
export function sendDeviceSMS(phoneNumber: string, message: string): boolean {
  try {
    // For mobile web browsers
    if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_self');
      return true;
    }
    
    // For macOS - open Messages app directly
    if (navigator.userAgent.match(/Mac OS X/i)) {
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');
      
      // Also try imessage URL scheme
      setTimeout(() => {
        const imessageUrl = `imessage:${phoneNumber}?body=${encodeURIComponent(message)}`;
        window.open(imessageUrl, '_blank');
      }, 500);
      return true;
    }
    
    // For desktop - copy to clipboard and show instructions
    navigator.clipboard.writeText(message);
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #dc2626; color: white; padding: 15px; border-radius: 8px;
      font-family: Arial; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = `
      <strong>Emergency SMS Ready</strong><br>
      Message copied to clipboard<br>
      <small>Send to: ${phoneNumber}</small><br>
      <button onclick="this.parentElement.remove()" style="margin-top: 8px; background: white; color: #dc2626; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Close</button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 8000);
    return true;
  } catch (error) {
    console.error('Failed to send device SMS:', error);
    return false;
  }
}

// Send WhatsApp message through installed WhatsApp app
export function sendDeviceWhatsApp(phoneNumber: string, message: string): boolean {
  try {
    // Format phone number for WhatsApp (remove spaces and special characters)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Try WhatsApp desktop app first (for macOS)
    const whatsappDesktopUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappDesktopUrl;
    
    // Fallback to WhatsApp Web after a short delay
    setTimeout(() => {
      const whatsappWebUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappWebUrl, '_blank');
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

// Send emergency alert via device's native apps
export function sendEmergencyAlert(
  phoneNumber: string, 
  location: { lat: number; lng: number; address: string },
  userWhatsApp?: string
): void {
  const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const whatsappInfo = userWhatsApp ? `\n\nContact via WhatsApp: ${userWhatsApp}` : '';
  
  const emergencyMessage = `🚨 EMERGENCY ALERT 🚨

I need immediate help!

📍 My Location: ${location.address}
🗺️ Live Location: ${locationUrl}${whatsappInfo}

Emergency Resources:
• Police: 100
• Ambulance: 108
• Women Helpline: 1091

This is an automated emergency alert from Sakhi Suraksha safety app.`;

  const smsMessage = `🚨 EMERGENCY! I need help immediately!

Location: ${location.address}
Maps: ${locationUrl}${whatsappInfo}

Emergency: 100 | Ambulance: 108`;

  // Try WhatsApp first (more reliable for multimedia)
  const whatsappSent = sendDeviceWhatsApp(phoneNumber, emergencyMessage);
  
  // Also send SMS as backup
  setTimeout(() => {
    sendDeviceSMS(phoneNumber, smsMessage);
  }, 1000);
}

// Send live location link via device messaging
export function sendLiveLocationAlert(
  phoneNumber: string,
  streamUrl: string,
  location: { lat: number; lng: number; address: string },
  userWhatsApp?: string
): void {
  const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const whatsappInfo = userWhatsApp ? `\n\nContact via WhatsApp: ${userWhatsApp}` : '';
  
  const locationMessage = `🔴 LIVE LOCATION SHARING 🔴

I'm sharing my live location for safety.

📍 Current Location: ${location.address}
🗺️ Live Location: ${locationUrl}
🎥 Live Stream: ${streamUrl}${whatsappInfo}

This is a safety precaution. Contact me if you're concerned.

Emergency contacts: 100 (Police) | 108 (Ambulance)`;

  const smsMessage = `🔴 LIVE LOCATION SHARED

Location: ${location.address}
Live: ${locationUrl}
Stream: ${streamUrl}${whatsappInfo}

Safety sharing - contact if concerned.`;

  // Send via WhatsApp for rich content
  sendDeviceWhatsApp(phoneNumber, locationMessage);
  
  // Also send SMS
  setTimeout(() => {
    sendDeviceSMS(phoneNumber, smsMessage);
  }, 1000);
}

// Batch send to multiple contacts
export function sendToMultipleContacts(
  contacts: Array<{ name: string; phoneNumber: string; email?: string }>,
  message: string,
  type: 'emergency' | 'location' = 'emergency'
): void {
  contacts.forEach((contact, index) => {
    setTimeout(() => {
      if (type === 'emergency') {
        sendDeviceWhatsApp(contact.phoneNumber, message);
        setTimeout(() => sendDeviceSMS(contact.phoneNumber, message), 500);
      } else {
        sendDeviceWhatsApp(contact.phoneNumber, message);
      }
    }, index * 2000); // Stagger sends to avoid rate limiting
  });
}

// Check if device supports native messaging
export function checkDeviceMessagingSupport(): {
  sms: boolean;
  whatsapp: boolean;
  clipboard: boolean;
} {
  return {
    sms: navigator.userAgent.match(/Android|iPhone|iPad|iPod/i) !== null,
    whatsapp: true, // WhatsApp web works on all devices
    clipboard: !!navigator.clipboard
  };
}