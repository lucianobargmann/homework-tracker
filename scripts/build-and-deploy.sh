#!/bin/bash

# Comprehensive Build and Deploy Script for Homework Tracker
# This script handles: build, transfer, backup, deploy, and migrate
# Usage: ./build-and-deploy.sh [options]

set -e  # Exit on any error

# Default values
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"
CREATE_BACKUP=true
RUN_MIGRATIONS=true
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="hcktplanet/homework-tracker:${TIMESTAMP}"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_INTERVAL=10

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}📍 $1${NC}"
}

show_help() {
    echo "Comprehensive Build and Deploy Script for Homework Tracker"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -s, --server        Server hostname (default: $SERVER)"
    echo "  -i, --identity      SSH identity file (default: $IDENTITY_FILE)"
    echo "  -u, --user          SSH user (default: $USER)"
    echo "  -t, --tag           Custom image tag (default: timestamp)"
    echo "  -b, --backup        Create backup before deployment (default: true)"
    echo "  --no-backup         Skip backup creation"
    echo "  -m, --migrate       Run database migrations (default: true)"
    echo "  --no-migrate        Skip database migrations"
    echo "  --retries NUM       Health check retries (default: $HEALTH_CHECK_RETRIES)"
    echo "  --interval SEC      Health check interval (default: $HEALTH_CHECK_INTERVAL)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Full deploy with defaults"
    echo "  $0 --no-backup --no-migrate          # Quick deploy without backup/migration"
    echo "  $0 -t v1.2.3                         # Deploy with custom tag"
    echo "  $0 --retries 10 --interval 5         # Custom health check settings"
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
        -t|--tag)
            IMAGE_TAG="hcktplanet/homework-tracker:$2"
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
        -m|--migrate)
            RUN_MIGRATIONS=true
            shift
            ;;
        --no-migrate)
            RUN_MIGRATIONS=false
            shift
            ;;
        --retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --interval)
            HEALTH_CHECK_INTERVAL="$2"
            shift 2
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

# Validate requirements
if [ ! -f "$IDENTITY_FILE" ]; then
    print_error "SSH identity file not found: $IDENTITY_FILE"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

print_header

print_info "Configuration:"
echo "   🖥️  Server: $SERVER"
echo "   👤 User: $USER"
echo "   🔑 SSH Key: $IDENTITY_FILE"
echo "   🏷️  Image Tag: $IMAGE_TAG"
echo "   💾 Backup: $CREATE_BACKUP"
echo "   🔄 Migrations: $RUN_MIGRATIONS"
echo "   🕐 Timestamp: $TIMESTAMP"
echo ""

# Step 1: Create backup if requested
if [ "$CREATE_BACKUP" = true ]; then
    print_step "Creating database backup..."
    if [ -f "./scripts/backup-database.sh" ]; then
        if ./scripts/backup-database.sh "$SERVER" "$IDENTITY_FILE" "$USER"; then
            print_success "Database backup completed"
        else
            print_error "Database backup failed"
            exit 1
        fi
    else
        print_warning "Backup script not found at ./scripts/backup-database.sh"
        read -p "Continue without backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Step 2: Load environment variables
print_step "Loading environment variables..."
if [ -f ".env.production" ]; then
    set -a
    source .env.production
    set +a
    print_success "Environment variables loaded from .env.production"
else
    print_error ".env.production file not found"
    exit 1
fi

# Step 3: Build Docker image
print_step "Building Docker image: $IMAGE_TAG"
if docker build -t "$IMAGE_TAG" -t "hcktplanet/homework-tracker:latest" .; then
    print_success "Docker image built successfully"
else
    print_error "Docker build failed"
    exit 1
fi

# Step 4: Transfer image to server
print_step "Transferring image to server..."
IMAGE_SIZE=$(docker image inspect "$IMAGE_TAG" --format='{{.Size}}' | awk '{printf "%.1f MB", $1/1024/1024}')
echo "📊 Image size: $IMAGE_SIZE"

# Use pv for progress if available, otherwise use regular docker save
if command -v pv > /dev/null 2>&1; then
    print_info "Using pv for transfer progress"
    if docker save "$IMAGE_TAG" | pv | ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker load"; then
        print_success "Image transferred successfully with progress"
    else
        print_error "Image transfer failed"
        exit 1
    fi
