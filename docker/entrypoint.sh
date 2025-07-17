#!/bin/sh
# Ensure database directory exists (should already have correct permissions)
mkdir -p /app/database

# Prisma client should already be generated during build
# Only run migrations if they exist
if [ -d "/app/prisma/migrations" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "No migrations found, starting server..."
fi
node server.js