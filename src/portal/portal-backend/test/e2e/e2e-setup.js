const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

class E2ETestSetup {
  constructor(mongoUri, dbName = 'e2e_test_db') {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.testUserId = new ObjectId('60d5ec49f1a23c001c8a4d7d');
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
    console.log('🌱 Seeding test user...');
    const usersCollection = this.db.collection('users');
    
    console.log('🔐 Hashing password with bcryptjs...');
    const hashedPassword = await bcrypt.hash(this.testUserPassword, 10);
    console.log('✅ Password hashed successfully, length:', hashedPassword.length);
    console.log('🔑 Password hash starts with:', hashedPassword.substring(0, 10) + '...');
    
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

    console.log('👤 Creating test user with structure:', JSON.stringify({
      ...testUser,
      password: '[REDACTED]'
    }, null, 2));

    await usersCollection.deleteMany({ email: this.testUserEmail });
    console.log('🗑️ Cleaned up existing test users');
    
    const result = await usersCollection.insertOne({
      ...testUser,
      _id: this.testUserId,
    });

    console.log(`✅ Test user created with ID: ${result.insertedId}`);
    
    const createdUser = await usersCollection.findOne({ email: this.testUserEmail });
    console.log('🔍 Verification - User found in database:', createdUser ? 'YES' : 'NO');
    if (createdUser) {
      console.log('📋 User fields present:', Object.keys(createdUser));
      console.log('🔑 Password hash in DB starts with:', createdUser.password ? createdUser.password.substring(0, 10) + '...' : 'MISSING');
      console.log('🆔 User ID type:', typeof createdUser._id, 'Value:', createdUser._id);
    }
    
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
    
    console.log('🧹 Starting comprehensive test data cleanup...');
    
    const userDeleteResult = await usersCollection.deleteMany({ email: this.testUserEmail });
    console.log(`🗑️ Deleted ${userDeleteResult.deletedCount} test users`);
    
    const consentDeleteResult = await consentsCollection.deleteMany({ 
      $or: [
        { userId: this.testUserId },
        { userId: this.testUserId.toString() }
      ]
    });
    console.log(`🗑️ Deleted ${consentDeleteResult.deletedCount} test consents`);
    
    const remainingConsents = await consentsCollection.countDocuments({});
    console.log(`📊 Remaining consents in database: ${remainingConsents}`);
    
    if (remainingConsents > 0) {
      console.log('⚠️ Warning: Non-test consents remain in database');
      const allConsents = await consentsCollection.find({}).toArray();
      console.log('📋 All remaining consents:', allConsents.map(c => ({ 
        id: c._id, 
        userId: c.userId, 
        type: c.consentType 
      })));
    }
    
    console.log('✅ Test data cleanup completed');
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
