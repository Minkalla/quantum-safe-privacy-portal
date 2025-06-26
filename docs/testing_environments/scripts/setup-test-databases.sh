#!/bin/bash
set -e

echo "Setting up PQC testing databases..."

create_test_database() {
    local db_name=$1
    
    if [[ ! "$db_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
        echo "ERROR: Invalid database name '$db_name'. Only alphanumeric characters and underscores allowed."
        return 1
    fi
    
    mongosh "mongodb://localhost:27017/$db_name" --eval "
        db.users.createIndex({ 'email': 1 }, { unique: true });
        db.consents.createIndex({ 'user_id': 1 });
        db.pqc_keys.createIndex({ 'key_id': 1 }, { unique: true });
        
        print('Database created successfully');
    "
}

create_test_database "pqc_test_dev_db"
create_test_database "pqc_test_integration_db"

echo "All testing databases created successfully!"
