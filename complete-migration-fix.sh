#!/bin/bash

# Complete the migration fix on remote server
SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

echo "🔧 Completing migration architecture fix on remote server..."

ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" '
echo "📋 Current docker-compose setup:"
cd /home/'"$USER"'
grep -A 5 "volumes:" docker-compose.ec2.yml

echo ""
echo "📝 Updating docker-compose.ec2.yml for proper architecture..."

# Update DATABASE_URL
sed -i "s|DATABASE_URL=file:/app/data/prod.db|DATABASE_URL=file:/app/database/prod.db|g" docker-compose.ec2.yml

# Update volume mount
sed -i "s|ec2-user_homework_db:/app/data|ec2-user_homework_db:/app/database|g" docker-compose.ec2.yml

echo "✅ Updated docker-compose.ec2.yml:"
grep -A 10 -B 2 "DATABASE_URL\|volumes:" docker-compose.ec2.yml

echo ""
echo "🔄 Creating new volume for database files only..."
docker volume create ec2-user_homework_db 2>/dev/null || echo "Volume already exists"

echo "📂 Copying database from old location..."
docker run --rm -v ec2-user_homework_data:/old -v ec2-user_homework_db:/new alpine sh -c "
  if [ -f /old/prod.db ]; then
    cp /old/prod.db /new/prod.db
    echo \"✅ Database copied to new volume\"
    ls -la /new/
  else
    echo \"⚠️  No database found in old volume, checking backup...\"
    ls -la /old/
  fi
"

echo ""
echo "🛑 Stopping current container..."
docker compose -f docker-compose.ec2.yml down --remove-orphans 2>/dev/null || true
docker stop homework-tracker 2>/dev/null || true
docker rm homework-tracker 2>/dev/null || true

echo "🚀 Starting with new architecture..."
docker compose -f docker-compose.ec2.yml up -d

echo "⏳ Waiting for startup..."
sleep 15

echo "📊 Container status:"
docker ps --filter name=homework-tracker --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "🔍 Checking migration files in container (should be from IMAGE):"
docker exec homework-tracker ls -la /app/prisma/migrations/ 2>/dev/null || echo "Container not ready yet"

echo ""
echo "📂 Checking database directory (should be from VOLUME):"
docker exec homework-tracker ls -la /app/database/ 2>/dev/null || echo "Container not ready yet"

echo ""
echo "📋 Recent logs:"
docker logs homework-tracker --tail 20 2>/dev/null || echo "No logs yet"
'

echo "✅ Migration architecture fix completed!"
echo "🌐 Test: https://homework.metacto.com/admin"