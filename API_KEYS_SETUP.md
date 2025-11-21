# API Keys Setup Guide - 

This guide helps you obtain and configure all the necessary API keys for the astra application.

## Required API Keys

### 1. Twilio (SMS & Voice Services)
**Get your keys from:** https://console.twilio.com

1. Sign up for a Twilio account
2. Go to Console Dashboard
3. Find your Account SID and Auth Token
4. Purchase a phone number from Twilio Console
5. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   
   ```

### 2. WhatsApp Business API
**Get your keys from:** https://developers.facebook.com/docs/whatsapp

1. Create a Meta Business account
2. Set up WhatsApp Business API
3. Get your Access Token and Phone Number ID
4. Add to `.env`:
   ```
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

### 3. SendGrid (Email Services)
**Get your key from:** https://app.sendgrid.com

1. Sign up for SendGrid account
2. Go to Settings > API Keys
3. Create a new API key with "Full Access"
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 4. Google Services
**Get your keys from:** https://console.cloud.google.com

1. Create a Google Cloud Project
2. Enable Google Places API and Google Maps API
3. Create credentials (API Key)
4. Add to `.env`:
   ```
   GOOGLE_PLACES_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
   GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### 5. AI Services (Optional for Advanced Features)

#### Stanford CoreNLP
```
STANFORD_NLP_API_KEY=your_stanford_api_key
```

#### Assembly AI
**Get your key from:** https://www.assemblyai.com
```
ASSEMBLY_AI_API_KEY=your_assembly_ai_key
```

### 6. SMTP Email (Alternative to SendGrid)
If you prefer using your own SMTP server:
```
SMTP_EMAIL=your_email@domain.com
SMTP_PASSWORD=your_email_password
```

## Testing Your Configuration

After adding all keys to your `.env` file, test the services:

```bash
# Test SMS service
curl -X POST http://localhost:5000/api/test/sms

# Test WhatsApp service  
curl -X POST http://localhost:5000/api/test/whatsapp

# Test email service
curl -X POST http://localhost:5000/api/test/email
```

## Security Notes

1. Never commit your `.env` file to version control
2. Keep your API keys secure and private
3. Rotate keys periodically for security
4. Use environment-specific keys (development vs production)
5. Monitor usage and billing for all services

## Troubleshooting

**Twilio not working?**
- Verify your account SID and auth token
- Check that your phone number is verified
- Ensure sufficient account balance

**WhatsApp not working?**
- Verify your Business account is approved
- Check phone number ID is correct
- Ensure recipient numbers are in your test list

**Google APIs not working?**
- Enable the required APIs in Google Cloud Console
- Check API key restrictions and permissions
- Verify billing is enabled for your project

**Email not working?**
- Check SMTP credentials are correct
- Verify sender email is verified
- Check spam/junk folders for test emails

## Free Tier Limits

- **Twilio**: $15.50 trial credit
- **WhatsApp**: Limited to verified numbers during testing
- **SendGrid**: 100 emails/day free
- **Google APIs**: $200 monthly credit for new accounts
- **Assembly AI**: 5 hours free transcription monthly

## Need Help?

If you encounter issues:
1. Check the application logs for error messages
2. Verify all environment variables are set correctly
3. Test each service individually
4. Consult the official documentation for each service