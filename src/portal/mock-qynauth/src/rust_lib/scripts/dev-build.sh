#!/bin/bash
set -e

echo "Building PQC library for development..."

cargo build --features kyber768,dilithium3

cargo test --features kyber768,dilithium3

echo "Development build complete!"
