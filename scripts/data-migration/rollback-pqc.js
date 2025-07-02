const { MongoClient } = require('mongodb');

async function rollbackPQC() {
  const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI || (() => { throw new Error('MongoDB URI is required. Set MONGODB_URI or MONGO_URI environment variable.'); })());
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const consents = db.collection('consents');
    
    const filter = { isPQCProtected: true };
    const documentsToRollback = await consents.find(filter).toArray();
    
    console.log(`Found ${documentsToRollback.length} documents to rollback`);
    
    let rolledBack = 0;
    let failed = 0;
    
    for (const doc of documentsToRollback) {
      try {
        await consents.updateOne(
          { _id: doc._id },
          {
            $set: {
              isPQCProtected: false,
              protectionMode: 'classical'
            },
            $unset: {
              encryptedConsentData: 1,
              dataIntegrity: 1,
              pqcMetadata: 1
            }
          }
        );
        rolledBack++;
        
        if (rolledBack % 100 === 0) {
          console.log(`Rolled back ${rolledBack} documents...`);
        }
      } catch (error) {
        console.error(`Failed to rollback document ${doc._id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`Rollback completed: ${rolledBack} rolled back, ${failed} failed`);
  } catch (error) {
    console.error('Rollback failed:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  rollbackPQC().catch(console.error);
}

module.exports = { rollbackPQC };
