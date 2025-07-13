#!/bin/bash
set -e

# Server startup script for Homework Tracker
# Run this on the server to start the application with docker-compose

echo "🚀 Starting Homework Tracker on server..."

# Configuration
PROJECT_DIR="/opt/hcktplanet/homework-tracker"
IMAGE_NAME="hcktplanet/homework-tracker"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ docker-compose.yml not found!"
  echo "Please run this script from the project directory: $PROJECT_DIR"
  exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  echo "Please create .env file with your environment variables"
  echo "You can copy from .env.traefik template"
  exit 1
fi

# Check if Traefik network exists, create if not
if ! docker network ls | grep -q "traefik"; then
  echo "📡 Creating Traefik network..."
  docker network create traefik
else
  echo "✅ Traefik network already exists"
fi

# Check if homework-tracker image exists
if ! docker images | grep -q "$IMAGE_NAME"; then
  echo "❌ No homework-tracker image found!"
  echo "Please transfer the Docker image first using: npm run deploy:remote"
  exit 1
fi

echo "📦 Using latest homework-tracker image"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Pull any updated images and start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
  echo "✅ Services are running!"
  
  # Test health endpoint
  echo "🏥 Testing health endpoint..."
  sleep 5
  
  if curl -f -s https://homework.hcktplanet.com/api/health > /dev/null; then
    echo "✅ Health check passed!"
  else
    echo "⚠️  Health check failed. Service might still be starting up."
    echo "Check manually: https://homework.hcktplanet.com/api/health"
  fi
  
  echo ""
  echo "🎉 Deployment complete!"
  echo "🌐 Application available at: https://homework.hcktplanet.com"
  
else
  echo "❌ Services failed to start!"
  echo "Check logs with: docker-compose logs"
  exit 1
fi

echo ""
echo "🔧 Useful commands:"
echo "   docker-compose logs -f          # View logs"
echo "   docker-compose restart         # Restart services"
echo "   docker-compose down            # Stop services"
echo "   docker system prune            # Clean up old images"
