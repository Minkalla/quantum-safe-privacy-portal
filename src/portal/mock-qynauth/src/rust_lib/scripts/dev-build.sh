#!/bin/bash
set -e

echo "Building PQC library for development..."

cargo build

cargo test

cargo audit || echo "Warning: cargo audit not installed or found vulnerabilities"

cargo fmt -- --check || echo "Warning: Code formatting issues found"

cargo clippy -- -D warnings || echo "Warning: Clippy linting issues found"

echo "Development build complete!"
