#!/bin/bash

echo "🔒 Testing WBS 2.4.1: Security Hardening"

mkdir -p tests/security

echo "Testing memory zeroization..."
if (cd src/rust_lib && cargo test memory_zeroization --release --quiet); then
    echo "✅ Memory zeroization tests passed"
else
    echo "❌ Memory zeroization tests failed"
    exit 1
fi

echo "Testing input validation..."
if (cd src/rust_lib && cargo test input_validation --release --quiet); then
    echo "✅ Rust input validation tests passed"
else
    echo "❌ Rust input validation tests failed"
    exit 1
fi

if python -m pytest tests/security/test_input_validation.py -v --tb=short; then
    echo "✅ Python input validation tests passed"
else
    echo "❌ Python input validation tests failed"
    exit 1
fi

echo "Testing secure error handling..."
if (cd src/rust_lib && cargo test error_handling_security --release --quiet); then
    echo "✅ Error handling security tests passed"
else
    echo "❌ Error handling security tests failed"
    exit 1
fi

echo "Testing access controls..."
if python -m pytest tests/security/test_access_controls.py -v --tb=short; then
    echo "✅ Access control tests passed"
else
    echo "❌ Access control tests failed"
    exit 1
fi

echo "✅ WBS 2.4.1 Security Hardening Tests Complete"
echo "🎯 Ready to proceed to WBS 2.4.2"
