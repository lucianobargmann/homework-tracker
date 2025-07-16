#!/bin/bash

# Database Backup Script for Homework Tracker
# Usage: ./backup-database.sh [server] [identity-file] [user]

SERVER=${1:-ec2-34-228-58-5.compute-1.amazonaws.com}
IDENTITY_FILE=${2:-~/.ssh/metacto-aws-lbargmann.pem}
USER=${3:-ec2-user}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="homework-db-backup-${TIMESTAMP}"

echo "🔄 Starting database backup..."
echo "📍 Server: ${SERVER}"
echo "🕐 Timestamp: ${TIMESTAMP}"

# Create backup directory on server
ssh -o StrictHostKeyChecking=no -i "${IDENTITY_FILE}" "${USER}@${SERVER}" "mkdir -p /home/${USER}/backups"

# Copy database from Docker volume
echo "📦 Copying database from Docker volume..."
ssh -o StrictHostKeyChecking=no -i "${IDENTITY_FILE}" "${USER}@${SERVER}" "sudo cp -r /var/lib/docker/volumes/ec2-user_homework_data/_data /home/${USER}/backups/${BACKUP_NAME}"

# Fix permissions
ssh -o StrictHostKeyChecking=no -i "${IDENTITY_FILE}" "${USER}@${SERVER}" "sudo chown -R ${USER}:${USER} /home/${USER}/backups/${BACKUP_NAME}"

# Create compressed archive
echo "🗜️ Creating compressed backup..."
ssh -o StrictHostKeyChecking=no -i "${IDENTITY_FILE}" "${USER}@${SERVER}" "cd /home/${USER}/backups && tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}"

# Download backup to local machine
echo "📥 Downloading backup to local machine..."
mkdir -p ./database-backups
scp -i "${IDENTITY_FILE}" "${USER}@${SERVER}:/home/${USER}/backups/${BACKUP_NAME}.tar.gz" "./database-backups/"

# Verify backup
if [ -f "./database-backups/${BACKUP_NAME}.tar.gz" ]; then
    SIZE=$(ls -lh "./database-backups/${BACKUP_NAME}.tar.gz" | awk '{print $5}')
    echo "✅ Backup completed successfully!"
    echo "📍 Local backup: ./database-backups/${BACKUP_NAME}.tar.gz"
    echo "📊 Size: ${SIZE}"
    
    # List all backups
    echo ""
    echo "📋 All local backups:"
    ls -lh ./database-backups/
else
    echo "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups on server (keep last 7 days)
echo ""
echo "🧹 Cleaning up old backups on server (keeping last 7 days)..."
ssh -o StrictHostKeyChecking=no -i "${IDENTITY_FILE}" "${USER}@${SERVER}" "find /home/${USER}/backups -name 'homework-db-backup-*.tar.gz' -mtime +7 -delete"

echo ""
echo "🎉 Backup process complete!"