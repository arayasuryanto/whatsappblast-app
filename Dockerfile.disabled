# Use Node.js 20 LTS version
FROM node:20-alpine

# Add curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy application files (no npm install needed for test server)
COPY . .

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Railway handles health checks - disable Docker health check to avoid conflicts
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start test server directly with Node.js (no npm)
CMD ["node", "server-test.js"]