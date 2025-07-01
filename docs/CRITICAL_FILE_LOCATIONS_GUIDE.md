# Critical File Locations Guide for Quantum-Safe Privacy Portal

**Document Purpose**: Comprehensive reference for future agents working on the quantum-safe-privacy-portal repository  
**Created**: July 1, 2025  
**Last Updated**: WBS 1.12 Session Management Implementation  
**Scope**: Authentication, Session Management, PQC Integration, and Core Infrastructure  

## 🎯 Quick Navigation for Common Tasks

### Authentication & Session Management (WBS 1.10-1.12)
```
📁 Backend Authentication Core
├── src/portal/portal-backend/src/auth/
│   ├── auth.service.ts              # Core authentication logic, JWT handling
│   ├── auth.controller.ts           # Authentication endpoints (/portal/auth/*)
│   ├── auth.middleware.ts           # JWT validation middleware (WBS 1.12)
│   ├── auth.module.ts               # Authentication module configuration
│   └── jwt-auth.guard.ts            # NestJS JWT guard implementation

📁 JWT & Token Management
├── src/portal/portal-backend/src/jwt/
│   └── jwt.service.ts               # JWT token creation, validation, refresh logic

📁 Frontend Authentication
├── src/portal/portal-frontend/src/contexts/
│   └── AuthContext.tsx              # React authentication context and state
├── src/portal/portal-frontend/src/components/auth/
│   ├── ProtectedRoute.tsx           # Route protection component (WBS 1.12)
│   ├── Login.tsx                    # Login form component (WBS 1.11)
│   └── Register.tsx                 # Registration form component (WBS 1.10)
├── src/portal/portal-frontend/src/utils/
│   ├── api.ts                       # API client with token refresh logic (WBS 1.12)
│   └── jwt.ts                       # JWT utility functions
```

### User Management & Database Models
```
📁 User Management
├── src/portal/portal-backend/src/user/
│   ├── user.controller.ts           # User profile endpoints
│   ├── user.module.ts               # User module configuration
│   └── user.service.ts              # User business logic
├── src/portal/portal-backend/src/models/
│   ├── User.ts                      # MongoDB User model with PQC fields
│   └── Consent.ts                   # MongoDB Consent model
```

### Post-Quantum Cryptography (PQC) Integration
```
📁 PQC Services & Implementation
├── src/portal/portal-backend/src/services/
│   ├── pqc.service.ts               # Core PQC operations
│   ├── hybrid-crypto.service.ts     # PQC/Classical crypto hybrid service
│   └── crypto-services.module.ts    # Crypto services module
├── src/portal/portal-backend/src/controllers/
│   └── pqc-user.controller.ts       # PQC-specific user operations

📁 PQC Mock Service (Development)
├── src/portal/mock-qynauth/
│   ├── src/rust_lib/                # Rust PQC implementation
│   │   ├── src/lib.rs               # Main Rust library with FFI exports
│   │   └── Cargo.toml               # Rust dependencies and configuration
│   └── src/python_app/              # Python FastAPI bridge
│       └── app/main.py              # FastAPI application for PQC operations
```

### Testing Infrastructure
```
📁 Backend Tests
├── src/portal/portal-backend/src/auth/
│   ├── auth.service.spec.ts         # Authentication service unit tests
│   ├── auth.middleware.spec.ts      # Middleware unit tests
│   └── auth.integration.spec.ts     # Authentication integration tests
├── src/portal/portal-backend/test/
│   └── integration/                 # Integration test suites

📁 Frontend Tests
├── src/portal/portal-frontend/src/components/auth/
│   ├── Login.test.tsx               # Login component tests
│   ├── Register.test.tsx            # Registration component tests
│   └── ProtectedRoute.test.tsx      # Route protection tests
```

### Configuration & Environment
```
📁 Configuration Files
├── src/portal/portal-backend/
│   ├── src/main.ts                  # NestJS application bootstrap
│   ├── src/app.module.ts            # Root application module
│   ├── package.json                 # Backend dependencies and scripts
│   └── .env.example                 # Environment variables template
├── src/portal/portal-frontend/
│   ├── package.json                 # Frontend dependencies and scripts
│   └── src/App.tsx                  # Main React application component
├── src/portal/
│   └── docker-compose.yml           # Multi-service development environment
```

