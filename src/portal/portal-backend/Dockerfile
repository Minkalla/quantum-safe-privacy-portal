# Dockerfile for Minkalla Portal Backend
#
# @file Dockerfile
# @description Defines the Docker container configuration for the Quantum-Safe Privacy Portal Backend.
# Uses a multi-stage build for optimized image size and includes a healthcheck.
#
# @author Minkalla
# @license MIT
#
# @remarks
# Aligns with "no regrets" quality by ensuring consistent, portable, and secure environments.
# Supports compliance requirements by standardizing the runtime.
# This Dockerfile is Pre-PQC ready, allowing easy updates for quantum-safe libraries.

# Stage 1: Build dependencies and compile TypeScript
FROM node:18-alpine AS builder

# Set working directory for the build stage
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache for npm install
# 'npm ci' is preferred in CI/CD contexts for reproducible builds.
COPY package*.json ./

# Install production dependencies (and dev dependencies needed for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Compile TypeScript code
# 'npm run build' typically compiles TypeScript to JavaScript in a 'dist' folder
RUN npm run build

# Stage 2: Create the lean production image
# Use a slim Node.js image for the final runtime to minimize attack surface and image size
FROM node:18-alpine

# Set working directory for the application
WORKDIR /app

# Copy only the compiled output and production dependencies from the builder stage
# This ensures a clean, small image without development dependencies or source code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port the application listens on
EXPOSE 8080

# Define a healthcheck to verify container's responsiveness
# This helps container orchestrators (like EB, Kubernetes) know if the app is truly ready
# The '/health' endpoint is a placeholder. If you create a specific health check endpoint
# in your Express app later, ensure this matches. For now, a simple curl to root should suffice.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD curl -f http://localhost:$PORT/ || exit 1

# Command to run the application when the container starts
# CORRECTED: Run dist/server.js to start the Express server
CMD ["node", "dist/server.js"]