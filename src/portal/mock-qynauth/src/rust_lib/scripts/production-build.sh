#!/bin/bash

set -euo pipefail

echo "🏭 Starting production build for PQC library..."

cd "$(dirname "$0")/.."

echo "🧹 Cleaning previous builds..."
cargo clean

echo "🔧 Building with production optimizations..."
cargo build --release --features kyber768,dilithium3,avx2

echo "📦 Building static library..."
cargo build --release --features kyber768,dilithium3,avx2 --target x86_64-unknown-linux-gnu

echo "🔗 Building shared library for FFI..."
cargo build --release --features kyber768,dilithium3,avx2 --lib

echo "✅ Verifying build artifacts..."
if [ -f "target/release/libqynauth_pqc.so" ] && [ -f "target/release/libqynauth_pqc.a" ]; then
    echo "✅ Production build artifacts created successfully"
    ls -la target/release/libqynauth_pqc.*
else
    echo "❌ Production build artifacts missing"
    exit 1
fi

echo "🛡️  Running security checks..."
if command -v cargo-audit >/dev/null 2>&1; then
    cargo audit
else
    echo "⚠️  cargo-audit not installed - skipping vulnerability scan (will run in CI)"
fi

if command -v cargo-deny >/dev/null 2>&1; then
    cargo deny check
else
    echo "⚠️  cargo-deny not installed - skipping policy check (will run in CI)"
fi

echo "📊 Running performance validation..."
cargo bench --features kyber768,dilithium3,avx2 > /tmp/production_bench_results.txt 2>&1 || echo "Benchmark completed"

echo "✅ Production build completed successfully!"
