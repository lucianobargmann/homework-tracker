#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting production deployment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Please copy .env.production to .env.local and update the values:"
    echo "cp .env.production .env.local"
    exit 1
fi

# Check if NEXTAUTH_SECRET is set and not default
if grep -q "CHANGE-THIS-TO-A-SECURE-RANDOM-STRING" .env.local; then
    echo "❌ Please update NEXTAUTH_SECRET in .env.local with a secure random string!"
    echo "Generate one with: openssl rand -base64 32"
    exit 1
fi

# Check if NEXTAUTH_URL is updated
if grep -q "https://your-domain.com" .env.local; then
    echo "❌ Please update NEXTAUTH_URL in .env.local with your actual domain!"
    exit 1
fi

echo "✅ Environment configuration looks good"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run tests
echo "🧪 Running tests..."
npm test -- --passWithNoTests

# Build the application
echo "🏗️ Building application..."
npm run build

# Run database migrations
echo "💾 Setting up database..."
npx prisma db push

echo "✅ Production build complete!"
echo ""
echo "🌐 To start the production server:"
echo "npm start"
echo ""
echo "🐳 To deploy with Docker:"
echo "docker build -t homework-tracker ."
echo "docker run -p 3000:3000 --env-file .env.local homework-tracker"
echo ""
echo "📋 Don't forget to:"
echo "- Test magic link authentication"
echo "- Verify admin access"
echo "- Test candidate workflow"
echo "- Check email delivery"
