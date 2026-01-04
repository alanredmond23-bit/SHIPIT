#!/bin/bash

# Supabase Auth Installation Script
# Run this to install dependencies and set up authentication

set -e

echo "🚀 Installing Supabase Auth dependencies..."
echo ""

# Install npm packages
npm install @supabase/ssr @supabase/supabase-js

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Skipping creation."
else
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ .env.local created!"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your Supabase credentials:"
    echo "   1. Go to https://app.supabase.com/project/_/settings/api"
    echo "   2. Copy your Project URL and anon/public key"
    echo "   3. Paste them into .env.local"
fi

echo ""
echo "📚 Next steps:"
echo "   1. Edit .env.local with your Supabase credentials"
echo "   2. Create a Supabase project at https://supabase.com"
echo "   3. Run 'npm run dev' to start the development server"
echo "   4. Visit http://localhost:3000/login"
echo ""
echo "📖 Documentation:"
echo "   - Quick Start: QUICK_START.md"
echo "   - Full Setup: SUPABASE_AUTH_SETUP.md"
echo ""
echo "✨ Installation complete!"
