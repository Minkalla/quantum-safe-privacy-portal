const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

class E2ETestSetup {
  constructor(mongoUri, dbName = 'e2e_test_db') {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.testUserId = '60d5ec49f1a23c001c8a4d7d';
    this.testUserEmail = 'e2e-test@example.com';
    this.testUserPassword = 'TestPassword123!';
  }

  async connect() {
    await this.client.connect();
    console.log('Connected to MongoDB for E2E test setup');
  }

  async disconnect() {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  async seedTestUser() {
    const usersCollection = this.db.collection('users');
    
    const hashedPassword = await bcrypt.hash(this.testUserPassword, 10);
    
    const testUser = {
      email: this.testUserEmail,
      password: hashedPassword,
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockUntil: null,
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.deleteMany({ email: this.testUserEmail });
    
    const result = await usersCollection.insertOne({
      ...testUser,
      _id: this.testUserId,
    });

    console.log(`Test user created with ID: ${result.insertedId}`);
    return { ...testUser, _id: result.insertedId.toString() };
  }

  async seedTestConsent(consentType = 'marketing', granted = true) {
    const consentsCollection = this.db.collection('consents');
    
    const testConsent = {
      userId: this.testUserId,
      consentType,
      granted,
      ipAddress: '192.168.1.100',
      userAgent: 'E2E Test Browser/1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await consentsCollection.deleteMany({ 
      userId: this.testUserId, 
      consentType 
    });
    
    const result = await consentsCollection.insertOne(testConsent);
    
    console.log(`Test consent created with ID: ${result.insertedId}`);
    return { ...testConsent, _id: result.insertedId.toString() };
  }

  async cleanupTestData() {
    const usersCollection = this.db.collection('users');
    const consentsCollection = this.db.collection('consents');
    
    await usersCollection.deleteMany({ email: this.testUserEmail });
    await consentsCollection.deleteMany({ userId: this.testUserId });
    
    console.log('Test data cleanup completed');
  }

  getTestCredentials() {
    return {
      email: this.testUserEmail,
      password: this.testUserPassword,
      userId: this.testUserId,
    };
  }

  async setupCompleteTestEnvironment() {
    await this.connect();
    
    try {
      await this.cleanupTestData();
      
      const user = await this.seedTestUser();
      const consent = await this.seedTestConsent();
      const credentials = this.getTestCredentials();
      
      return { user, consent, credentials };
    } catch (error) {
      console.error('Error setting up test environment:', error);
      throw error;
    }
  }
}

const setupE2EEnvironment = async (mongoUri) => {
  const uri = mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017';
  const setup = new E2ETestSetup(uri);
  
  return await setup.setupCompleteTestEnvironment();
};

const cleanupE2EEnvironment = async (mongoUri) => {
  const uri = mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017';
  const setup = new E2ETestSetup(uri);
  
  await setup.connect();
  await setup.cleanupTestData();
  await setup.disconnect();
};

module.exports = {
  E2ETestSetup,
  setupE2EEnvironment,
  cleanupE2EEnvironment
};
