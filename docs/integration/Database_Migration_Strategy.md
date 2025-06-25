# Database Migration Strategy for NIST PQC Integration
*Transitioning QynAuth from In-Memory to Shared MongoDB Architecture*

**Document Version**: v1.0  
**Date**: June 25, 2025  
**Status**: Draft  
**Authors**: Integration Team  

## Executive Summary

This document outlines the comprehensive database migration strategy to transition QynAuth from in-memory user storage (`users_db = {}`) to shared MongoDB architecture with Portal Backend, enabling NIST Post-Quantum Cryptography implementation while maintaining data consistency and the existing 57/57 E2E test success rate.

## Current State Analysis

### QynAuth Service (Source System)
- **Storage**: In-memory dictionary (`users_db = {}`)
- **Data Structure**: Simple key-value pairs
- **Persistence**: None - data lost on service restart
- **User Model**: Basic email/password structure
- **Location**: `src/python_app/app/main.py` lines 22-24

```python
# Current QynAuth storage (TEMPORARY)
users_db = {}  # In-memory storage - will be replaced with MongoDB
```

### Portal Backend Service (Target System)
- **Storage**: MongoDB with Mongoose ODM
- **Database**: `portal_dev` collection: `users`
- **User Model**: Enhanced with security fields
- **Location**: `src/portal/portal-backend/src/models/User.ts`
- **Current Schema**:

```typescript
interface IUser extends Document {
  email: string;
  password: string;
  lastLoginAt?: Date | null;
  failedLoginAttempts?: number | null;
  lockUntil?: Date | null;
  refreshTokenHash?: string | null;
  // Future: PQC public keys, consent links, etc.
}
```

## Migration Objectives

### Primary Goals
1. **Unified Data Storage**: Single MongoDB instance for both services
2. **Zero Data Loss**: Preserve all existing user data during migration
3. **Enhanced Security**: Add PQC-specific fields to User model
4. **Service Interoperability**: Enable cross-service user authentication
5. **Test Continuity**: Maintain 57/57 E2E test success rate

### Success Metrics
- [ ] 100% data migration accuracy
- [ ] Zero service downtime during migration
- [ ] All existing Portal Backend functionality preserved
- [ ] QynAuth successfully integrated with MongoDB
- [ ] 57/57 E2E tests continue passing

## Enhanced User Schema Design

### Updated User Model for PQC Integration

```typescript
/**
 * Enhanced User interface for NIST PQC integration
 * Extends existing Portal Backend User model
 */
export interface IUser extends Document {
  // Existing Portal Backend fields
  email: string;
  password: string;
  lastLoginAt?: Date | null;
  failedLoginAttempts?: number | null;
  lockUntil?: Date | null;
  refreshTokenHash?: string | null;
  
  // NEW: Post-Quantum Cryptography fields
  pqcPublicKey?: string | null;           // Base64-encoded Kyber-768 public key
  pqcKeyId?: string | null;               // Unique identifier for PQC key pair
  pqcSignaturePublicKey?: string | null;  // Base64-encoded Dilithium-3 public key
  pqcEnabled?: boolean;                   // Flag to enable/disable PQC for user
  classicalFallback?: boolean;            // Allow fallback to classical crypto
  pqcKeyGeneratedAt?: Date | null;        // Timestamp of key generation
  pqcKeyExpiresAt?: Date | null;          // Key expiration for rotation
  
  // NEW: Service integration fields
  qynAuthUserId?: string | null;          // Cross-reference to QynAuth user ID
  consentRecords?: string[];              // Array of consent record IDs
  
  // Existing timestamps (from Mongoose)
  createdAt: Date;
  updatedAt: Date;
}
```

### MongoDB Schema Updates