else
    print_info "Transferring image (no progress indicator available)"
    if docker save "$IMAGE_TAG" | ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker load"; then
        print_success "Image transferred successfully"
    else
        print_error "Image transfer failed"
        exit 1
    fi
fi

# Step 5: Update environment variables on server
print_step "Updating environment variables on server..."
if scp -i "$IDENTITY_FILE" .env.production "$USER@$SERVER:/home/$USER/.env"; then
    print_success "Environment variables updated on server"
else
    print_warning "Failed to update environment variables"
fi

# Step 6: Update docker-compose configuration
print_step "Updating docker-compose configuration..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "
    sed -i 's|image: hcktplanet/homework-tracker:.*|image: $IMAGE_TAG|' docker-compose.ec2.yml
"
print_success "Docker-compose configuration updated"

# Step 7: Run migrations if requested
if [ "$RUN_MIGRATIONS" = true ]; then
    print_step "Running database migrations..."
    if [ -f "./scripts/migrate.sh" ]; then
        if ./scripts/migrate.sh -s "$SERVER" -i "$IDENTITY_FILE" -u "$USER"; then
            print_success "Database migrations completed"
        else
            print_warning "Database migrations failed, continuing with deployment"
        fi
    else
        print_warning "Migration script not found at ./scripts/migrate.sh"
    fi
fi

# Step 8: Stop existing containers gracefully
print_step "Stopping existing containers..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "
    cd /home/$USER
    
    # Try docker-compose down first
    if docker compose -f docker-compose.ec2.yml down 2>/dev/null; then
        echo 'Docker compose down successful'
    else
        echo 'Docker compose down failed, trying manual stop...'
        docker stop homework-tracker 2>/dev/null || true
        docker rm homework-tracker 2>/dev/null || true
    fi
"
print_success "Existing containers stopped"

# Step 9: Start new containers
print_step "Starting new containers..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "
    cd /home/$USER
    docker compose -f docker-compose.ec2.yml up -d
"

if [ $? -eq 0 ]; then
    print_success "Containers started successfully"
else
    print_error "Container startup failed"
    
    # Show logs for debugging
    print_step "Showing container logs for debugging..."
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail 20"
    exit 1
fi

# Step 10: Wait for application to start
print_step "Waiting for application to start..."
sleep 15

# Step 11: Health check with retries
print_step "Running health check..."
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://homework.metacto.com" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Application is responding (HTTP 200)"
        HEALTH_CHECK_PASSED=true
        break
    else
        if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
            print_error "Application health check failed after $HEALTH_CHECK_RETRIES attempts (HTTP $HTTP_CODE)"
            
            # Show container logs for debugging
            print_step "Showing container logs for debugging..."
            ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail 30"
            
            # Show container status
            print_step "Container status:"
            ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker ps -a | grep homework-tracker"
            
            exit 1
        else
            print_warning "Health check attempt $i failed (HTTP $HTTP_CODE), retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    fi
done

# Step 12: Cleanup old images on server (keep last 5)
print_step "Cleaning up old images on server..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "
    # Keep the latest 5 images, remove older ones
    docker images hcktplanet/homework-tracker --format '{{.Tag}}' | grep -E '^[0-9]{8}-[0-9]{6}$' | tail -n +6 | xargs -r -I {} docker rmi hcktplanet/homework-tracker:{} 2>/dev/null || true
"
print_success "Old images cleaned up"

# Step 13: Show deployment summary
echo ""
print_success "🎉 Deployment Completed Successfully!"
echo ""
print_info "📊 Deployment Summary:"
echo "   🌐 Application URL: https://homework.metacto.com"
echo "   🌐 Admin Panel: https://homework.metacto.com/admin"
echo "   📅 Deployment Time: $TIMESTAMP"
echo "   🏷️  Image Tag: $IMAGE_TAG"
echo "   📦 Image Size: $IMAGE_SIZE"
echo "   💾 Backup Created: $CREATE_BACKUP"
echo "   🔄 Migrations Run: $RUN_MIGRATIONS"
echo ""

# Step 14: Show running containers
print_step "Current running containers:"
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"

# Step 15: Show recent logs
echo ""
print_step "Recent application logs:"
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail 10"

echo ""
print_success "🚀 Deployment process complete!"
print_info "Application is available at: https://homework.metacto.com"