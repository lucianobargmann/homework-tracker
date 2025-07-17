#!/bin/sh
# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations if they exist, otherwise just start the server
if [ -d "/app/prisma/migrations" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "No migrations found, starting server..."
fi
node server.js