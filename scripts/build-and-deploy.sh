#!/bin/bash

# Build and Deploy Script for Homework Tracker
# This script builds the Docker image and calls the smart deploy script
# Usage: ./build-and-deploy.sh

set -e  # Exit on any error

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="hcktplanet/homework-tracker:${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}
╔═══════════════════════════════════════════════════════════════╗
║                  Build & Deploy Homework Tracker             ║
║                        MetaCTO                                ║
╚═══════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header

echo -e "${PURPLE}📍 Configuration:${NC}"
echo "   🖼️  Image Tag: $IMAGE_TAG"
echo "   🕐 Timestamp: $TIMESTAMP"
echo ""

# Step 1: Load environment variables
print_step "Loading environment variables..."
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    print_success "Environment variables loaded from .env.production"
else
    print_error ".env.production file not found"
    exit 1
fi

# Step 2: Build Docker image
print_step "Building Docker image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully"
else
    print_error "Docker image build failed"
    exit 1
fi

# Tag as latest for convenience
docker tag "$IMAGE_TAG" "hcktplanet/homework-tracker:latest"

# Step 3: Call the smart deploy script
print_step "Initiating smart deployment with auto-rollback..."
./scripts/deploy.sh "$TIMESTAMP"

if [ $? -eq 0 ]; then
    print_success "🎉 Build and deploy completed successfully!"
else
    print_error "💥 Deployment failed!"
    exit 1
fi