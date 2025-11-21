import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

// Initialize SMTP for email delivery using environment variables
const emailTransporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL!,
    pass: process.env.SMTP_PASSWORD!
  }
});

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send WhatsApp message via WhatsApp Business API
export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp OTP to ${phoneNumber}`);
    
    // Check if WhatsApp credentials are configured
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log('WhatsApp credentials not configured, falling back to email notification');
      return false;
    }
    
    // Format phone number for WhatsApp (remove + and ensure country code)
    const formattedNumber = phoneNumber.replace(/\+/g, '');
    
    const message = `🔐 ASTRA Verification

Your verification code is: *${otp}*

This code will expire in 10 minutes.
Do not share this code with anyone.

Stay safe! 🛡️`;

    return await sendWhatsAppMessage(formattedNumber, message);
  } catch (error) {
    console.error('Failed to send WhatsApp OTP:', error);
    return false;
  }
}

// Send WhatsApp emergency message
export async function sendWhatsAppEmergency(phoneNumber: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp emergency alert to ${phoneNumber}`);
    
    // Format phone number for WhatsApp (remove + and ensure country code)
    const formattedNumber = phoneNumber.replace(/\+/g, '');
    
    const emergencyMessage = `🚨 *EMERGENCY ALERT* 🚨

${message}

This is an automated emergency alert from ASTRA safety app.
Please respond immediately if you can assist.

🔗 Emergency resources:
• Police: 100
• Ambulance: 108
• Women Helpline: 1091`;

    return await sendWhatsAppMessage(formattedNumber, emergencyMessage);
  } catch (error) {
    console.error('Failed to send WhatsApp emergency message:', error);
    return false;
  }
}

// Core WhatsApp message sending function with delivery monitoring
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    // Format phone number for WhatsApp (remove + and ensure country code)
    const formattedNumber = phoneNumber.replace(/\+/g, '');
    
    const whatsappApiUrl = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (response.ok) {
      const result = await response.json() as any;
      const messageId = result.messages?.[0]?.id;
      console.log(`WhatsApp API accepted message to ${phoneNumber}, Message ID: ${messageId}`);
      
      // Note: Actual delivery depends on WhatsApp Business account verification
      // Check webhook for delivery confirmation
      return true;
    } else {
      const error = await response.text();
      console.error(`WhatsApp API error:`, error);
      
      // Parse error to check for specific issues
      try {
        const errorData = JSON.parse(error);
        if (errorData.error?.code === 131030) {
          console.log(`Phone number ${phoneNumber} not in WhatsApp Business recipient list`);
        } else if (errorData.error?.code === 131047) {
          console.log(`24-hour conversation window expired for ${phoneNumber}`);
        }
      } catch (e) {
        // Error parsing not critical
      }
      
      return false;
    }
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

// Send Email via SMTP2GO (backup for emergency alerts)
export async function sendEmailAlert(email: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending email alert to ${email}`);
    
    await emailTransporter.sendMail({
      from: 'noreply@sakhi-suraksha.app',
      to: email,
      subject: '🚨 ASTRA- Emergency Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E91E63;">🚨ASTRA - Emergency Alert</h2>
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #E91E63;">
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${message}</pre>
          </div>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #E91E63;">Emergency Resources:</h4>
            <p style="margin: 5px 0;"><strong>Police:</strong> 100</p>
            <p style="margin: 5px 0;"><strong>Ambulance:</strong> 108</p>
            <p style="margin: 5px 0;"><strong>Women Helpline:</strong> 1091</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from ASTRA safety app.</p>
        </div>
      `,
      text: message
    });

    console.log(`Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send OTP via Email (backup for verification)
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    console.log(`Sending email OTP to ${email}`);
    
    await emailTransporter.sendMail({
      from: 'noreply@sakhi-suraksha.app',
      to: email,
      subject: 'ASTRA - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E91E63;">🔐 ASTRA- Verification Code</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 15px 0;">Your verification code is:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #E91E63; letter-spacing: 5px; margin: 20px 0;">${otp}</div>
            <p style="color: #666; margin: 15px 0 0 0;">This code will expire in 10 minutes.</p>
            <p style="color: #666; margin: 5px 0 0 0;">Do not share this code with anyone.</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from ASTRA safety app.</p>
        </div>
      `,
      text: `Your ASTRA verification code is: ${otp}. This code will expire in 10 minutes.`
    });

    console.log(`Email OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email OTP:', error);
    return false;
  }
}


