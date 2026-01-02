#!/bin/bash
# Database migration script

set -e

echo "🗄️  Running database migrations..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first: npm install -g supabase"
    exit 1
fi

# Run migrations
echo "📤 Pushing migrations to Supabase..."
supabase db push

echo "✅ Migrations applied successfully!"

# Generate TypeScript types
echo "🔧 Generating TypeScript types..."
npm run supabase:generate-types

echo "✅ Types generated successfully!"

echo ""
echo "✨ Migration complete!"
