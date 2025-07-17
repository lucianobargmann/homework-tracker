# Use the official Node.js runtime as the base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files ensuring all migrations are included
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Compare migration file counts between builder and runner
RUN src_count=$(find /app/prisma/migrations -type f | wc -l) && \
    dst_count=$(find ./prisma/migrations -type f | wc -l) && \
    echo "📦 Prisma migrations: source=$src_count, destination=$dst_count" && \
    if [ "$src_count" -ne "$dst_count" ]; then \
        echo "❌ ERROR: Migration file count mismatch! Build aborted."; \
        exit 1; \
    fi

COPY docker/entrypoint.sh /app/entrypoint.sh
COPY docker/entrypoint-simple.sh /app/entrypoint-simple.sh
RUN chmod +x /app/entrypoint.sh
RUN chmod +x /app/entrypoint-simple.sh


# Create directories for SQLite database
RUN mkdir -p /app/prisma /app/data && chown nextjs:nodejs /app/prisma /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations and start the server
CMD ["/app/entrypoint.sh"]



