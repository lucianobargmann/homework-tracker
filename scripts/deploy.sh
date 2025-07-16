#\!/bin/bash

# Homework Tracker Deployment Script
# Usage: ./deploy.sh [options]

set -e  # Exit on any error

# Default values
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"
CREATE_BACKUP=true
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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
║                  Homework Tracker Deployment                 ║
║                        MetaCTO                                ║
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

show_help() {
    echo "Homework Tracker Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -s, --server      Server hostname (default: $SERVER)"
    echo "  -i, --identity    SSH identity file (default: $IDENTITY_FILE)"
    echo "  -u, --user        SSH user (default: $USER)"
    echo "  -b, --backup      Create backup before deployment (default: true)"
    echo "  --no-backup       Skip backup creation"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy with defaults"
    echo "  $0 --no-backup                       # Deploy without backup"
    echo "  $0 -s my-server.com -u ubuntu        # Deploy to different server"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--server)
            SERVER="$2"
            shift 2
            ;;
        -i|--identity)
            IDENTITY_FILE="$2"
            shift 2
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        -b|--backup)
            CREATE_BACKUP=true
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

print_header

echo -e "${PURPLE}📍 Configuration:${NC}"
echo "   Server: $SERVER"
echo "   User: $USER"
echo "   SSH Key: $IDENTITY_FILE"
echo "   Backup: $CREATE_BACKUP"
echo "   Timestamp: $TIMESTAMP"
echo ""

# Create backup if requested
if [ "$CREATE_BACKUP" = true ]; then
    print_step "Creating database backup..."
    if [ -f "./scripts/backup-database.sh" ]; then
        ./scripts/backup-database.sh "$SERVER" "$IDENTITY_FILE" "$USER"
        print_success "Database backup completed"
    else
        print_warning "Backup script not found, skipping backup"
    fi
fi

# Build and deploy
print_step "Building and deploying application..."
if [ -f "./scripts/build-and-deploy.sh" ]; then
    ./scripts/build-and-deploy.sh -s "$SERVER" -i "$IDENTITY_FILE" -u "$USER"
    BUILD_EXIT_CODE=$?
    
    if [ $BUILD_EXIT_CODE -eq 0 ]; then
        print_success "Build and deploy completed successfully"
    else
        print_error "Build and deploy failed with exit code $BUILD_EXIT_CODE"
        exit $BUILD_EXIT_CODE
    fi
else
    print_error "Build and deploy script not found at ./scripts/build-and-deploy.sh"
    exit 1
fi

# Get the latest image tag
print_step "Updating docker-compose configuration..."
LATEST_IMAGE=$(ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker images hcktplanet/homework-tracker --format '{{.Tag}}' | grep -E '^[0-9]{8}-[0-9]{6}$' | head -1" || echo "latest")

if [ "$LATEST_IMAGE" \!= "latest" ] && [ -n "$LATEST_IMAGE" ]; then
    print_step "Using image tag: $LATEST_IMAGE"
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "cd /home/$USER && sed -i 's/image: hcktplanet\/homework-tracker:.*/image: hcktplanet\/homework-tracker:$LATEST_IMAGE/' docker-compose.ec2.yml"
fi

# Deploy with docker-compose
print_step "Deploying with docker-compose..."

# Stop existing containers
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "cd /home/$USER && docker compose -f docker-compose.ec2.yml down" || {
    print_warning "Docker compose down failed, trying manual stop..."
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker stop homework-tracker && docker rm homework-tracker" || true
}

# Start new containers
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "cd /home/$USER && docker compose -f docker-compose.ec2.yml up -d"

if [ $? -eq 0 ]; then
    print_success "Container deployed successfully"
else
    print_error "Container deployment failed"
    exit 1
fi

# Wait for application to start
print_step "Waiting for application to start..."
sleep 15

# Health check
print_step "Running health check..."
for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://homework.metacto.com" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Application is responding (HTTP 200)"
        break
    else
        if [ $i -eq 5 ]; then
            print_error "Application health check failed after 5 attempts (HTTP $HTTP_CODE)"
            
            # Show container logs for debugging
            print_step "Showing container logs for debugging..."
            ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail 20"
            exit 1
        else
            print_warning "Health check attempt $i failed (HTTP $HTTP_CODE), retrying in 10 seconds..."
            sleep 10
        fi
    fi
done

# Show deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment Completed Successfully\!${NC}"
echo ""
echo -e "${PURPLE}📊 Deployment Summary:${NC}"
echo "   🌐 Application URL: https://homework.metacto.com"
echo "   🌐 Admin Panel: https://homework.metacto.com/admin"
echo "   📅 Deployment Time: $TIMESTAMP"
echo "   🖼️  Image Tag: $LATEST_IMAGE"
echo "   💾 Backup Created: $CREATE_BACKUP"
echo ""

# Show running containers
print_step "Current running containers:"
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"

echo ""
print_success "Deployment process complete\!"
