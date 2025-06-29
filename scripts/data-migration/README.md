# PQC Data Migration Scripts

This directory contains scripts for migrating existing data to Post-Quantum Cryptography (PQC) protection.

## Scripts

### migrate-to-pqc.js
Migrates existing consent data to PQC-protected format.

**Usage:**
```bash
MONGODB_URI=mongodb://localhost:27017/quantum-safe-portal node migrate-to-pqc.js
```

### rollback-pqc.js
Rolls back PQC protection from consent data.

**Usage:**
```bash
MONGODB_URI=mongodb://localhost:27017/quantum-safe-portal node rollback-pqc.js
```

### validate-migration.js
Validates the integrity of migrated PQC data.

**Usage:**
```bash
MONGODB_URI=mongodb://localhost:27017/quantum-safe-portal node validate-migration.js
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string (required)
- `BATCH_SIZE`: Number of documents to process in each batch (default: 100)
- `DRY_RUN`: Set to 'true' to perform a dry run without making changes (default: false)

## Safety Features

- All scripts include comprehensive error handling
- Batch processing to handle large datasets
- Progress logging for monitoring
- Rollback capabilities for safe migration
- Validation checks for data integrity

## Compliance

These scripts ensure compliance with:
- NIST SP 800-53 (SC-12, SC-13, SI-7)
- GDPR Article 30
- ISO/IEC 27701 (7.5.2)