```typescript
// Updated UserSchema with PQC fields
export const UserSchema = new Schema<IUser>(
  {
    // Existing fields...
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    refreshTokenHash: { type: String, default: null, select: false },
    
    // NEW: PQC-specific fields
    pqcPublicKey: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string) {
          // Validate base64 encoding and key length for Kyber-768
          return !v || /^[A-Za-z0-9+/]*={0,2}$/.test(v);
        },
        message: 'PQC public key must be valid base64'
      }
    },
    pqcKeyId: {
      type: String,
      default: null,
      unique: true,
      sparse: true  // Allow multiple null values
    },
    pqcSignaturePublicKey: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string) {
          // Validate base64 encoding for Dilithium-3
          return !v || /^[A-Za-z0-9+/]*={0,2}$/.test(v);
        },
        message: 'PQC signature public key must be valid base64'
      }
    },
    pqcEnabled: { type: Boolean, default: false },
    classicalFallback: { type: Boolean, default: true },
    pqcKeyGeneratedAt: { type: Date, default: null },
    pqcKeyExpiresAt: { 
      type: Date, 
      default: null,
      validate: {
        validator: function(v: Date) {
          // Ensure expiration is in the future
          return !v || v > new Date();
        },
        message: 'PQC key expiration must be in the future'
      }
    },
    
    // NEW: Service integration fields
    qynAuthUserId: {
      type: String,
      default: null,
      unique: true,
      sparse: true
    },
    consentRecords: [{
      type: Schema.Types.ObjectId,
      ref: 'Consent'
    }]
  },
  {
    timestamps: true,
    collection: 'users',
    // Add indexes for PQC fields
    indexes: [
      { pqcKeyId: 1 },
      { qynAuthUserId: 1 },
      { pqcEnabled: 1, classicalFallback: 1 }
    ]
  }
);
```

## Migration Implementation Strategy

### Phase 1: Database Schema Migration (Week 1)

#### Step 1.1: Create Migration Scripts
**File**: `src/integration/migration-scripts/001-add-pqc-fields.js`

```javascript
// MongoDB migration script to add PQC fields to existing users
db.users.updateMany(
  {},
  {
    $set: {
      pqcPublicKey: null,
      pqcKeyId: null,
      pqcSignaturePublicKey: null,
      pqcEnabled: false,
      classicalFallback: true,
      pqcKeyGeneratedAt: null,
      pqcKeyExpiresAt: null,
      qynAuthUserId: null,
      consentRecords: []
    }
  }
);

// Create indexes for performance
db.users.createIndex({ "pqcKeyId": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "qynAuthUserId": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "pqcEnabled": 1, "classicalFallback": 1 });
```

#### Step 1.2: Backup Strategy
```bash
#!/bin/bash
# Pre-migration backup script
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup Portal Backend database
mongodump --host localhost:27017 --db portal_dev --out $BACKUP_DIR/portal_backup

# Backup QynAuth in-memory data (if any persistent state exists)
# This will be minimal since QynAuth currently uses in-memory storage

echo "Backup completed: $BACKUP_DIR"
```

#### Step 1.3: Rollback Procedures
```javascript
// Rollback script to remove PQC fields if migration fails
db.users.updateMany(
  {},
  {
    $unset: {
      pqcPublicKey: "",
      pqcKeyId: "",
      pqcSignaturePublicKey: "",
      pqcEnabled: "",
      classicalFallback: "",
      pqcKeyGeneratedAt: "",
      pqcKeyExpiresAt: "",
      qynAuthUserId: "",
      consentRecords: ""
    }
  }
);

// Drop PQC indexes
db.users.dropIndex({ "pqcKeyId": 1 });
db.users.dropIndex({ "qynAuthUserId": 1 });
db.users.dropIndex({ "pqcEnabled": 1, "classicalFallback": 1 });
```

### Phase 2: QynAuth MongoDB Integration (Week 2)

#### Step 2.1: Replace In-Memory Storage
**File**: `src/python_app/app/database.py` (NEW)

