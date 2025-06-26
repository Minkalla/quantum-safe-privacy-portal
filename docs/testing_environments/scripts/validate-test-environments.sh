#!/bin/bash
set -e

echo "Validating PQC testing environments..."

validate_environment() {
    local env_name=$1
    local db_name=$2
    
    echo "Validating $env_name environment..."
    
    if mongosh --eval "db.runCommand('ping')" mongodb://localhost:27017/$db_name > /dev/null 2>&1; then
        echo "✅ Database connectivity ($db_name): OK"
    else
        echo "❌ Database connectivity ($db_name): FAILED"
        return 1
    fi
    
    # Check if test collections exist
    local collections=$(mongosh --quiet --eval "use $db_name; db.getCollectionNames().join(',')" mongodb://localhost:27017/$db_name)
    if [[ "$collections" == *"users"* ]] && [[ "$collections" == *"consents"* ]] && [[ "$collections" == *"pqc_keys"* ]]; then
        echo "✅ Test collections ($db_name): OK"
    else
        echo "❌ Test collections ($db_name): MISSING"
        return 1
    fi
}

validate_environment "Development" "pqc_test_dev_db"
validate_environment "Integration" "pqc_test_integration_db"

echo "All testing environments validated successfully!"
