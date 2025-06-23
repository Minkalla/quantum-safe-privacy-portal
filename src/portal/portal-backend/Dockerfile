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
#
# Updates for Debugging (June 23, 2025):
# - Modified CMD to include more verbose Node.js debugging flags and keep container alive on crash.
# - Corrected NODE_OPTIONS flag for source maps.

# Stage 1: Build dependencies and compile TypeScript
FROM node:20-alpine AS builder # Updated to node:20-alpine as per Qodo's suggestion for EBADENGINE warnings

# Set working directory for the build stage
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Copy tsconfig.json
COPY tsconfig.json ./

# Copy nest-cli.json
COPY nest-cli.json ./

# Copy the 'src/main.ts' file
COPY src/main.ts ./src/main.ts

# Copy the rest of the 'src' directory
COPY src/ ./src/

# Install production and necessary development dependencies for the build
RUN npm ci

# Compile NestJS modules
RUN npm run build

# Stage 2: Create the lean production image
FROM node:20-alpine # Updated to node:20-alpine

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
# NOTE: In CI, NODE_ENV will be overridden by the backend.yml job-level env to 'development'
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port the application listens on
EXPOSE 8080

# Define a healthcheck to verify container's responsiveness
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD curl -f http://localhost:$PORT/portal/ || exit 1

# Command to run the NestJS application when the container starts
# CRITICAL DEBUGGING CMD: Adds verbose Node.js flags and keeps container alive on crash
# NODE_OPTIONS ensures more verbose V8/Node.js startup logs
ENV NODE_OPTIONS="--enable-source-maps"
CMD ["sh", "-c", "node --trace-warnings --unhandled-rejections=strict dist/main.js || sleep infinity"]