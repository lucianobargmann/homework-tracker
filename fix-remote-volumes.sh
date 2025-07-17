#!/bin/bash

# Quick fix script for remote server volumes
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

echo "🔧 Fixing remote server volumes and deployment..."

ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" '
# Create both volumes
echo "📦 Creating volumes..."
docker volume create ec2-user_homework_data 2>/dev/null || echo "Volume ec2-user_homework_data already exists"
docker volume create ec2-user_homework_db 2>/dev/null || echo "Volume ec2-user_homework_db already exists"

# Copy data between volumes
echo "🔄 Copying data between volumes..."
docker run --rm -v ec2-user_homework_data:/source -v ec2-user_homework_db:/dest alpine sh -c "
  if [ -d /source ] && [ ! -z \"\$(ls -A /source 2>/dev/null)\" ]; then
    cp -r /source/* /dest/ 2>/dev/null || true
    echo \"✅ Data copied from homework_data to homework_db\"
  else
    echo \"ℹ️  No data to copy or source volume empty\"
  fi
"

# Pull latest image
echo "📥 Pulling latest image..."
docker pull hcktplanet/homework-tracker:latest || echo "⚠️  Pull failed, will use local image"

# Restart containers
echo "🚀 Restarting containers..."
cd /home/'"$USER"' && docker compose -f docker-compose.ec2.yml down
cd /home/'"$USER"' && docker compose -f docker-compose.ec2.yml up -d

# Check status
echo "📊 Container status:"
docker ps --filter name=homework-tracker --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo "📋 Recent logs:"
docker logs homework-tracker --tail 10 2>/dev/null || echo "No logs yet"
'

echo "✅ Remote fix completed!"