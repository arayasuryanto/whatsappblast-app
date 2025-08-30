# Use Node.js 20 LTS version  
FROM node:20-alpine

# Add curl for health checks and build tools
RUN apk add --no-cache curl python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p auth_info uploads data

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the full server
CMD ["node", "server.js"]