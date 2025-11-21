# Quick Start - Sakhi Suraksha

## One-Command Setup

```bash
# Make setup script executable and run
chmod +x setup.sh && ./setup.sh
```

## Start Application

```bash
# Start the development server
./start.sh
```

**Application URLs:**
- Main App: http://localhost:5000
- Parent Dashboard: http://localhost:5000/parent-dashboard

## Test Voice AI

1. Navigate to main dashboard
2. Click "Start Voice Monitoring" 
3. Say "bachao" or "help me"
4. Check parent dashboard for emergency alerts

## Available Demo Features

- ✅ AI voice distress detection (Hindi/English)
- ✅ Emergency response coordination
- ✅ Family safety dashboard
- ✅ Real-time location tracking
- ✅ Multi-channel notifications
- ✅ Live video streaming
- ✅ Safe zone monitoring

## Troubleshooting

**PostgreSQL Issues:**
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Or use memory storage
sed -i 's/USE_MEMORY_STORAGE=false/USE_MEMORY_STORAGE=true/' .env
```

**Port Issues:**
```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs kill -9
```

**Dependencies:**
```bash
# Reinstall if needed
rm -rf node_modules package-lock.json
npm install
```

## Manual Setup Alternative

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Database setup (if using PostgreSQL)
npm run db:setup

# Start development
npm run dev
```

The application is now ready to run locally with all AI voice recognition, emergency response, and family monitoring features fully functional.