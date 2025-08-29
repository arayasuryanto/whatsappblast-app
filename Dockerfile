# Use Node.js 20 LTS version (required for @whiskeysockets/baileys)
FROM node:20-alpine

# Add necessary packages for WhatsApp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with memory optimization
RUN npm ci --omit=dev --maxsockets=1

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p uploads auth_info && \
    chmod -R 755 uploads auth_info

# Set NODE_ENV
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=512"

# Expose port
EXPOSE 3000

# Health check with longer timeout
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=2 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]