## 🔧 Key Patterns and Conventions

### Authentication Flow Pattern
1. **Registration**: `Register.tsx` → `auth.controller.ts` → `auth.service.ts` → `User.ts` model
2. **Login**: `Login.tsx` → `auth.controller.ts` → `auth.service.ts` → `jwt.service.ts`
3. **Protected Routes**: `ProtectedRoute.tsx` → `AuthContext.tsx` → `api.ts` token refresh
4. **Backend Protection**: `auth.middleware.ts` → `jwt.service.ts` validation

### File Naming Conventions
- **Services**: `*.service.ts` (business logic)
- **Controllers**: `*.controller.ts` (HTTP endpoints)
- **Modules**: `*.module.ts` (NestJS module configuration)
- **Guards**: `*.guard.ts` (NestJS authentication guards)
- **Middleware**: `*.middleware.ts` (request/response processing)
- **Models**: `*.ts` in `/models/` (database schemas)
- **Tests**: `*.spec.ts` (unit tests), `*.test.tsx` (React component tests)

### Import Patterns
```typescript
// NestJS Services
import { AuthService } from '../auth/auth.service';
import { JwtService } from '../jwt/jwt.service';

// React Components
import { AuthContext } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Utilities
import { api } from '../utils/api';
import { isTokenExpired } from '../utils/jwt';
```

## 📋 Critical Configuration Files

### Environment Variables (.env)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/quantum-safe-portal

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# PQC Configuration
PQC_ENABLED=true
QYNAUTH_SERVICE_URL=http://localhost:8000

# AWS Secrets Manager (Production)
AWS_REGION=us-east-1
SECRETS_MANAGER_SECRET_NAME=quantum-safe-portal-secrets
```

### Package.json Scripts (Backend)
```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "jest",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
  }
}
```

### Package.json Scripts (Frontend)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

## 🧪 Testing Patterns

### Backend Test Structure
```typescript
// Unit Test Pattern (*.spec.ts)
describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, JwtService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should validate JWT token', async () => {
    // Test implementation
  });
});
```

### Frontend Test Structure
```typescript
// React Component Test Pattern (*.test.tsx)
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { Login } from './Login';

describe('Login Component', () => {
  it('should handle login form submission', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    
    // Test implementation
  });
});
```

## 📚 Documentation Structure

### Core Documentation Files
```
📁 Documentation Hierarchy
├── docs/
│   ├── SESSION_MANAGEMENT.md           # Comprehensive session management guide (WBS 1.12)
│   ├── AUTHENTICATION_FLOW_DOCUMENTATION.md  # Technical authentication details
│   ├── END_TO_END_FLOW_ANALYSIS.md     # Complete user journey analysis
│   ├── WBS_AUTH_TRACELOG.md            # Authentication implementation tracking
│   ├── WBS_1.12_READINESS_CHECKLIST.md # Session management implementation checklist
│   ├── WBS_1.13_READINESS_CHECKLIST.md # MFA implementation preparation
│   ├── HANDOVER_SUMMARY.md             # Current project status summary
│   ├── NEW_ENGINEER_ONBOARDING_MESSAGE.md # Complete onboarding guide
│   ├── PQC_INTEGRATION_STATUS_TRACKING.md # Project phase tracking
│   └── WBS_STATUS_REPORT.md            # Detailed WBS task status
└── README.md                           # Main project documentation with links
```

### WBS Documentation Pattern
- **WBS_X.X_READINESS_CHECKLIST.md**: Pre-implementation validation
- **WBS_X.X_IMPLEMENTATION_GUIDE.md**: Step-by-step implementation
- **WBS_X.X_COMPLETION_SUMMARY.md**: Post-implementation validation

## 🚀 Development Workflow

### Local Development Setup
```bash
# Backend Development
cd src/portal/portal-backend
npm install
npm run start:dev  # Runs on http://localhost:8080

