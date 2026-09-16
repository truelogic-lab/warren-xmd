FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libwebp-dev \
    libvips-dev \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --production --no-audit --no-fund

COPY . .

RUN rm -rf .git .gitignore tmp/* logs/* *.md
RUN mkdir -p tmp logs data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Fix #8 — cap heap so Node fails fast instead of silently OOM-killing
ENV NODE_OPTIONS="--max-old-space-size=768"

CMD ["node", "index.js"]
