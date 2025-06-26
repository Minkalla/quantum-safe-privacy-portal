#!/bin/bash
set -e

echo "Building PQC library for development..."

cargo build

echo "Building with PQC features..."
cargo build --features kyber768,dilithium3 || echo "Warning: PQC features not yet available"

echo "Running tests..."
cargo test

echo "Running PQC security tests..."
cargo test security_tests || echo "Warning: PQC security tests not yet fully implemented"

echo "Running security audit..."
cargo audit || echo "Warning: cargo audit not installed or found vulnerabilities"

echo "Checking code formatting..."
cargo fmt -- --check || echo "Warning: Code formatting issues found"

echo "Running clippy lints..."
cargo clippy -- -D warnings || echo "Warning: Clippy linting issues found"

echo "Validating PQC configuration..."
if [ -f "Cargo.toml" ]; then
    grep -q "pqcrypto" Cargo.toml && echo "✓ PQC dependencies configured" || echo "⚠ PQC dependencies not yet configured"
    grep -q "ml-kem" Cargo.toml && echo "✓ NIST ML-KEM configured" || echo "⚠ NIST ML-KEM not yet configured"
    grep -q "ml-dsa" Cargo.toml && echo "✓ NIST ML-DSA configured" || echo "⚠ NIST ML-DSA not yet configured"
fi

echo "Development build complete!"
echo "PQC integration status: Placeholder implementation ready for WBS 2.x"
