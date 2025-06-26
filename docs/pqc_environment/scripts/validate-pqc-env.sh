#!/bin/bash
set -e

echo "Validating PQC development environment..."

echo "Checking Rust toolchain..."
rustc --version
cargo --version

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
