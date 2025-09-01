# --- Stage 1: Build the Next.js application ---
# Use a robust Node.js image for the builder stage
FROM node:18 AS builder

# Set the working directory
WORKDIR /app

# Copy the package files and the rest of the source code
# This ensures all source files are in place before npm install
COPY package.json package-lock.json ./
COPY . .

# Install dependencies
# This creates all dependencies and symlinks with the full source in place
RUN npm install

# Run the Next.js build command
RUN npm run build

# --- Stage 2: Create the final, production-ready image ---
# Use a lightweight Node.js image for the final container
FROM node:18-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy the standalone build from the builder stage
COPY --from=builder /app/.next/standalone ./

# Copy the static assets
COPY --from=builder /app/.next/static ./.next/static

# Expose the port Next.js will run on
EXPOSE 3000

# Set the environment variable for production
ENV NODE_ENV=production

# The start command for the application
CMD ["node", "server.js"]
