#!/bin/bash

# Fix script to properly deploy latest image to remote server
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

echo "🚀 Deploying latest image to remote server..."

# Get the latest image tag
LATEST_TAG=$(docker images hcktplanet/homework-tracker --format "{{.Tag}}" | grep -E '^[0-9]{8}-[0-9]{6}$' | head -1)

if [ -z "$LATEST_TAG" ]; then
    echo "❌ No local timestamped image found"
    exit 1
fi

echo "📦 Latest local image: $LATEST_TAG"

# Transfer image to server
echo "📤 Transferring image to server..."
docker save hcktplanet/homework-tracker:$LATEST_TAG | ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker load"

# Tag as latest and deploy
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "
echo '🏷️  Tagging image as latest...'
docker tag hcktplanet/homework-tracker:$LATEST_TAG hcktplanet/homework-tracker:latest

echo '📦 Creating volumes...'
docker volume create ec2-user_homework_data 2>/dev/null || echo 'Volume ec2-user_homework_data already exists'
docker volume create ec2-user_homework_db 2>/dev/null || echo 'Volume ec2-user_homework_db already exists'

echo '🔄 Copying data between volumes if needed...'
docker run --rm -v ec2-user_homework_data:/source -v ec2-user_homework_db:/dest alpine sh -c '
  if [ -d /source ] && [ ! -z \"\$(ls -A /source 2>/dev/null)\" ]; then
    cp -r /source/* /dest/ 2>/dev/null || true
    echo \"✅ Data copied from homework_data to homework_db\"
  else
    echo \"ℹ️  No data to copy or source volume empty\"
  fi
'

echo '🛑 Stopping existing containers...'
cd /home/$USER
docker compose -f docker-compose.ec2.yml down --remove-orphans 2>/dev/null || true
docker stop homework-tracker 2>/dev/null || true
docker rm homework-tracker 2>/dev/null || true

echo '🚀 Starting new containers...'
docker compose -f docker-compose.ec2.yml up -d

echo '⏳ Waiting for startup...'
sleep 10

echo '📊 Container status:'
docker ps --filter name=homework-tracker --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

echo '📋 Recent logs:'
docker logs homework-tracker --tail 15 2>/dev/null || echo 'No logs yet'
"

echo "✅ Deployment completed!"
echo "🌐 Check: https://homework.metacto.com/admin"