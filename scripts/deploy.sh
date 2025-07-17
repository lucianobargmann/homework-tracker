#!/bin/bash

# Homework Tracker Deployment Script with Auto-Rollback
# Usage: ./deploy.sh [IMAGE_TAG]

set -e  # Exit on any error

# Default values
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ROLLBACK_TIMEOUT=60  # seconds to wait for smoke test

# Get image tag from argument or use latest built image
if [ -n "$1" ]; then
    NEW_IMAGE_TAG="$1"
else
    # Find latest built image locally
    NEW_IMAGE_TAG=$(docker images hcktplanet/homework-tracker --format "{{.Tag}}" | grep -E '^[0-9]{8}-[0-9]{6}$' | head -1 || echo "")
    if [ -z "$NEW_IMAGE_TAG" ]; then
        echo "❌ No local image found. Please build first or specify image tag."
        exit 1
    fi
fi

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
║            Homework Tracker Smart Deployment                 ║
║                     with Auto-Rollback                       ║
╚═══════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

print_header

echo -e "${PURPLE}📍 Configuration:${NC}"
echo "   🖼️  New Image: hcktplanet/homework-tracker:$NEW_IMAGE_TAG"
echo "   🌐 Server: $SERVER"
echo "   👤 User: $USER"
echo "   🔑 SSH Key: $IDENTITY_FILE"
echo "   📅 Timestamp: $TIMESTAMP"
echo ""

# Step 1: Get current state for rollback
print_step "Capturing current state for potential rollback..."

CURRENT_IMAGE=$(ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
    "docker ps --filter name=homework-tracker --format '{{.Image}}' | head -1" || echo "")

if [ -n "$CURRENT_IMAGE" ]; then
    print_success "Current image captured: $CURRENT_IMAGE"
    ROLLBACK_IMAGE="$CURRENT_IMAGE"
else
    print_warning "No current container found - fresh deployment"
    ROLLBACK_IMAGE=""
fi

# Step 2: Create database backup
print_step "Creating database backup before deployment..."
./scripts/backup-database.sh "$SERVER" "$IDENTITY_FILE" "$USER"
BACKUP_FILE="homework-db-backup-$TIMESTAMP.tar.gz"
print_success "Database backup completed: $BACKUP_FILE"

# Step 3: Transfer new image to server
print_step "Transferring new image to server..."
IMAGE_SIZE=$(docker image inspect hcktplanet/homework-tracker:$NEW_IMAGE_TAG --format='{{.Size}}' | awk '{printf "%.1f MB", $1/1024/1024}')
echo "📊 Image size: $IMAGE_SIZE"

if command -v pv >/dev/null 2>&1; then
    echo -e "${PURPLE}📍 Using pv for transfer progress${NC}"
    docker save hcktplanet/homework-tracker:$NEW_IMAGE_TAG | pv | ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker load"
else
    docker save hcktplanet/homework-tracker:$NEW_IMAGE_TAG | ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker load"
fi
print_success "Image transferred successfully"

# Step 4: Tag image as latest on remote server
print_step "Tagging image as latest on remote server..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
    "docker tag hcktplanet/homework-tracker:$NEW_IMAGE_TAG hcktplanet/homework-tracker:latest"
print_success "Image tagged as latest"

# Step 5: Deploy new version
print_step "Deploying new version..."

# Stop existing containers
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
    "cd /home/$USER && docker compose -f docker-compose.ec2.yml down" || {
    print_warning "Docker compose down failed, trying manual stop..."
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
        "docker stop homework-tracker && docker rm homework-tracker" || true
}

# Start new containers
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
    "cd /home/$USER && docker compose -f docker-compose.ec2.yml up -d"

if [ $? -eq 0 ]; then
    print_success "New container started"
else
    print_error "Container deployment failed"
    exit 1
fi

# Step 6: Wait for application startup
print_step "Waiting for application to start..."
sleep 20

# Step 7: Smoke test - Try to access login page and test authentication flow
print_step "Running smoke test (login functionality)..."

SMOKE_TEST_PASSED=false

# Test 1: Check if application responds
echo "   🔍 Testing application response..."
for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://homework.metacto.com" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Application responding (HTTP 200)"
        break
    else
        if [ $i -eq 5 ]; then
            print_error "Application not responding after 5 attempts (HTTP $HTTP_CODE)"
            break
        else
            echo "   ⏳ Attempt $i failed (HTTP $HTTP_CODE), retrying..."
            sleep 5
        fi
    fi
