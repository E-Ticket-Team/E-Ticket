# ==============================================================================
# Stage 1: Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using clean install
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build arguments for frontend environment variables
ARG VITE_API_BASE_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build production static bundle
RUN npm run build

# ==============================================================================
# Stage 2: Production Nginx Runtime Stage
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Install wget for container health checks
RUN apk add --no-cache wget

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose web server HTTP port
EXPOSE 80

# Healthcheck to ensure Nginx is serving the frontend
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
