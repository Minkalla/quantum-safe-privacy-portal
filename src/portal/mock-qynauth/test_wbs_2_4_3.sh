#!/bin/bash

echo "🛡️ Testing WBS 2.4.3: Vulnerability Assessment and Penetration Testing"

mkdir -p tests/security tests/penetration security_reports

echo "Running static security analysis..."
if (cd src/rust_lib && cargo audit --quiet && cargo clippy -- -D warnings); then
    echo "✅ Static security analysis passed"
else
    echo "❌ Static security analysis failed"
    exit 1
fi

echo "Running dynamic vulnerability tests..."
if python -m pytest tests/security/test_vulnerability_scanning.py -v --tb=short; then
    echo "✅ Dynamic vulnerability tests passed"
else
    echo "❌ Dynamic vulnerability tests failed"
    exit 1
fi

echo "Running penetration testing suite..."
if python -m pytest tests/penetration/test_penetration.py -v --tb=short; then
    echo "✅ Penetration testing suite passed"
else
    echo "❌ Penetration testing suite failed"
    exit 1
fi

echo "Testing cryptographic security..."
if (cd src/rust_lib && cargo test crypto_security_validation --release --quiet); then
    echo "✅ Cryptographic security tests passed"
else
    echo "❌ Cryptographic security tests failed"
    exit 1
fi

echo "Testing API security..."
if python -m pytest tests/security/test_api_security.py -v --tb=short; then
    echo "✅ API security tests passed"
else
    echo "❌ API security tests failed"
    exit 1
fi

echo "Testing memory safety..."
if (cd src/rust_lib && cargo test memory_safety --release --quiet); then
    echo "✅ Memory safety tests passed"
else
    echo "❌ Memory safety tests failed"
    exit 1
fi

echo "Generating security assessment report..."
python scripts/generate_security_report.py > security_reports/wbs_2_4_3_report.md

echo "✅ WBS 2.4.3 Vulnerability Assessment Tests Complete"
echo "📊 Security report generated: security_reports/wbs_2_4_3_report.md"
echo "🎯 Ready to proceed to WBS 2.4.4"