```python
"""
MongoDB integration for QynAuth service
Replaces in-memory user storage with persistent MongoDB
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class QynAuthDatabase:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.users_collection = None
        
    async def connect(self):
        """Connect to MongoDB instance shared with Portal Backend"""
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/portal_dev')
        self.client = AsyncIOMotorClient(mongodb_uri)
        self.db = self.client.get_default_database()
        self.users_collection = self.db.users
        
        # Test connection
        await self.client.admin.command('ping')
        logger.info("Connected to MongoDB successfully")
        
    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user with PQC fields"""
        try:
            # Add QynAuth-specific fields
            user_data.update({
                'qynAuthUserId': user_data.get('user_id'),
                'pqcEnabled': user_data.get('pqc_enabled', False),
                'classicalFallback': True,  # Always enable fallback initially
                'failedLoginAttempts': 0,
                'lockUntil': None,
                'lastLoginAt': None
            })
            
            result = await self.users_collection.insert_one(user_data)
            user_data['_id'] = result.inserted_id
            return user_data
            
        except DuplicateKeyError as e:
            logger.error(f"User creation failed - duplicate key: {e}")
            raise ValueError("Email already exists")
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by email address"""
        return await self.users_collection.find_one({'email': email})
    
    async def get_user_by_qynauth_id(self, qynauth_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by QynAuth user ID"""
        return await self.users_collection.find_one({'qynAuthUserId': qynauth_id})
    
    async def update_user_pqc_keys(self, email: str, pqc_data: Dict[str, Any]) -> bool:
        """Update user's PQC keys and metadata"""
        result = await self.users_collection.update_one(
            {'email': email},
            {
                '$set': {
                    'pqcPublicKey': pqc_data.get('public_key'),
                    'pqcKeyId': pqc_data.get('key_id'),
                    'pqcSignaturePublicKey': pqc_data.get('signature_public_key'),
                    'pqcEnabled': True,
                    'pqcKeyGeneratedAt': pqc_data.get('generated_at'),
                    'pqcKeyExpiresAt': pqc_data.get('expires_at')
                }
            }
        )
        return result.modified_count > 0
    
    async def update_login_attempt(self, email: str, success: bool) -> None:
        """Update user login attempt tracking"""
        if success:
            await self.users_collection.update_one(
                {'email': email},
                {
                    '$set': {
                        'lastLoginAt': datetime.utcnow(),
                        'failedLoginAttempts': 0,
                        'lockUntil': None
                    }
                }
            )
        else:
            # Increment failed attempts and potentially lock account
            user = await self.get_user_by_email(email)
            if user:
                failed_attempts = user.get('failedLoginAttempts', 0) + 1
                update_data = {'failedLoginAttempts': failed_attempts}
                
                # Lock account after 5 failed attempts
                if failed_attempts >= 5:
                    lock_until = datetime.utcnow() + timedelta(minutes=30)
                    update_data['lockUntil'] = lock_until
                
                await self.users_collection.update_one(
                    {'email': email},
                    {'$set': update_data}
                )

# Global database instance
db = QynAuthDatabase()
```

### Phase 3: E2E Test Integration (Week 3)

#### Step 3.1: Enhanced E2E Test Setup
**File**: `src/integration/test-fixtures/pqc-e2e-setup.ts`

```typescript
/**
 * Enhanced E2E test setup for PQC integration
 * Extends existing Portal Backend E2E test patterns
 */
import { MongoClient, Db, Collection } from 'mongodb';
import * as bcrypt from 'bcrypt';

interface PQCTestUser {
  _id?: string;
  email: string;
  password: string;
  isActive: boolean;
  pqcEnabled: boolean;
  pqcPublicKey?: string;
  pqcKeyId?: string;
  qynAuthUserId: string;
  classicalFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PQCTestSetup {
  private client: MongoClient;
  private db: Db;
  private readonly testUserId = '60d5ec49f1a23c001c8a4d7d';
  private readonly testUserEmail = 'pqc-e2e-test@example.com';
  private readonly testUserPassword = 'PQCTestPassword123!';

  constructor(mongoUri: string, dbName: string = 'portal_test') {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
  }

  async seedPQCTestUser(): Promise<PQCTestUser> {
    const usersCollection: Collection<PQCTestUser> = this.db.collection('users');

    const hashedPassword = await bcrypt.hash(this.testUserPassword, 10);

    const pqcTestUser: PQCTestUser = {
      email: this.testUserEmail,
      password: hashedPassword,
      isActive: true,
      pqcEnabled: true,
      pqcPublicKey: 'mock-kyber-768-public-key-base64',
      pqcKeyId: 'test-pqc-key-id-2025',
      qynAuthUserId: this.testUserId,
      classicalFallback: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.deleteMany({ email: this.testUserEmail });

    const result = await usersCollection.insertOne({
      ...pqcTestUser,
      _id: this.testUserId as any,
    });

    return { ...pqcTestUser, _id: result.insertedId.toString() };
  }

  async validatePQCIntegration(): Promise<boolean> {
    const usersCollection = this.db.collection('users');
    
    // Verify PQC fields exist
    const pqcUser = await usersCollection.findOne({
      email: this.testUserEmail,
      pqcEnabled: true,
      pqcPublicKey: { $exists: true },
      qynAuthUserId: { $exists: true }
    });

    return pqcUser !== null;
  }
}
```

