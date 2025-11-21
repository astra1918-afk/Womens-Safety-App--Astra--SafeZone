// import fetch from 'node-fetch';

// // Twilio SMS Service
// export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
//   try {
//     if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
//       console.error('Twilio credentials not configured');
//       return false;
//     }

//     const accountSid = process.env.TWILIO_ACCOUNT_SID;
//     const authToken = process.env.TWILIO_AUTH_TOKEN;
//     const fromNumber = process.env.TWILIO_PHONE_NUMBER;

//     // Format phone number to international format if needed
//     const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^\d]/g, '')}`;

//     const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
//     const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

//     console.log(`Sending SMS to ${formattedNumber} via Twilio...`);

//     const response = await fetch(twilioUrl, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Basic ${credentials}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       body: new URLSearchParams({
//         From: fromNumber,
//         To: formattedNumber,
//         Body: message
//       })
//     });

//     if (response.ok) {
//       const result = await response.json() as any;
//       console.log(`SMS sent successfully to ${formattedNumber}, SID: ${result.sid}`);
//       return true;
//     } else {
//       const error = await response.text();
//       console.error(`Twilio SMS error for ${formattedNumber}:`, error);
//       return false;
//     }
//   } catch (error) {
//     console.error(`Failed to send SMS to ${phoneNumber}:`, error);
//     return false;
//   }
// }

// // Send SMS OTP
// export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<boolean> {
//   const message = `🔐 Sakhi Suraksha Verification

// Your verification code is: ${otp}

// This code will expire in 10 minutes.
// Do not share this code with anyone.

// Stay safe!`;

//   return await sendSMS(phoneNumber, message);
// }

// // Send SMS Emergency Alert
// export async function sendSMSEmergency(phoneNumber: string, location: string, whatsappNumber?: string): Promise<boolean> {
//   const whatsappInfo = whatsappNumber ? `\n\nContact via WhatsApp: ${whatsappNumber}` : '';
  
//   const message = `🚨 EMERGENCY ALERT 🚨

// This is an automated emergency alert from Sakhi Suraksha safety app.

// Location: ${location}

// Please respond immediately if you can assist.${whatsappInfo}

// Emergency contacts:
// • Police: 100
// • Ambulance: 108  
// • Women Helpline: 1091

// This person needs immediate help!`;

//   return await sendSMS(phoneNumber, message);
// }

// // Send SMS with Live Location Link
// export async function sendSMSLiveLocation(phoneNumber: string, locationUrl: string, streamUrl?: string, whatsappNumber?: string): Promise<boolean> {
//   const whatsappInfo = whatsappNumber ? `\n\nContact via WhatsApp: ${whatsappNumber}` : '';
//   const streamInfo = streamUrl ? `\n\n🔴 Live Stream: ${streamUrl}` : '';
  
//   const message = `🔴 LIVE LOCATION SHARING 🔴

// Someone is sharing their live location with you for safety.

// 📍 Track Location: ${locationUrl}${streamInfo}${whatsappInfo}

// This is an automated safety message from Sakhi Suraksha app.

// If this person is in danger, contact:
// • Police: 100
// • Emergency: 108`;

//   return await sendSMS(phoneNumber, message);
// }


import fetch from 'node-fetch';

// Twilio SMS Service
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured');
      return false;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    // Format phone number to international format if needed
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^\d]/g, '')}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    console.log(`Sending SMS to ${formattedNumber} via Twilio...`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: formattedNumber,
        Body: message
      })
    });

    if (response.ok) {
      const result = await response.json() as any;
      console.log(`SMS sent successfully to ${formattedNumber}, SID: ${result.sid}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`Twilio SMS error for ${formattedNumber}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error);
    return false;
  }
}

// Send SMS OTP
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<boolean> {
  const message = `🔐 Sakhi Suraksha Verification

Your verification code is: ${otp}

This code will expire in 10 minutes.
Do not share this code with anyone.

Stay safe!`;

  return await sendSMS(phoneNumber, message);
}

// Send SMS Emergency Alert
export async function sendSMSEmergency(phoneNumber: string, location: string, whatsappNumber?: string): Promise<boolean> {
  const whatsappInfo = whatsappNumber ? `\n\nContact via WhatsApp: ${whatsappNumber}` : '';
  
  const message = `🚨 EMERGENCY ALERT 🚨

This is an automated emergency alert from Sakhi Suraksha safety app.

Location: ${location}

Please respond immediately if you can assist.${whatsappInfo}

Emergency contacts:
• Police: 100
• Ambulance: 108  
• Women Helpline: 1091

This person needs immediate help!`;

  return await sendSMS(phoneNumber, message);
}

// Send SMS with Live Location Link
export async function sendSMSLiveLocation(phoneNumber: string, locationUrl: string, streamUrl?: string, whatsappNumber?: string): Promise<boolean> {
  const whatsappInfo = whatsappNumber ? `\n\nContact via WhatsApp: ${whatsappNumber}` : '';
  const streamInfo = streamUrl ? `\n\n🔴 Live Stream: ${streamUrl}` : '';
  
  const message = `🔴 LIVE LOCATION SHARING 🔴

Someone is sharing their live location with you for safety.

📍 Track Location: ${locationUrl}${streamInfo}${whatsappInfo}

This is an automated safety message from Sakhi Suraksha app.

If this person is in danger, contact:
• Police: 100
• Emergency: 108`;

  return await sendSMS(phoneNumber, message);
}

//////////////////////////////////////////////
// Twilio WhatsApp Service
//////////////////////////////////////////////

export async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.error('Twilio WhatsApp credentials not configured');
      return false;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^\d]/g, '')}`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    console.log(`Sending WhatsApp message to ${formattedNumber} via Twilio...`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${fromNumber}`,
        To: `whatsapp:${formattedNumber}`,
        Body: message
      })
    });

    if (response.ok) {
      const result = await response.json() as any;
      console.log(`WhatsApp message sent successfully to ${formattedNumber}, SID: ${result.sid}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`Twilio WhatsApp error for ${formattedNumber}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${phoneNumber}:`, error);
    return false;
  }
}

// WhatsApp Emergency Alert
export async function sendWhatsAppEmergency(phoneNumber: string, location: string, smsNumber?: string): Promise<boolean> {
  const smsInfo = smsNumber ? `\n\nContact via SMS: ${smsNumber}` : '';
  
  const message = `🚨 EMERGENCY ALERT 🚨

This is an automated emergency alert from Sakhi Suraksha safety app.

Location: ${location}

Please respond immediately if you can assist.${smsInfo}

Emergency contacts:
• Police: 100
• Ambulance: 108  
• Women Helpline: 1091

This person needs immediate help!`;

  return await sendWhatsApp(phoneNumber, message);
}

// WhatsApp Live Location
export async function sendWhatsAppLiveLocation(phoneNumber: string, locationUrl: string, streamUrl?: string, smsNumber?: string): Promise<boolean> {
  const smsInfo = smsNumber ? `\n\nContact via SMS: ${smsNumber}` : '';
  const streamInfo = streamUrl ? `\n\n🔴 Live Stream: ${streamUrl}` : '';
  
  const message = `🔴 LIVE LOCATION SHARING 🔴

Someone is sharing their live location with you for safety.

📍 Track Location: ${locationUrl}${streamInfo}${smsInfo}

This is an automated safety message from Sakhi Suraksha app.

If this person is in danger, contact:
• Police: 100
• Emergency: 108`;

  return await sendWhatsApp(phoneNumber, message);
}
