#!/bin/bash

echo "⚡ Testing WBS 2.4.2: Performance Optimization"

mkdir -p benches tests/performance

echo "Running Rust performance benchmarks..."
if (cd src/rust_lib && cargo bench --bench pqc_performance 2>/dev/null); then
    echo "✅ Rust performance benchmarks completed"
else
    echo "❌ Rust performance benchmarks failed"
    exit 1
fi

echo "Testing FFI layer performance..."
if (cd src/rust_lib && cargo test ffi_performance --release --quiet); then
    echo "✅ FFI performance tests passed"
else
    echo "❌ FFI performance tests failed"
    exit 1
fi

echo "Testing Python layer performance..."
if python -m pytest tests/performance/test_python_performance.py -v --tb=short; then
    echo "✅ Python performance tests passed"
else
    echo "❌ Python performance tests failed"
    exit 1
fi

echo "Testing cross-layer integration performance..."
if python -m pytest tests/performance/test_integration_performance.py -v --tb=short; then
    echo "✅ Integration performance tests passed"
else
    echo "❌ Integration performance tests failed"
    exit 1
fi

echo "Testing memory usage optimization..."
if (cd src/rust_lib && cargo test memory_optimization --release --quiet); then
    echo "✅ Memory optimization tests passed"
else
    echo "❌ Memory optimization tests failed"
    exit 1
fi

echo "✅ WBS 2.4.2 Performance Optimization Tests Complete"
echo "🎯 Ready to proceed to WBS 2.4.3"
