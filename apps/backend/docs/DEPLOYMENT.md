# Minkalla OSS Project: Quantum-Safe Privacy Portal - Backend Deployment Guide

This document outlines the deployment procedures and critical configurations for the `portal-backend` service, built with NestJS and containerized using Docker. It also serves as a living knowledge base for troubleshooting common deployment issues.

---

## 1. Local Development with Docker Compose

The `portal-backend` service can be run locally using Docker Compose, providing an isolated and consistent environment that mirrors production.

**Prerequisites:**
* Docker Desktop (or Docker Engine + Compose) installed and running.
* Node.js (v18+) and npm (or yarn/pnpm) installed for local development tasks (e.g., `npm install`, `npm run build`).
* Git for version control.

**Setup Steps:**

1.  **Navigate to the `portal-backend` directory:**
    ```bash
    cd <your_project_root>/src/portal/portal-backend/
    ```

2.  **Build the Docker image(s):**
    This compiles the NestJS application and creates the Docker image. The `--no-cache` flag ensures a clean build, bypassing Docker's build cache.
    ```bash
    docker-compose build --no-cache
    ```

3.  **Start the services:**
    This command starts both the `backend` and `mongo` services in detached mode.
    ```bash
    docker-compose up -d
    ```

4.  **Verify container status:**
    ```bash
    docker-compose ps
    ```
    Ensure both `portal-backend-backend-1` and `portal-backend-mongo-1` are `Up` and `healthy` (or `starting`).

5.  **Check backend logs (optional, for debugging):**
    ```bash
    docker-compose logs backend
    ```
    Look for messages like "Nest application successfully started" and "Server running on port 8080".

**Testing Endpoints (Local):**

Once the containers are running, you can test the API endpoints using `curl` (or `Invoke-WebRequest` in PowerShell).

* **Swagger API Documentation:**
    Access the interactive API documentation.
    ```powershell
    curl http://localhost:8080/api-docs
    ```
    Expected result: HTML content for Swagger UI (Status Code 200 OK).

* **User Registration:**
    Register a new user. Adjust email/password as needed for subsequent tests.
    ```powershell
    Invoke-WebRequest -Uri http://localhost:8080/portal/auth/register -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"newuser@example.com","password":"StrongPassword123!"}' | ConvertFrom-Json
    ```
    Expected result: `message: User registered successfully` with `userId` and `email`.

* **User Login:**
    Log in with a registered user.
    ```powershell
    Invoke-WebRequest -Uri http://localhost:8080/portal/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"newuser@example.com","password":"StrongPassword123!"}' | ConvertFrom-Json
    ```
    Expected result: `status: success` with `accessToken` and user details.

---

## 2. Critical Configuration Files

### `Dockerfile`
This defines the multi-stage build process for the Node.js application.

```dockerfile
# Stage 1: Build dependencies and compile TypeScript
FROM node:18-alpine AS builder

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

# DEBUG: List contents of the dist folder after ALL builds in the builder stage
# This step helps verify that main.js and other compiled artifacts are generated as expected.
RUN ls -l dist/

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
# CRITICAL: This points to the compiled main.js, which is the entry point.
CMD ["node", "dist/main.js"]
docker-compose.yml
Defines the multi-service local development environment.

YAML

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - PORT=8080
      - MONGO_URI=${MONGODB_URI} # MongoDB Atlas connection from environment
      - JWT_ACCESS_SECRET=local_dev_jwt_secret
      - JWT_REFRESH_SECRET=local_dev_refresh_secret
      - ENABLE_SWAGGER_DOCS=true
      - FRONTEND_URL=http://localhost:3000
    restart: always
nest-cli.json
Configures the NestJS CLI build process.

JSON

{
  "$schema": "[https://json.schemastore.org/nest-cli](https://json.schemastore.org/nest-cli)",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": false,
    "tsConfigPath": "./tsconfig.json",
    "assets": [],
    "watchAssets": true
  },
  "entryFile": "main"
}
tsconfig.json
TypeScript compiler settings for the NestJS project.

JSON

{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2021",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "incremental": true,
    "strict": true,
    "skipLibCheck": true,
    "noImplicitAny": false,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "resolveJsonModule": true,
    "composite": true,
    "moduleResolution": "node",
    "lib": ["es2021", "esnext"],
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "src/main.ts"],
  "exclude": ["node_modules", "dist"]
}
