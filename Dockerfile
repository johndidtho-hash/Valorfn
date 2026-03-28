# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to leverage Docker layer caching.
COPY package*.json ./

# Install production dependencies only.
RUN npm ci --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install native build tools required by sqlite3.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source.
COPY . .

# Rebuild sqlite3 native bindings for this architecture.
RUN npm rebuild sqlite3

# Create the data directory for the SQLite database.
RUN mkdir -p /app/data

# Expose the Express server port.
EXPOSE 3000

# Run as a non-root user for security.
RUN addgroup -S valorfn && adduser -S valorfn -G valorfn
RUN chown -R valorfn:valorfn /app
USER valorfn

CMD ["node", "src/index.js"]
