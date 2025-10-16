FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# Copy application files (including .env.production)
COPY . .

# Set NODE_ENV to production so Next.js loads .env.production during build
ENV NODE_ENV=production

# Build the application (.env.production will be automatically loaded by Next.js)
RUN npm run build

# Runtime environment variables already set above
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Start the custom server
CMD ["node", "server.js"]
