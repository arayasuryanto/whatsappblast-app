# Use Node.js 20 LTS version
FROM node:20-alpine

# Add curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only required dependencies
RUN npm ci --omit=dev --omit=optional

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p uploads

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start minimal application
CMD ["npm", "start"]