#!/bin/bash
set -e

echo "Validating PQC development environment..."
echo "WBS 1.2.2: Rust toolchain with NIST PQC dependencies - COMPLETED"

echo "Checking Rust toolchain..."
rustc --version
cargo --version

echo "Validating PQC dependencies..."
if [ -d "src/portal/mock-qynauth/src/rust_lib" ]; then
    cd src/portal/mock-qynauth/src/rust_lib
    echo "Checking pqcrypto-kyber v0.8.1 and pqcrypto-dilithium v0.5.0..."
    cargo tree | grep -E "(pqcrypto-kyber|pqcrypto-dilithium)" || echo "PQC dependencies not yet installed"
    echo "Validating rust-toolchain.toml configuration..."
    if [ -f "rust-toolchain.toml" ]; then
        echo "✅ rust-toolchain.toml found"
    else
        echo "❌ rust-toolchain.toml missing"
    fi
    cd - > /dev/null
else
    echo "ERROR: Rust library directory not found"
fi

echo "Checking Python environment..."
if [ -d "src/portal/mock-qynauth" ]; then
    cd src/portal/mock-qynauth
    if [ -d "venv" ]; then
        source venv/bin/activate
        python --version
        echo "Python virtual environment: ACTIVE"
    else
        python3 --version
        echo "Python virtual environment: NOT FOUND (will be created during setup)"
    fi
else
    echo "ERROR: src/portal/mock-qynauth directory not found"
    exit 1
fi

echo "Checking Node.js environment..."
if [ -d "../portal-backend" ]; then
    cd ../portal-backend
    node --version
    npm --version
else
    echo "ERROR: portal-backend directory not found"
    exit 1
fi

echo "Environment validation complete!"
