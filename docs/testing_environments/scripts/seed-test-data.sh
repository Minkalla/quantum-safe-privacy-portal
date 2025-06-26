#!/bin/bash
set -e

echo "Seeding PQC test databases with sample data..."

seed_database() {
    local db_name=$1
    local user_count=$2
    
    if [[ ! "$db_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
        echo "ERROR: Invalid database name '$db_name'. Only alphanumeric characters and underscores allowed."
        return 1
    fi
    
    if [[ ! "$user_count" =~ ^[0-9]+$ ]] || [ "$user_count" -le 0 ]; then
        echo "ERROR: Invalid user count '$user_count'. Must be a positive integer."
        return 1
    fi
    
    mongosh "mongodb://localhost:27017/$db_name" --eval "
        const userCount = $user_count;
        
        // Generate test users
        const users = [];
        for (let i = 1; i <= userCount; i++) {
            users.push({
                email: \`testuser\${i}@example.com\`,
                pqc_key_id: 'pqc_key_' + i,
                test_data: true,
                created_at: new Date()
            });
        }
        db.users.insertMany(users);
        
        print('Database seeded successfully');
    "
}

seed_database "pqc_test_dev_db" 10
seed_database "pqc_test_integration_db" 100

echo "All databases seeded successfully!"
