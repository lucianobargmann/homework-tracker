#!/bin/bash
set -e

# Configuration
SERVER_IP="164.163.10.235"
SSH_KEY="~/.ssh/hunt-luke-2025.pem"
IMAGE_NAME="hcktplanet/homework-tracker"

echo "🚀 Building and deploying Homework Tracker..."

# Check if .env.production exists and use it, otherwise fall back to .env
if [ -f .env.production ]; then
  echo "Using .env.production for build"
  ENV_FILE=".env.production"
else
  echo "Warning: .env.production not found, falling back to .env"
  ENV_FILE=".env"
fi

# Load env file into current shell (for any build args if needed)
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' $ENV_FILE | xargs)
  echo "✅ Environment variables loaded from $ENV_FILE"
else
  echo "❌ No environment file found!"
  exit 1
fi

# Timestamped tag
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
TAG="$IMAGE_NAME:$TIMESTAMP"
LATEST_TAG="$IMAGE_NAME:latest"

echo "📦 Building Docker image: $TAG"

# Build the Docker image
docker build \
  --platform linux/amd64 \
  -t $TAG \
  -t $LATEST_TAG \
  .

echo "✅ Docker image built successfully"

# Check if pv is available for progress bar
if command -v pv &> /dev/null; then
  PROGRESS_CMD="pv"
  echo "📊 Using pv for transfer progress"
else
  PROGRESS_CMD="cat"
  echo "⚠️  pv not found, transferring without progress bar"
  echo "   Install with: sudo apt-get install pv (Ubuntu/Debian) or brew install pv (macOS)"
fi

echo "🚢 Transferring image to server..."

# Transfer to server with optional progress
docker save $TAG $LATEST_TAG | $PROGRESS_CMD | bzip2 | ssh -i $SSH_KEY root@$SERVER_IP 'bunzip2 | docker load'

echo "✅ Image built and transferred: $TAG"
echo "📝 Built using $ENV_FILE"
echo ""
echo "🔧 Next steps on server:"
echo "   1. SSH to server: ssh -i $SSH_KEY root@$SERVER_IP"
echo "   2. Navigate to: cd /opt/hcktplanet/homework-tracker"
echo "   3. Update docker-compose.yml to use: $TAG"
echo "   4. Deploy: docker-compose up -d"
echo ""
echo "🌐 Application will be available at: https://homework.hcktplanet.com"
