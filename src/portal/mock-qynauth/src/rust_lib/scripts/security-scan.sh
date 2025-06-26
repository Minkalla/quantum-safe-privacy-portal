#!/bin/bash

set -euo pipefail

echo "🔍 Starting PQC dependency security scan..."

cd "$(dirname "$0")/.."

if ! command -v cargo-audit &> /dev/null; then
    echo "📦 Installing cargo-audit..."
    cargo install cargo-audit
fi

if ! command -v cargo-deny &> /dev/null; then
    echo "📦 Installing cargo-deny..."
    cargo install cargo-deny
fi

echo "🛡️  Running vulnerability audit..."
cargo audit

echo "📋 Running dependency policy checks..."
cargo deny check

echo "📅 Checking for outdated dependencies..."
cargo outdated || echo "⚠️  cargo-outdated not installed, skipping..."

echo "📊 Generating dependency report..."
mkdir -p /tmp/pqc_dependencies
cargo tree --format "{p} {l}" > /tmp/pqc_dependencies/dependency_tree.txt

echo "🔧 Verifying build with all features..."
cargo check --all-features

echo "✅ Security scan completed successfully!"
