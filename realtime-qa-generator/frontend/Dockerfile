# Build stage
FROM node:18 AS builder
WORKDIR /app

# Copy package files and source code
COPY package.json package-lock.json ./
COPY . .

# Install dependencies and build
RUN npm install
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Configure runtime
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
