#!/bin/bash

set -euo pipefail

echo "🏥 Starting dependency health check..."

HEALTH_REPORT="/tmp/pqc_dependencies/health_report.md"
echo "# Dependency Health Report - $(date)" > "$HEALTH_REPORT"
echo "" >> "$HEALTH_REPORT"

echo "## Dependency Freshness" >> "$HEALTH_REPORT"
echo "📅 Checking dependency freshness..."

cd "$(dirname "$0")/.."

if command -v cargo-outdated &> /dev/null; then
    echo "\`\`\`" >> "$HEALTH_REPORT"
    cargo outdated >> "$HEALTH_REPORT" 2>&1 || echo "No outdated dependencies found" >> "$HEALTH_REPORT"
    echo "\`\`\`" >> "$HEALTH_REPORT"
else
    echo "cargo-outdated not available" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## Security Status" >> "$HEALTH_REPORT"
echo "🛡️  Checking security status..."

echo "\`\`\`" >> "$HEALTH_REPORT"
cargo audit >> "$HEALTH_REPORT" 2>&1 || echo "Security audit failed" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

echo "" >> "$HEALTH_REPORT"
echo "## License Compliance" >> "$HEALTH_REPORT"
echo "📋 Checking license compliance..."

echo "\`\`\`" >> "$HEALTH_REPORT"
cargo deny check licenses >> "$HEALTH_REPORT" 2>&1 || echo "License check failed" >> "$HEALTH_REPORT"
echo "\`\`\`" >> "$HEALTH_REPORT"

echo "" >> "$HEALTH_REPORT"
echo "## Build Status" >> "$HEALTH_REPORT"
echo "🔧 Checking build status..."

if cargo check --all-features >> "$HEALTH_REPORT" 2>&1; then
    echo "✅ Build check passed" >> "$HEALTH_REPORT"
else
    echo "❌ Build check failed" >> "$HEALTH_REPORT"
fi

echo "" >> "$HEALTH_REPORT"
echo "## Summary" >> "$HEALTH_REPORT"
echo "- Health check completed at $(date)" >> "$HEALTH_REPORT"
echo "- Report saved to $HEALTH_REPORT" >> "$HEALTH_REPORT"

echo "✅ Health check completed, report saved to $HEALTH_REPORT"