done

# Test 2: Check if login page loads
if [ "$HTTP_CODE" = "200" ]; then
    echo "   🔍 Testing login page..."
    LOGIN_TEST=$(curl -s -w "%{http_code}" "https://homework.metacto.com/auth/signin" -o /tmp/login_test.html || echo "000")
    if [[ "$LOGIN_TEST" == *"200" ]] && grep -q "Sign in" /tmp/login_test.html 2>/dev/null; then
        echo "   ✅ Login page loads correctly"
        
        # Test 3: Try to trigger magic link (this should not fail even if email doesn't send)
        echo "   🔍 Testing authentication API..."
        AUTH_TEST=$(curl -s -w "%{http_code}" -X POST \
            "https://homework.metacto.com/api/auth/signin/email" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@example.com","callbackUrl":"https://homework.metacto.com"}' \
            -o /tmp/auth_test.json || echo "000")
        
        if [[ "$AUTH_TEST" == *"200" ]] || [[ "$AUTH_TEST" == *"302" ]]; then
            echo "   ✅ Authentication API responding"
            SMOKE_TEST_PASSED=true
        else
            echo "   ❌ Authentication API failed (HTTP: ${AUTH_TEST#*\}}})"
        fi
    else
        echo "   ❌ Login page not loading correctly (HTTP: ${LOGIN_TEST#*\}}})"
    fi
fi

# Clean up test files
rm -f /tmp/login_test.html /tmp/auth_test.json

# Step 8: Decision point - Success or Rollback
if [ "$SMOKE_TEST_PASSED" = true ]; then
    print_success "🎉 Smoke test passed! Deployment successful!"
    
    echo ""
    echo -e "${PURPLE}📊 Deployment Summary:${NC}"
    echo "   🌐 Application URL: https://homework.metacto.com"
    echo "   🌐 Admin Panel: https://homework.metacto.com/admin"  
    echo "   📅 Deployment Time: $TIMESTAMP"
    echo "   🖼️  New Image: hcktplanet/homework-tracker:$NEW_IMAGE_TAG"
    echo "   💾 Backup File: ./database-backups/$BACKUP_FILE"
    
    # Show running containers
    print_step "Current running containers:"
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
        "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep homework"
    
    echo ""
    print_success "🚀 Deployment completed successfully!"
    
else
    print_error "💥 Smoke test failed! Initiating auto-rollback..."
    
    if [ -n "$ROLLBACK_IMAGE" ]; then
        print_step "Rolling back to previous image: $ROLLBACK_IMAGE"
        
        # Update docker-compose to use previous image
        ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
            "cd /home/$USER && sed -i 's|image: hcktplanet/homework-tracker:.*|image: $ROLLBACK_IMAGE|' docker-compose.ec2.yml"
        
        # Restart with previous image
        ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
            "cd /home/$USER && docker compose -f docker-compose.ec2.yml down && docker compose -f docker-compose.ec2.yml up -d"
        
        # Restore database backup
        print_step "Restoring database from backup..."
        ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
            "cd /home/$USER && docker stop homework-tracker && sleep 5"
        
        # Download and restore the backup we just created
        scp -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" \
            "./database-backups/$BACKUP_FILE" "$USER@$SERVER:/tmp/"
        
        ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
            "cd /tmp && tar -xzf $BACKUP_FILE && docker run --rm -v ec2-user_homework_data:/backup_volume -v /tmp:/host alpine cp /host/database.db /backup_volume/"
        
        # Restart container
        ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" \
            "cd /home/$USER && docker compose -f docker-compose.ec2.yml up -d"
        
        print_success "Rollback completed! System restored to previous state."
        
    else
        print_error "No previous image to rollback to! Manual intervention required."
    fi
    
    print_error "🚨 DEPLOYMENT FAILED - System has been rolled back"
    echo ""
    echo -e "${RED}📋 Manual Investigation Required:${NC}"
    echo "   • Check application logs: ssh -i $IDENTITY_FILE $USER@$SERVER 'docker logs homework-tracker'"
    echo "   • Verify database: ssh -i $IDENTITY_FILE $USER@$SERVER 'docker exec homework-tracker npx prisma db pull --print'"
    echo "   • Test locally with: docker run -p 3001:3000 hcktplanet/homework-tracker:$NEW_IMAGE_TAG"
    
    exit 1
fi