# Frontend Development  
cd src/portal/portal-frontend
npm install
npm run dev        # Runs on http://localhost:5173

# Full Stack Development
cd src/portal
docker-compose up  # Runs all services
```

### Testing Workflow
```bash
# Backend Testing
cd src/portal/portal-backend
npm run test       # Unit tests
npm run test:cov   # Coverage report
npm run test:e2e   # Integration tests

# Frontend Testing
cd src/portal/portal-frontend
npm run test       # Vitest unit tests
npm run test:ui    # Vitest UI mode
```

### Build and Deployment
```bash
# Backend Build
cd src/portal/portal-backend
npm run build      # Creates dist/ directory
npm run format     # Code formatting
npm run lint       # ESLint validation

# Frontend Build
cd src/portal/portal-frontend
npm run build      # Creates dist/ directory for production
npm run preview    # Preview production build
```

## 🔍 Debugging and Troubleshooting

### Common Issues and Solutions

#### Authentication Issues
- **JWT Token Invalid**: Check `jwt.service.ts` for token validation logic
- **Login Failures**: Debug in `auth.service.ts` and check MongoDB connection
- **Protected Route Access**: Verify `auth.middleware.ts` and `ProtectedRoute.tsx`

#### Database Connection Issues
- **MongoDB Connection**: Check `MONGODB_URI` in environment variables
- **User Model Issues**: Verify `src/portal/portal-backend/src/models/User.ts`

#### Frontend State Issues
- **Authentication State**: Debug `AuthContext.tsx` and localStorage
- **API Communication**: Check `src/portal/portal-frontend/src/utils/api.ts`

#### Build Issues
- **TypeScript Errors**: Run `npm run build` to see compilation errors
- **Dependency Issues**: Check `package.json` and run `npm install`

### Logging and Monitoring
- **Backend Logs**: NestJS built-in logger in services and controllers
- **Frontend Logs**: Console logging in development mode
- **API Requests**: Network tab in browser developer tools

## 🔐 Security Considerations

### Authentication Security
- **JWT Secrets**: Stored in environment variables or AWS Secrets Manager
- **Password Hashing**: Implemented in `auth.service.ts`
- **Token Refresh**: Automatic refresh logic in `api.ts`
- **Route Protection**: Middleware validation for all protected endpoints

### PQC Security
- **Key Management**: PQC keys stored securely in database
- **Hybrid Crypto**: Fallback to classical crypto when PQC unavailable
- **Service Communication**: Secure communication between services

## 📝 Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled in `tsconfig.json`
- **ESLint**: Configured for both backend and frontend
- **Prettier**: Code formatting standards
- **Jest/Vitest**: Testing frameworks with coverage requirements

### Git Workflow
- **Branch Naming**: `devin/{timestamp}-{feature-description}`
- **Commit Messages**: Conventional commits format
- **PR Process**: All changes go through pull requests
- **CI/CD**: GitHub Actions for automated testing and validation

## 🎯 Future Development Guidelines

### Adding New Authentication Features
1. **Backend**: Add to `auth.service.ts` and create corresponding controller endpoints
2. **Frontend**: Update `AuthContext.tsx` and create new components as needed
3. **Testing**: Add unit tests for services and component tests for UI
4. **Documentation**: Update relevant documentation files

### Extending PQC Integration
1. **Services**: Add new PQC operations to `pqc.service.ts`
2. **Controllers**: Create endpoints in `pqc-user.controller.ts`
3. **Frontend**: Update API client in `api.ts` for new endpoints
4. **Testing**: Add comprehensive tests for new PQC functionality

### Database Schema Changes
1. **Models**: Update models in `src/portal/portal-backend/src/models/`
2. **Migrations**: Create migration scripts for schema changes
3. **Services**: Update services to handle new schema
4. **Testing**: Update tests to reflect schema changes

---

**Note**: This guide reflects the state of the repository as of WBS 1.12 completion (July 1, 2025). Future implementations may introduce new patterns and file locations that should be documented here.
