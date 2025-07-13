#!/bin/bash

# Traefik Production Deployment Script
# Usage: ./scripts/deploy-traefik.sh

set -e

echo "🚀 Starting Traefik deployment for homework.hcktplanet.com..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env not found!"
    echo "Please copy .env.traefik to .env and update the values:"
    echo "cp .env.traefik .env"
    exit 1
fi

# Check if NEXTAUTH_SECRET is set and not default
if grep -q "CHANGE-THIS-TO-A-SECURE-RANDOM-STRING" .env; then
    echo "❌ Please update NEXTAUTH_SECRET in .env with a secure random string!"
    echo "Generate one with: openssl rand -base64 32"
    exit 1
fi

echo "✅ Environment configuration looks good"

# Check if Traefik network exists
if ! docker network ls | grep -q "traefik"; then
    echo "📡 Creating Traefik network..."
    docker network create traefik
else
    echo "✅ Traefik network already exists"
fi

# Build the application
echo "🏗️ Building Docker image..."
docker-compose build

# Deploy with docker-compose
echo "🚀 Deploying with Traefik..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Container is running!"
else
    echo "❌ Container failed to start. Check logs:"
    docker-compose logs
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 5
if curl -f -s https://homework.hcktplanet.com/api/health > /dev/null; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed. The app might still be starting up."
    echo "Check manually: https://homework.hcktplanet.com/api/health"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "🌐 Your application is available at:"
echo "https://homework.hcktplanet.com"
echo ""
echo "🔧 Useful commands:"
echo "docker-compose logs -f          # View logs"
echo "docker-compose restart         # Restart service"
echo "docker-compose down            # Stop service"
echo "docker-compose pull && docker-compose up -d  # Update"
echo ""
echo "📋 Next steps:"
echo "1. Test magic link authentication"
echo "2. Log in as admin: luciano.bargmann@metacto.com"
echo "3. Create job openings and test candidate flow"
echo "4. Set up monitoring/alerts for the domain"
