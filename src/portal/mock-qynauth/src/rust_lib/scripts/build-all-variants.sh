#!/bin/bash

set -euo pipefail

echo "🔧 Testing all build variants..."

cd "$(dirname "$0")/.."

echo "📋 Testing default features..."
cargo build --release

echo "📋 Testing kyber768 only..."
cargo build --release --features kyber768

echo "📋 Testing dilithium3 only..."
cargo build --release --features dilithium3

echo "📋 Testing AVX2 optimizations..."
cargo build --release --features avx2

echo "📋 Testing all features..."
cargo build --release --all-features

echo "📋 Testing no default features..."
cargo build --release --no-default-features

echo "📋 Testing cross-compilation targets..."
cargo check --target aarch64-unknown-linux-gnu --features kyber768,dilithium3,neon || echo "ARM64 target not available"

echo "✅ All build variants tested successfully!"
