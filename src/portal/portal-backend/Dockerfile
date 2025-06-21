# Dockerfile for Minkalla Portal Backend (NestJS)
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
COPY package*.json ./

# Copy ALL source code.
COPY . .

# Install production and necessary development dependencies for the build
RUN npm ci

# Compile NestJS modules
RUN npm run build

# DEBUG: List contents of the dist folder after build in the builder stage (Activity 1.5.3.4.1)
RUN ls -l dist/ # ADDED DEBUG LINE

# Stage 2: Create the lean production image
FROM node:18-alpine

# Set working directory for the application
WORKDIR /app

# Use the existing 'node' user from the base image for enhanced security
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Copy compiled files and dependencies from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port the application listens on
EXPOSE 8080

# Define a healthcheck to verify container's responsiveness
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD curl -f http://localhost:$PORT/portal/ || exit 1

# Command to run the NestJS application when the container starts
CMD ["node", "dist/src/main.js"]