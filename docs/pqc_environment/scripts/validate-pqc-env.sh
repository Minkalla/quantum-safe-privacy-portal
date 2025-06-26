#!/bin/bash
set -e

echo "Validating PQC development environment..."

echo "Checking Rust toolchain..."
rustc --version
cargo --version

echo "Checking Python environment..."
cd src/portal/mock-qynauth
if [ -d "venv" ]; then
    source venv/bin/activate
    python --version
    echo "Python virtual environment: ACTIVE"
else
    python3 --version
    echo "Python virtual environment: NOT FOUND (will be created during setup)"
fi

echo "Checking Node.js environment..."
cd ../portal-backend
node --version
npm --version

echo "Environment validation complete!"
