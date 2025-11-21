#!/bin/bash

# Astra - Quick Start Script
echo "🚀 Starting Astra application..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run ./setup.sh first"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Run ./setup.sh first"
    exit 1
fi

# Check if PostgreSQL is running (if not using memory storage)
USE_MEMORY=$(grep "USE_MEMORY_STORAGE=true" .env)
if [ -z "$USE_MEMORY" ]; then
    if command -v psql &> /dev/null; then
        if ! sudo -u postgres psql -c '\l' &> /dev/null; then
            echo "⚠️  PostgreSQL not running. Starting..."
            sudo systemctl start postgresql
        fi
    fi
fi

# Start the application
echo "🌟 Launching Astra..."
echo "📱 Application will be available at: http://localhost:5000"
echo "👨‍👩‍👧‍👦 Parent Dashboard: http://localhost:5000/parent-dashboard"
echo ""
echo "🎤 Voice AI Features:"
echo "   • Say 'bachao' or 'help me' to test emergency detection"
echo "   • Background voice monitoring enabled"
echo "   • Multi-language support (Hindi/English)"
echo ""
echo "📊 Demo Features Available:"
echo "   ✅ Voice distress detection"
echo "   ✅ Emergency response simulation"
echo "   ✅ Family dashboard monitoring"
echo "   ✅ Live location tracking"
echo "   ✅ Real-time notifications"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start development server
npm run dev