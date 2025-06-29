const { MongoClient } = require('mongodb');

async function migrateToPQC() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/quantum-safe-portal');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const consents = db.collection('consents');
    
    const filter = { isPQCProtected: { $ne: true } };
    const documentsToMigrate = await consents.find(filter).toArray();
    
    console.log(`Found ${documentsToMigrate.length} documents to migrate`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const doc of documentsToMigrate) {
      try {
        await consents.updateOne(
          { _id: doc._id },
          {
            $set: {
              isPQCProtected: true,
              protectionMode: 'pqc',
              'pqcMetadata.encryptionAlgorithm': 'AES-256-GCM',
              'pqcMetadata.protectionLevel': 'enhanced',
              'pqcMetadata.migratedAt': new Date()
            }
          }
        );
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`Migrated ${migrated} documents...`);
        }
      } catch (error) {
        console.error(`Failed to migrate document ${doc._id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`Migration completed: ${migrated} migrated, ${failed} failed`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migrateToPQC().catch(console.error);
}

module.exports = { migrateToPQC };
