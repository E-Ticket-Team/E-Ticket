# ==============================================================================
# Stage 1: Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma CLI & engine on Alpine
RUN apk add --no-cache openssl

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and configuration files
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build TypeScript application
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime Stage
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma engines on Alpine, wget for healthcheck
RUN apk add --no-cache openssl wget

# Copy package manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g prisma@5.22.0

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy compiled application code
COPY --from=builder /app/dist ./dist

# Copy startup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# Security: assign app ownership and run application as unprivileged node user
RUN chown -R node:node /app
USER node

# Expose default backend application port
EXPOSE 4000

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
