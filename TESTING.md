# Testing Guide

## PQC FFI Integration Testing

This guide provides detailed instructions for running and troubleshooting the PQC FFI verification tests.

## Overview

The `ffi-verification.test.ts` suite validates real TypeScript → Python → Rust FFI integration without any mocks or placeholders. This ensures that the complete cryptographic stack works correctly across all language boundaries.

## Prerequisites

### Environment Requirements

- **Python ≥ 3.8** with `which` module support
- **Node.js 18+** with pnpm/npm
- **Rust toolchain** with cargo build capabilities
- **MongoDB** (for auth service dependencies)

### Build Requirements

1. **Rust FFI Library**: Must be built before running tests
   ```bash
   cd src/portal/mock-qynauth/src/rust_lib
   cargo build --release
   ```

2. **Python Dependencies**: Ensure all Python modules are installed
   ```bash
   cd src/portal/mock-qynauth
   poetry install
   ```

## Running Tests

### Basic Test Execution

```bash
cd src/portal/portal-backend
PYTHON_PATH=$(which python3) pnpm test ffi-verification
```

### Advanced Test Options

```bash
# Run with explicit Jest command
npx jest src/portal/portal-backend/test/integration/pqc/ffi-verification.test.ts --runInBand

# Debug specific test case
npx jest ffi-verification.test.ts --testNamePattern="should verify that pqc_service_bridge.py uses pqc_ffi module"

# Run with verbose output
npx jest ffi-verification.test.ts --verbose --runInBand
```

## Troubleshooting Common Issues

### 1. Python Spawn Errors

**Error**: `spawn python3 ENOENT` or `spawn /bin/sh ENOENT`

**Solution**:
```bash
# Set explicit Python path
export PYTHON_PATH=$(which python3)
pnpm test ffi-verification

# Or use absolute path
export PYTHON_PATH=/usr/bin/python3
pnpm test ffi-verification
```

### 2. Python Import Errors

**Error**: `No module named 'pqc_service_bridge'`

**Root Cause**: Python can't locate the service bridge module

**Solution**:
- Verify the module exists: `ls src/portal/mock-qynauth/src/python_app/pqc_service_bridge.py`
- The test uses `sys.path.insert()` to add the correct path automatically
- Ensure you're running from the correct directory: `src/portal/portal-backend`

### 3. Contract Drift Issues

**Error**: Test failures with payload format mismatches

**Common Issues**:
- Missing `user_id` or `data_hash` in signing operations
- Incorrect error message expectations
- Performance metrics field name mismatches (`duration_ms` vs `generation_time_ms`)

**Solution**: Verify the test payload formats match the Python service bridge expectations in `pqc_service_bridge.py`

### 4. PQC Service Not Available

**Error**: `PQC service not available` responses

**Expected Behavior**: Tests should pass gracefully when the Rust library isn't built, but still validate the contract

**To Enable Real FFI**:
1. Build the Rust library: `cd src/portal/mock-qynauth/src/rust_lib && cargo build --release`
2. Ensure the shared library is accessible to Python's ctypes
3. Re-run tests to verify real cryptographic operations

### 5. Performance Test Failures

**Error**: Performance metrics assertions failing

**Check**:
- Verify `performance_metrics` object structure
- Confirm field names (`duration_ms` vs `generation_time_ms`)
- Ensure timing values are reasonable (> 0ms, < 5000ms)

## Test Validation Checklist

### Environment Setup
- [ ] Python ≥ 3.8 installed and accessible
- [ ] `which python3` returns valid path
- [ ] Node.js dependencies installed (`npm install`)
- [ ] MongoDB running (if required by auth service)

### Build Verification
- [ ] Rust library builds successfully: `cargo build --release`
- [ ] Python dependencies installed: `poetry install`
- [ ] No import errors when testing Python modules

### Test Execution
- [ ] All 6 tests pass: `pnpm test ffi-verification`
- [ ] No spawn errors or import failures
- [ ] Performance metrics within expected ranges
- [ ] Error scenarios handled correctly

## Expected Test Results

When all components are properly configured, you should see:

```
✓ should verify that pqc_service_bridge.py uses pqc_ffi module
✓ should perform complete TypeScript -> Python -> Rust FFI roundtrip for ML-DSA signing
✓ should verify ML-KEM session key generation uses real FFI
✓ should log complete FFI trace for audit purposes
✓ should handle invalid signatures properly with real verification
✓ should handle user ID mismatch with real FFI

Test Suites: 1 passed, 1 total
Tests: 6 passed, 6 total
```

## Debugging Tips

1. **Enable Verbose Logging**: Add `--verbose` flag to Jest commands
2. **Check Python Output**: Look for FFI verification output in test logs
3. **Verify File Paths**: Ensure all relative paths resolve correctly
4. **Test Individual Components**: Test Python bridge and Rust library separately
5. **Environment Variables**: Use `env` command to verify `PYTHON_PATH` setting

## Integration with CI/CD

For continuous integration environments:

```bash
# CI-friendly test command
export PYTHON_PATH=$(which python3)
cd src/portal/portal-backend
npm test -- --testPathPattern=ffi-verification --runInBand --verbose
```

## Support

If you encounter issues not covered in this guide:

1. Check the test output for specific error messages
2. Verify all prerequisites are met
3. Review the `ffi-verification.test.ts` file for recent changes
4. Consult the main README.md for general setup instructions
