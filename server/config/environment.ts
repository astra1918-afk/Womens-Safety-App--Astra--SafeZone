// Environment Configuration Validation
// Ensures all required API keys are properly configured

interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // Communication Services
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  
  SENDGRID_API_KEY?: string;
  SMTP_EMAIL?: string;
  SMTP_PASSWORD?: string;
  
  // Google Services
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  
  // AI Services
  STANFORD_NLP_API_KEY?: string;
  ASSEMBLY_AI_API_KEY?: string;
  
  // Security
  JWT_SECRET: string;
  SESSION_SECRET: string;
  
  // Application
  NODE_ENV: string;
  PORT: string;
}

export class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig;
  
  private constructor() {
    this.config = this.loadEnvironment();
    this.validateCriticalConfig();
  }
  
  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }
  
  private loadEnvironment(): EnvironmentConfig {
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      SMTP_EMAIL: process.env.SMTP_EMAIL,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      STANFORD_NLP_API_KEY: process.env.STANFORD_NLP_API_KEY,
      ASSEMBLY_AI_API_KEY: process.env.ASSEMBLY_AI_API_KEY,
      JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
      SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-session-secret-for-development',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '5000'
    };
  }
  
  private validateCriticalConfig(): void {
    const errors: string[] = [];
    
    // Critical configuration validation
    if (!this.config.DATABASE_URL || this.config.DATABASE_URL.includes('your_')) {
      errors.push('DATABASE_URL must be configured with a valid PostgreSQL connection string');
    }
    
    if (this.config.NODE_ENV === 'production') {
      if (this.config.JWT_SECRET.includes('fallback')) {
        errors.push('JWT_SECRET must be set for production');
      }
      if (this.config.SESSION_SECRET.includes('fallback')) {
        errors.push('SESSION_SECRET must be set for production');
      }
    }
    
    if (errors.length > 0) {
      console.error('Critical Environment Configuration Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      
      if (this.config.NODE_ENV === 'production') {
        throw new Error('Critical environment variables missing in production');
      }
    }
  }
  
  public getServiceStatus() {
    return {
      twilio: !!(this.config.TWILIO_ACCOUNT_SID && this.config.TWILIO_AUTH_TOKEN && this.config.TWILIO_PHONE_NUMBER),
      whatsapp: !!(this.config.WHATSAPP_ACCESS_TOKEN && this.config.WHATSAPP_PHONE_NUMBER_ID),
      sendgrid: !!this.config.SENDGRID_API_KEY,
      smtp: !!(this.config.SMTP_EMAIL && this.config.SMTP_PASSWORD),
      googlePlaces: !!this.config.GOOGLE_PLACES_API_KEY,
      googleMaps: !!this.config.GOOGLE_MAPS_API_KEY,
      stanfordNLP: !!this.config.STANFORD_NLP_API_KEY,
      assemblyAI: !!this.config.ASSEMBLY_AI_API_KEY
    };
  }
  
  public printConfigurationStatus(): void {
    const status = this.getServiceStatus();
    
    console.log('\n=== Sakhi Suraksha Configuration Status ===');
    console.log('Communication Services:');
    console.log(`  Twilio SMS/Voice: ${status.twilio ? '✅ Configured' : '❌ Missing credentials'}`);
    console.log(`  WhatsApp Business: ${status.whatsapp ? '✅ Configured' : '❌ Missing credentials'}`);
    console.log(`  SendGrid Email: ${status.sendgrid ? '✅ Configured' : '❌ Missing API key'}`);
    console.log(`  SMTP Email: ${status.smtp ? '✅ Configured' : '❌ Missing credentials'}`);
    
    console.log('Location Services:');
    console.log(`  Google Places: ${status.googlePlaces ? '✅ Configured' : '❌ Missing API key'}`);
    console.log(`  Google Maps: ${status.googleMaps ? '✅ Configured' : '❌ Missing API key'}`);
    
    console.log('AI Services:');
    console.log(`  Stanford CoreNLP: ${status.stanfordNLP ? '✅ Configured' : '❌ Missing API key'}`);
    console.log(`  Assembly AI: ${status.assemblyAI ? '✅ Configured' : '❌ Missing API key'}`);
    
    const missingServices = Object.entries(status).filter(([_, configured]) => !configured);
    
    if (missingServices.length > 0) {
      console.log('\n⚠️  Missing Configuration:');
      console.log('Some services are not configured. The application will work with limited functionality.');
      console.log('To enable all features, please configure the missing API keys in your .env file.');
      console.log('See API_KEYS_SETUP.md for detailed instructions.');
    } else {
      console.log('\n🎉 All services configured! Full functionality available.');
    }
    console.log('==========================================\n');
  }
  
  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }
}

export const envValidator = EnvironmentValidator.getInstance();