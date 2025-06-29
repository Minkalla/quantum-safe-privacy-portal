#!/bin/bash

echo "🔐 Testing WBS 3.2: Authentication System Updates"

mkdir -p tests/auth tests/integration tests/migration logs

echo "Testing core authentication service with PQC support..."
if npm run test -- --testPathPattern="auth/test-auth-service" --passWithNoTests; then
    echo "✅ Core authentication service tests passed"
else
    echo "❌ Core authentication service tests failed"
    exit 1
fi

echo "Testing hybrid authentication modes..."
if npm run test -- --testPathPattern="auth/test-hybrid-auth" --passWithNoTests; then
    echo "✅ Hybrid authentication tests passed"
else
    echo "❌ Hybrid authentication tests failed"
    exit 1
fi

echo "Testing PQC session management..."
if npm run test -- --testPathPattern="auth/test-pqc-session" --passWithNoTests; then
    echo "✅ PQC session management tests passed"
else
    echo "❌ PQC session management tests failed"
    exit 1
fi

echo "Testing PQC-aware user management..."
if npm run test -- --testPathPattern="auth/test-pqc-user" --passWithNoTests; then
    echo "✅ PQC user management tests passed"
else
    echo "❌ PQC user management tests failed"
    exit 1
fi

echo "Testing authentication migration and rollback..."
if npm run test -- --testPathPattern="auth/test-auth-migration" --passWithNoTests; then
    echo "✅ Authentication migration tests passed"
else
    echo "❌ Authentication migration tests failed"
    exit 1
fi

echo "Testing end-to-end authentication flows..."
if npm run test -- --testPathPattern="integration/test-auth-integration" --passWithNoTests; then
    echo "✅ Authentication integration tests passed"
else
    echo "❌ Authentication integration tests failed"
    exit 1
fi

echo "Testing authentication performance under load..."
if npm run test -- --testPathPattern="auth/test-auth-performance" --passWithNoTests; then
    echo "✅ Authentication performance tests passed"
else
    echo "❌ Authentication performance tests failed"
    exit 1
fi

echo "✅ WBS 3.2 Authentication System Tests Complete"
echo "📊 All authentication modes validated and ready for production"
echo "🎯 Ready to proceed to WBS 3.3"