## Migration Execution Plan

### Pre-Migration Checklist
- [ ] Complete backup of Portal Backend database
- [ ] QynAuth service updated with MongoDB integration
- [ ] Migration scripts tested in development environment
- [ ] Rollback procedures validated
- [ ] E2E test suite updated for new schema

### Migration Timeline

#### Week 1: Schema Preparation
- **Day 1-2**: Create and test migration scripts
- **Day 3**: Update Portal Backend User model with PQC fields
- **Day 4**: Create database indexes and constraints
- **Day 5**: Validate schema changes in development

#### Week 2: Service Integration
- **Day 1-3**: Implement QynAuth MongoDB integration
- **Day 4**: Update QynAuth API endpoints for database operations
- **Day 5**: Test QynAuth service with MongoDB

#### Week 3: Data Migration and Testing
- **Day 1**: Execute production database migration
- **Day 2**: Migrate existing users to new schema
- **Day 3-4**: Comprehensive integration testing
- **Day 5**: Validate E2E test suite (maintain 57/57 success rate)

### Migration Commands

#### Development Environment
```bash
# 1. Start MongoDB and services
docker-compose up -d mongo
docker-compose up -d backend

# 2. Run schema migration
node src/integration/migration-scripts/001-add-pqc-fields.js

# 3. Migrate existing users
python src/integration/migration-scripts/migrate-existing-users.py

# 4. Validate migration
python src/integration/migration-scripts/validate-migration.py

# 5. Start QynAuth with MongoDB integration
cd ../qynauth && python -m uvicorn src.python_app.app.main:app --reload

# 6. Run integration tests
pytest src/integration/test-fixtures/integration-tests.py -v
```

## Risk Mitigation

### Data Loss Prevention
- **Automated Backups**: Full database backup before migration
- **Transaction Safety**: Use MongoDB transactions for atomic operations
- **Validation Scripts**: Comprehensive data integrity checks
- **Rollback Capability**: Tested rollback procedures within 1 hour

### Service Availability
- **Blue-Green Deployment**: Maintain service availability during migration
- **Health Checks**: Continuous monitoring of service health
- **Circuit Breakers**: Automatic fallback to classical authentication
- **Gradual Rollout**: Phased migration with percentage-based traffic routing

### Performance Impact
- **Index Optimization**: Pre-create indexes to avoid performance degradation
- **Connection Pooling**: Optimize MongoDB connection management
- **Query Optimization**: Ensure efficient database queries
- **Load Testing**: Validate performance under expected load

## Success Criteria

### Technical Success
- [ ] Zero data loss during migration
- [ ] All services operational with MongoDB integration
- [ ] PQC authentication working correctly
- [ ] Classical fallback functioning properly
- [ ] Performance within acceptable limits

### Business Success
- [ ] 57/57 E2E tests continue passing
- [ ] No user-facing service disruptions
- [ ] Authentication success rate maintained
- [ ] Compliance requirements met
- [ ] Team trained and confident with new system

## Compliance Mappings

### GDPR Compliance
- **Article 25**: Data protection by design and by default
- **Article 30**: Records of processing activities
- **Article 32**: Security of processing

### NIST SP 800-53 Controls
- **IA-5**: Authenticator Management
- **SC-8**: Transmission Confidentiality and Integrity
- **SI-7**: Software, Firmware, and Information Integrity

### ISO/IEC 27701 Controls
- **7.2.1**: Identifying the legal basis
- **7.3.2**: Data minimization
- **7.4.1**: Consent

## Conclusion

This database migration strategy provides a comprehensive approach to transitioning QynAuth from in-memory storage to shared MongoDB architecture while implementing NIST Post-Quantum Cryptography capabilities. The phased approach, comprehensive testing, and robust rollback procedures ensure minimal risk and maximum success probability.

**Next Steps**:
1. Review and approve migration strategy
2. Set up development environment for testing
3. Execute migration scripts in staging
4. Validate integration with comprehensive testing
5. Plan production migration timeline

---

**Document Status**: Ready for Review  
**Approval Required**: Database Team, Security Team, DevOps Team  
**Implementation Timeline**: Weeks 1-3 of WBS execution plan
