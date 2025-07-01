# Backend Migration Guide - WBS 1.8 Implementation

## Overview

This document outlines the migration from the legacy backend structure to the new monorepo structure implemented in WBS 1.8. The migration is **non-destructive** - the original backend remains at `src/portal/portal-backend/` for rollback safety.

**Status**: ✅ Implementation Complete - Manual monorepo structure created with extracted libs and dual-backend support

---

## Folder Structure (Old → New)

| Old Path | New Path |
|----------|----------|
| `src/portal/portal-backend/` | `apps/backend/` (duplicated) |
| `src/portal/portal-backend/src/auth/` | `libs/auth/src/auth/` |
| `src/portal/portal-backend/src/user/` | `libs/user/src/user/` |
| `src/portal/portal-backend/src/pqc/` | `libs/pqc/src/pqc/` |
| `src/portal/portal-backend/src/pqc-data/` | `libs/pqc/src/pqc-data/` |
| `src/portal/portal-backend/src/models/` | `libs/common/src/models/` |

---

## Monorepo Structure

- `apps/backend/`: Main NestJS application (duplicated from legacy)
- `libs/auth/`: Authentication module (AuthModule, AuthService, etc.)
- `libs/user/`: User management module (UserModule)
- `libs/pqc/`: Post-Quantum Cryptography modules (PQCFeatureFlagsModule, PQCDataModule)
- `libs/common/`: Shared models and interfaces (User, Consent models)
- `libs/logger/`: Logging utilities (stub implementation)

---

## Import Path Changes

### Before (Legacy)
```typescript
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PQCFeatureFlagsModule } from './pqc/pqc-feature-flags.module';
import { PQCDataModule } from './pqc-data/pqc-data.module';
```

### After (New Structure)
```typescript
import { AuthModule } from '@libs/auth';
import { UserModule } from '@libs/user';
import { PQCFeatureFlagsModule, PQCDataModule } from '@libs/pqc';
```

---

## Development Commands

### Legacy Backend
```bash
cd src/portal/portal-backend
npm install
npm run start:dev  # Port 8080
npm run test
npm run lint
npm run build
```

### New Backend
```bash
cd apps/backend
npm install
npm run start:dev  # Port 8080 (or different port)
npm run test
npm run lint
npm run build
```

---

## Testing Checklist

- ✅ `apps/backend/` structure created with all files duplicated
- ✅ Libs extracted: auth, user, pqc, common, logger
- ✅ Import paths updated to use @libs/* aliases
- ✅ TypeScript path mappings configured
- ⏳ `npm run build` works without error in apps/backend
- ⏳ `/portal/auth/*` endpoints return expected results
- ⏳ Swagger available at `/portal/api-docs`
- ⏳ All tests pass in new structure
- ⏳ CI workflows updated for dual-backend validation

---

## Rollback Instructions

### Complete Rollback
```bash
# Stop new backend if running
cd apps/backend && npm run stop

# Start legacy backend
cd src/portal/portal-backend && npm run start:dev

# Remove new structure (optional)
rm -rf apps/ libs/

# Restore CI workflows if needed
git checkout HEAD~1 -- .github/workflows/
```

### Partial Rollback
```bash
# Revert to relative imports in apps/backend/src/app.module.ts
# Copy modules back from libs/ to apps/backend/src/
# Update package.json to remove libs dependencies
```

---

## Validation Commands

```bash
# Test legacy backend
cd src/portal/portal-backend
npm run build && npm run test && npm run lint

# Test new backend
cd apps/backend  
npm run build && npm run test && npm run lint

# Compare functionality
curl http://localhost:8080/portal/api-docs  # Legacy
curl http://localhost:8081/portal/api-docs  # New (if on different port)
```
