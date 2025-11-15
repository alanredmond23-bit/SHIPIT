#!/bin/bash
# Setup script for Joanna AI Assistant

set -e

echo "🚀 Setting up Joanna AI Assistant..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "✅ Supabase CLI version: $(supabase --version)"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please update .env.local with your actual API keys"
else
    echo "✅ .env.local already exists"
fi

# Link to Supabase project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref fifybuzwfaegloijrmqb || echo "⚠️  Supabase link failed. You may need to login first: supabase login"

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Run 'npm run dev' to start development server"
echo "3. Run 'npm run supabase:migrate' to apply database migrations"
echo ""
