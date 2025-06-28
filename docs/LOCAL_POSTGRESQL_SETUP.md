# Local PostgreSQL Setup for Development

This guide explains how to set up PostgreSQL locally for testing the ZynConsent migration from MongoDB to PostgreSQL.

## Option 1: Docker Setup (Recommended)

### Quick Start
```bash
# Start PostgreSQL container
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=portal_dev \
  -p 5432:5432 \
  -d postgres:15

# Create test database
docker exec -it postgres-dev createdb -U postgres portal_test
```

### Verify Connection
```bash
# Connect to PostgreSQL
docker exec -it postgres-dev psql -U postgres -d portal_dev

# Inside psql, run:
\l  # List databases
\q  # Quit
```

### Environment Configuration
Create `.env.local` in `src/portal/portal-backend/`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/portal_dev
NODE_ENV=development
```

## Option 2: Native Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create databases
sudo -u postgres createdb portal_dev
sudo -u postgres createdb portal_test

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

### macOS (Homebrew)
```bash
brew install postgresql
brew services start postgresql

# Create databases
createdb portal_dev
createdb portal_test

# Set password
psql postgres -c "ALTER USER $(whoami) PASSWORD 'password';"
```

## Testing the Migration

### 1. Install Dependencies
```bash
cd src/portal/portal-backend
npm install
```

### 2. Run Database Migration
```bash
# TypeORM will automatically create tables on first run
npm run start:dev
```

### 3. Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Database Schema

The migration creates the following tables:

### Consents Table
- `id` (UUID, Primary Key)
- `userId` (VARCHAR(24), Indexed)
- `consentType` (ENUM: marketing, analytics, data_processing, cookies, third_party_sharing)
- `granted` (BOOLEAN)
- `ipAddress` (VARCHAR(45), Optional)
- `userAgent` (VARCHAR(500), Optional)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Users Table
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR)
- `failedLoginAttempts` (INTEGER)
- `lockUntil` (TIMESTAMP, Optional)
- `lastLoginAt` (TIMESTAMP, Optional)
- `refreshTokenHash` (VARCHAR, Optional)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

## Troubleshooting

### Connection Issues
```bash
# Check if PostgreSQL is running
docker ps  # For Docker
sudo systemctl status postgresql  # For native

# Check port availability
netstat -an | grep 5432
```

### Permission Issues
```bash
# For native installation, ensure proper permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE portal_dev TO postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE portal_test TO postgres;"
```

### Reset Database
```bash
# Docker: Remove and recreate container
docker stop postgres-dev && docker rm postgres-dev
# Then run the Quick Start commands again

# Native: Drop and recreate databases
sudo -u postgres dropdb portal_dev
sudo -u postgres dropdb portal_test
sudo -u postgres createdb portal_dev
sudo -u postgres createdb portal_test
```

## Next Steps

After PostgreSQL is running:
1. Test the consent API endpoints
2. Verify data persistence
3. Run the full test suite
4. Proceed to WBS 1.2 Containerization
