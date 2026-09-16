# ============================================
# Warren-XMD Bot — Multi-session WhatsApp bot
# ============================================
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libwebp-dev \
    libvips-dev \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production --no-audit --no-fund

# Copy the rest of the code
COPY . .

# Remove dev files that shouldn't go to production
RUN rm -rf .git .gitignore tmp/* logs/* *.md

# Create required folders (in case they were empty)
RUN mkdir -p tmp logs data

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the bot
CMD ["node", "index.js"]
