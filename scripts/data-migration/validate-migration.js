const { MongoClient } = require('mongodb');

async function validateMigration() {
  const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI || (() => { throw new Error('MongoDB URI is required. Set MONGODB_URI or MONGO_URI environment variable.'); })());
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const consents = db.collection('consents');
    
    const totalConsents = await consents.countDocuments();
    const pqcProtectedConsents = await consents.countDocuments({ isPQCProtected: true });
    const classicalConsents = await consents.countDocuments({ protectionMode: 'classical' });
    const hybridConsents = await consents.countDocuments({ protectionMode: 'hybrid' });
    
    console.log('=== Migration Validation Report ===');
    console.log(`Total consents: ${totalConsents}`);
    console.log(`PQC protected: ${pqcProtectedConsents}`);
    console.log(`Classical mode: ${classicalConsents}`);
    console.log(`Hybrid mode: ${hybridConsents}`);
    console.log(`Migration coverage: ${(pqcProtectedConsents / totalConsents * 100).toFixed(2)}%`);
    
    const integrityIssues = await consents.countDocuments({
      isPQCProtected: true,
      'dataIntegrity.validationStatus': 'invalid'
    });
    
    console.log(`Data integrity issues: ${integrityIssues}`);
    
    const recentMigrations = await consents.countDocuments({
      'pqcMetadata.migratedAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    console.log(`Recent migrations (24h): ${recentMigrations}`);
    
    if (integrityIssues > 0) {
      console.warn('⚠️  Data integrity issues detected!');
    } else {
      console.log('✅ No data integrity issues found');
    }
    
    console.log('=== End Report ===');
    
  } catch (error) {
    console.error('Validation failed:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  validateMigration().catch(console.error);
}

module.exports = { validateMigration };
