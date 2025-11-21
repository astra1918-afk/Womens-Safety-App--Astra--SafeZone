# Local Development Setup - Sakhi Suraksha

## Quick Start Commands

```bash
# 1. Clone and install
git clone <repository-url>
cd astra
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env file with your API keys

# 3. Database setup
npm run db:setup

# 4. Start development
npm run dev
```

## Detailed Setup Instructions

### 1. Prerequisites Installation

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node --version  # Should be 18+
npm --version   # Should be 8+

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Project Setup

```bash
# Navigate to project directory
cd astra

# Install all dependencies
npm install

# Install global TypeScript tools
npm install -g typescript tsx
```

### 3. Environment Configuration

Create `.env` file in root directory:

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/astra

# AI Service API Keys
ASSEMBLY_AI_API_KEY=your_assembly_ai_api_key_here
STANFORD_NLP_API_KEY=your_stanford_nlp_key_here

# Communication Services
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Security Keys
JWT_SECRET=your_32_character_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# Google Services
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Email Configuration (Optional)
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# Development Settings
NODE_ENV=development
PORT=5000
```

### 4. Database Setup

```bash
# Create PostgreSQL database
sudo -u postgres createdb astra

# Set password for postgres user (if needed)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"

# Run database migrations
npm run db:migrate

# Seed with demo data (optional)
npm run db:seed
```

### 5. API Keys Setup

#### Assembly AI (Speech-to-Text)
1. Visit: https://www.assemblyai.com/
2. Sign up for free account
3. Get API key from dashboard
4. Add to `.env` as `ASSEMBLY_AI_API_KEY`

#### Twilio (SMS & Voice)
1. Visit: https://www.twilio.com/
2. Create account and verify phone number
3. Get Account SID, Auth Token, and phone number
4. Add to `.env` as shown above

#### WhatsApp Business API
1. Visit: https://developers.facebook.com/docs/whatsapp
2. Create Meta for Developers account
3. Set up WhatsApp Business API
4. Get access token and phone number ID

#### Google Places API
1. Visit: https://console.cloud.google.com/
2. Enable Places API
3. Create credentials
4. Add to `.env` as `GOOGLE_PLACES_API_KEY`

### 6. Development Server

```bash
# Start development server
npm run dev

# Server will start on:
# Backend: http://localhost:5000
# Frontend: http://localhost:5000 (same port)
```

### 7. Available Commands

```bash
# Development
npm run dev                 # Start development server
npm run dev:debug          # Start with debug logging
npm run dev:mobile         # Start with mobile viewport

# Database Operations
npm run db:migrate         # Run database migrations
npm run db:seed            # Add demo data
npm run db:reset           # Reset database completely
npm run db:studio          # Open database GUI

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:ai            # AI voice recognition tests
npm run test:emergency     # Emergency response tests

# Code Quality
npm run lint               # ESLint code checking
npm run lint:fix           # Auto-fix lint issues
npm run type-check         # TypeScript type checking
npm run format             # Prettier code formatting

# Production
npm run build              # Build for production
npm run start              # Start production server
npm run preview            # Preview production build
```

### 8. Testing the Application

#### Voice AI Testing
```bash
# Test Hindi voice recognition
npm run test:voice:hindi

# Test English voice recognition  
npm run test:voice:english

# Test false positive prevention
npm run test:voice:falsepos
```

#### Emergency Response Testing
```bash
# Navigate to http://localhost:5000
# Click "Start Voice Monitoring"
# Say "bachao" or "help me" to trigger emergency
# Check parent dashboard for alerts
```

#### Mobile Testing
```bash
# Use browser dev tools mobile simulation
# Or access from mobile device:
http://your-local-ip:5000
```

### 9. Troubleshooting

#### Common Issues

**Port 5000 already in use:**
```bash
# Kill process using port 5000
sudo lsof -ti:5000 | xargs kill -9

# Or change port in package.json
```

**Database connection failed:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database exists
sudo -u postgres psql -l
```

**API keys not working:**
```bash
# Verify .env file exists and has correct keys
cat .env

# Check environment variables are loaded
npm run dev:debug
```

**Voice recognition not working:**
```bash
# Check microphone permissions in browser
# Enable HTTPS for production (required for microphone)
# Test with simple audio input first
```

#### Performance Issues

**Slow startup:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Memory issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### 10. Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Make changes to code
# Files automatically reload on save

# 3. Run tests before committing
npm test

# 4. Check code quality
npm run lint
npm run type-check

# 5. Commit changes
git add .
git commit -m "Your commit message"

# 6. Push to repository
git push origin your-branch
```

### 11. Production Deployment

```bash
# Build optimized version
npm run build

# Start production server
npm run start

# Or deploy to cloud platform
npm run deploy
```

## Quick Reference

### Essential URLs
- **Application**: http://localhost:5000
- **Parent Dashboard**: http://localhost:5000/parent-dashboard  
- **API Documentation**: http://localhost:5000/api-docs
- **Database Studio**: http://localhost:5000/db-studio

### Demo Credentials
- **User ID**: demo-user
- **Emergency Contacts**: Pre-configured for testing
- **Test Voice Commands**: "bachao", "help me", "emergency"

### Support
- Check logs in terminal for error messages
- View browser console for frontend issues
- Database logs available in PostgreSQL logs
- API responses logged in server console

## Ready to Start!

After completing setup, your astra application will be running locally with:
- ✅ AI voice recognition (Hindi/English)
- ✅ Emergency response system
- ✅ Family dashboard monitoring
- ✅ Real-time location tracking
- ✅ Multi-channel notifications
- ✅ Live video streaming
- ✅ Secure data encryption