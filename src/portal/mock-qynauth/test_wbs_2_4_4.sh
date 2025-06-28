#!/bin/bash

echo "📊 Testing WBS 2.4.4: Security Monitoring and Alerting System"

mkdir -p tests/monitoring logs security_alerts

echo "Testing real-time security event detection..."
if python -m pytest tests/monitoring/test_security_event_detection.py -v --tb=short; then
    echo "✅ Security event detection tests passed"
else
    echo "❌ Security event detection tests failed"
    exit 1
fi

echo "Testing alerting system functionality..."
if python -m pytest tests/monitoring/test_alerting_system.py -v --tb=short; then
    echo "✅ Alerting system tests passed"
else
    echo "❌ Alerting system tests failed"
    exit 1
fi

echo "Testing monitoring performance and scalability..."
if (cd src/rust_lib && cargo test monitoring_performance --release --quiet); then
    echo "✅ Monitoring performance tests passed"
else
    echo "❌ Monitoring performance tests failed"
    exit 1
fi

echo "Testing log analysis and threat detection..."
if python -m pytest tests/monitoring/test_log_analysis.py -v --tb=short; then
    echo "✅ Log analysis tests passed"
else
    echo "❌ Log analysis tests failed"
    exit 1
fi

echo "Testing security dashboard and reporting..."
if python -m pytest tests/monitoring/test_security_dashboard.py -v --tb=short; then
    echo "✅ Security dashboard tests passed"
else
    echo "❌ Security dashboard tests failed"
    exit 1
fi

echo "Testing SIEM integration..."
if python -m pytest tests/monitoring/test_siem_integration.py -v --tb=short; then
    echo "✅ SIEM integration tests passed"
else
    echo "❌ SIEM integration tests failed"
    exit 1
fi

echo "Generating monitoring system report..."
python scripts/generate_monitoring_report.py > security_reports/wbs_2_4_4_report.md

echo "✅ WBS 2.4.4 Security Monitoring Tests Complete"
echo "📊 Monitoring report generated: security_reports/wbs_2_4_4_report.md"
echo "🎯 Ready to proceed to WBS 2.4.5"
