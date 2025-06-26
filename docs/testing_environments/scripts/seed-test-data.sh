#!/bin/bash
set -e

echo "Seeding PQC test databases with sample data..."

seed_database() {
    local db_name=$1
    local user_count=$2
    
    mongosh --eval "
        use $db_name;
        
        // Generate test users
        const users = [];
        for (let i = 1; i <= $user_count; i++) {
            users.push({
                email: \`testuser\${i}@example.com\`,
                pqc_key_id: 'pqc_key_' + i,
                test_data: true,
                created_at: new Date()
            });
        }
        db.users.insertMany(users);
        
        print('Database $db_name seeded successfully');
    "
}

seed_database "pqc_test_dev_db" 10
seed_database "pqc_test_integration_db" 100

echo "All databases seeded successfully!"
