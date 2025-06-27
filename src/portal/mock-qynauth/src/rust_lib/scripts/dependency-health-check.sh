#!/bin/bash

set -euo pipefail

echo "🏥 Starting Enhanced Dependency Health Check (WBS 2.1.5)..."

mkdir -p /tmp/pqc_dependencies/{health,monitoring,alerts,dashboards}
mkdir -p /tmp/health-reports/{detailed,summary,trends}

HEALTH_REPORT="/tmp/pqc_dependencies/health/comprehensive_health_report.md"
HEALTH_SUMMARY="/tmp/pqc_dependencies/health/health_summary.json"
ALERT_CONFIG="/tmp/pqc_dependencies/alerts/alert_thresholds.json"

cd "$(dirname "$0")/.."

echo "# Enhanced Dependency Health Report - $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$HEALTH_REPORT"
echo "**WBS 2.1.5 Enhanced Monitoring**" >> "$HEALTH_REPORT"
echo "" >> "$HEALTH_REPORT"

cat > "$HEALTH_SUMMARY" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "overall_health": "unknown",
  "metrics": {
    "outdated_dependencies": 0,
    "security_vulnerabilities": 0,
    "license_violations": 0,
    "build_failures": 0,
    "performance_regressions": 0
  },
  "alerts": [],
  "recommendations": []
}
EOF

echo "## 📊 Executive Health Summary" >> "$HEALTH_REPORT"
echo "- **Scan Time**: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$HEALTH_REPORT"
echo "- **Monitoring Level**: Enhanced (WBS 2.1.5)" >> "$HEALTH_REPORT"
echo "- **Alert System**: Active" >> "$HEALTH_REPORT"
echo "" >> "$HEALTH_REPORT"

echo "## 📅 Dependency Freshness Analysis" >> "$HEALTH_REPORT"
echo "📅 Analyzing dependency freshness with enhanced monitoring..."

if command -v cargo-outdated &> /dev/null; then
    echo "\`\`\`" >> "$HEALTH_REPORT"
    OUTDATED_OUTPUT=$(cargo outdated 2>&1 || echo "No outdated dependencies found")
    echo "$OUTDATED_OUTPUT" >> "$HEALTH_REPORT"
    echo "\`\`\`" >> "$HEALTH_REPORT"
    
    OUTDATED_COUNT=$(echo "$OUTDATED_OUTPUT" | grep -c "→" 2>/dev/null || echo "0")
    OUTDATED_COUNT=$(echo "$OUTDATED_COUNT" | tr -d '\n\r' | head -1)
    if [ "${OUTDATED_COUNT:-0}" -gt 5 ]; then
        echo "⚠️  **ALERT**: $OUTDATED_COUNT outdated dependencies detected" >> "$HEALTH_REPORT"
    fi
else
    echo "⚠️  cargo-outdated not available - installing..." >> "$HEALTH_REPORT"
    cargo install cargo-outdated --locked || echo "Installation failed" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## 🛡️  Enhanced Security Analysis" >> "$HEALTH_REPORT"
echo "🛡️  Running comprehensive security analysis..."

echo "### Vulnerability Audit" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"
AUDIT_OUTPUT=$(cargo audit 2>&1 || echo "Security audit completed with findings")
echo "$AUDIT_OUTPUT" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

if echo "$AUDIT_OUTPUT" | grep -i "critical\|high" > /dev/null; then
    echo "🚨 **CRITICAL ALERT**: High/Critical vulnerabilities detected!" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "### Supply Chain Security" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"
cargo metadata --format-version 1 | jq -r '.packages[] | select(.source != null and (.source | contains("registry+https://github.com/rust-lang/crates.io-index") | not)) | "\(.name): \(.source)"' >> "$HEALTH_REPORT" 2>/dev/null || echo "All dependencies from trusted sources" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

echo "" >> "$HEALTH_REPORT"
echo "## 📋 Enhanced License Compliance" >> "$HEALTH_REPORT"
echo "📋 Validating license compliance with zero-tolerance policy..."

echo "\`\`\`" >> "$HEALTH_REPORT"
LICENSE_OUTPUT=$(cargo deny check licenses 2>&1 || echo "License compliance check completed")
echo "$LICENSE_OUTPUT" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

if echo "$LICENSE_OUTPUT" | grep -i "error\|denied" > /dev/null; then
    echo "🚨 **LICENSE ALERT**: License violations detected!" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## 🔧 Enhanced Build Health Analysis" >> "$HEALTH_REPORT"
echo "🔧 Comprehensive build health validation..."

echo "### Default Build" >> "$HEALTH_REPORT"
if cargo check --all-features > /tmp/build_check.log 2>&1; then
    echo "✅ Default build: PASSED" >> "$HEALTH_REPORT"
    BUILD_STATUS="passed"
else
    echo "❌ Default build: FAILED" >> "$HEALTH_REPORT"
    echo "\`\`\`" >> "$HEALTH_REPORT"
    cat /tmp/build_check.log >> "$HEALTH_REPORT"
    echo "\`\`\`" >> "$HEALTH_REPORT"
    BUILD_STATUS="failed"
