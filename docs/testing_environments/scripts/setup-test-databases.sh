#!/bin/bash
set -e

echo "Setting up PQC testing databases..."

create_test_database() {
    local db_name=$1
    
    mongosh --eval "
        use $db_name;
        
        db.users.createIndex({ 'email': 1 }, { unique: true });
        db.consents.createIndex({ 'user_id': 1 });
        db.pqc_keys.createIndex({ 'key_id': 1 }, { unique: true });
        
        print('Database $db_name created successfully');
    "
}

create_test_database "pqc_test_dev_db"
create_test_database "pqc_test_integration_db"

echo "All testing databases created successfully!"
