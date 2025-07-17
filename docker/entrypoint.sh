#!/bin/sh
# Ensure data directory exists (should already have correct permissions)
mkdir -p /app/data

# Prisma client should already be generated during build
# Only run migrations if they exist
if [ -d "/app/prisma/migrations" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "No migrations found, starting server..."
fi
node server.js