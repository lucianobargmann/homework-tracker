#!/bin/bash

# Run database migration on server
# Usage: ./migrate.sh [options]

SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"

show_help() {
    echo "Run database migration on server"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -s, --server      Server hostname (default: $SERVER)"
    echo "  -i, --identity    SSH identity file (default: $IDENTITY_FILE)"
    echo "  -u, --user        SSH user (default: $USER)"
    echo "  -h, --help        Show this help message"
    echo ""
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

echo "🔄 Running database migration on $SERVER..."

# Create migration script content
MIGRATION_SCRIPT='const { PrismaClient } = require("./src/generated/prisma")

async function addCreatedAtColumn() {
  const prisma = new PrismaClient()
  
  try {
    // Check if the column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(users)`
    const hasCreatedAt = result.some(column => column.name === "created_at")
    
    if (!hasCreatedAt) {
      console.log("Adding created_at column...")
      
      // Add the column as nullable first
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN created_at DATETIME`
      
      // Update all existing records to have the current timestamp
      await prisma.$executeRaw`UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`
      
      console.log("✅ Successfully added created_at column and updated existing records")
    } else {
      console.log("✅ created_at column already exists")
    }
  } catch (error) {
    console.error("❌ Error adding created_at column:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addCreatedAtColumn()'

# Copy migration script to server
echo "📤 Copying migration script to server..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "cat > /tmp/migrate-created-at.js << 'EOF'
$MIGRATION_SCRIPT
EOF"

# Copy script into container and run it
echo "🏃 Running migration in container..."
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker cp /tmp/migrate-created-at.js homework-tracker:/app/migrate-created-at.js"
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker exec homework-tracker node /app/migrate-created-at.js"

# Clean up
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "rm /tmp/migrate-created-at.js"
ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker exec homework-tracker rm /app/migrate-created-at.js"

echo "✅ Migration completed successfully!"