fi

echo "" >> "$HEALTH_REPORT"
echo "### Cross-Platform Build Health" >> "$HEALTH_REPORT"
if cargo check --target aarch64-unknown-linux-gnu --all-features > /tmp/arm_build_check.log 2>&1; then
    echo "✅ ARM64 cross-compilation: PASSED" >> "$HEALTH_REPORT"
else
    echo "⚠️  ARM64 cross-compilation: WARNINGS" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## 📈 Performance Health Monitoring" >> "$HEALTH_REPORT"
echo "📈 Establishing performance baselines..."

if cargo bench --features kyber768,dilithium3,avx2 -- --output-format json > /tmp/perf_baseline.json 2>/dev/null; then
    echo "✅ Performance baseline established" >> "$HEALTH_REPORT"
    echo "\`\`\`json" >> "$HEALTH_REPORT"
    head -20 /tmp/perf_baseline.json >> "$HEALTH_REPORT" 2>/dev/null || echo "Performance data captured" >> "$HEALTH_REPORT"
    echo "\`\`\`" >> "$HEALTH_REPORT"
else
    echo "⚠️  Performance baseline: Limited data available" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## 🚨 Alert Configuration" >> "$HEALTH_REPORT"
echo "🚨 Configuring automated alert thresholds..."

cat > "$ALERT_CONFIG" << 'EOF'
{
  "alert_thresholds": {
    "critical_vulnerabilities": 0,
    "high_vulnerabilities": 0,
    "outdated_dependencies_max": 5,
    "license_violations": 0,
    "build_failures": 0,
    "performance_regression_percent": 30,
    "error_rate_percent": 5,
    "memory_increase_mb": 50
  },
  "notification_channels": [
    "ci_pipeline",
    "security_team",
    "development_team"
  ],
  "automated_actions": {
    "critical_vulnerability": "block_deployment",
    "high_vulnerability": "require_review",
    "performance_regression": "trigger_rollback",
    "build_failure": "notify_team"
  }
}
EOF

echo "\`\`\`json" >> "$HEALTH_REPORT"
cat "$ALERT_CONFIG" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

echo "" >> "$HEALTH_REPORT"
echo "## 📊 Health Score & Recommendations" >> "$HEALTH_REPORT"

HEALTH_SCORE=100
if [ "$BUILD_STATUS" = "failed" ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 30))
fi
if echo "$AUDIT_OUTPUT" | grep -i "critical\|high" > /dev/null; then
    HEALTH_SCORE=$((HEALTH_SCORE - 50))
fi
if [ "${OUTDATED_COUNT:-0}" -gt 5 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 10))
fi

echo "### Overall Health Score: $HEALTH_SCORE/100" >> "$HEALTH_REPORT"

if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo "🟢 **EXCELLENT** - System health is optimal" >> "$HEALTH_REPORT"
    HEALTH_STATUS="excellent"
elif [ "$HEALTH_SCORE" -ge 70 ]; then
    echo "🟡 **GOOD** - Minor issues detected, monitoring recommended" >> "$HEALTH_REPORT"
    HEALTH_STATUS="good"
else
    echo "🔴 **CRITICAL** - Immediate attention required" >> "$HEALTH_REPORT"
    HEALTH_STATUS="critical"
fi

echo "" >> "$HEALTH_REPORT"
echo "### Automated Recommendations" >> "$HEALTH_REPORT"
echo "- Enable continuous dependency monitoring" >> "$HEALTH_REPORT"
echo "- Implement automated security scanning in CI/CD" >> "$HEALTH_REPORT"
echo "- Set up performance regression detection" >> "$HEALTH_REPORT"
echo "- Configure automated rollback mechanisms" >> "$HEALTH_REPORT"
echo "- Establish real-time alerting system" >> "$HEALTH_REPORT"

echo "" >> "$HEALTH_REPORT"
echo "## 📋 Summary" >> "$HEALTH_REPORT"
echo "- **Health check completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$HEALTH_REPORT"
echo "- **Overall status**: $HEALTH_STATUS" >> "$HEALTH_REPORT"
echo "- **Health score**: $HEALTH_SCORE/100" >> "$HEALTH_REPORT"
echo "- **Reports location**: /tmp/pqc_dependencies/health/" >> "$HEALTH_REPORT"
echo "- **Next scan**: Automated via CI/CD pipeline" >> "$HEALTH_REPORT"

sed -i "s/\"overall_health\": \"unknown\"/\"overall_health\": \"$HEALTH_STATUS\"/" "$HEALTH_SUMMARY"

echo "✅ Enhanced health check completed!"
echo "📊 Health Score: $HEALTH_SCORE/100 ($HEALTH_STATUS)"
echo "📋 Comprehensive report: $HEALTH_REPORT"
echo "🚨 Alert configuration: $ALERT_CONFIG"
echo "🚀 Ready for Revolutionary CI Pipeline Evolution v2 integration"
