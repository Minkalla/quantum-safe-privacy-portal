const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');

class E2ETestSetup {
  constructor(databaseUrl = 'postgresql://postgres:password@localhost:5432/portal_test') {
    this.dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [require('../../src/models/Consent').Consent],
      synchronize: true,
    });
    this.testUserId = '60d5ec49-f1a2-3c00-1c8a-4d7d12345678';
    this.testUserEmail = 'e2e-test@example.com';
    this.testUserPassword = 'TestPassword123!';
  }

  async connect() {
    await this.dataSource.initialize();
    console.log('Connected to PostgreSQL for E2E test setup');
  }

  async disconnect() {
    await this.dataSource.destroy();
    console.log('Disconnected from PostgreSQL');
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
    const { Consent } = require('../../src/models/Consent');
    const consentRepository = this.dataSource.getRepository(Consent);
    
    const testConsent = consentRepository.create({
      userId: this.testUserId,
      consentType,
      granted,
      ipAddress: '192.168.1.100',
      userAgent: 'E2E Test Browser/1.0',
    });

    await consentRepository.delete({ 
      userId: this.testUserId, 
      consentType 
    });
    
    const result = await consentRepository.save(testConsent);
    
    console.log(`Test consent created with ID: ${result.id}`);
    return result;
  }

  async cleanupTestData() {
    const { Consent } = require('../../src/models/Consent');
    const consentRepository = this.dataSource.getRepository(Consent);
    
    console.log('🧹 Starting comprehensive test data cleanup...');
    
    const consentDeleteResult = await consentRepository.delete({ 
      userId: this.testUserId
    });
    console.log(`🗑️ Deleted ${consentDeleteResult.affected || 0} test consents`);
    
    const remainingConsents = await consentRepository.count({});
    console.log(`📊 Remaining consents in database: ${remainingConsents}`);
    
    if (remainingConsents > 0) {
      console.log('⚠️ Warning: Non-test consents remain in database');
      const allConsents = await consentRepository.find({});
      console.log('📋 All remaining consents:', allConsents.map(c => ({ 
        id: c.id, 
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

const setupE2EEnvironment = async (databaseUrl) => {
  const url = databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/portal_test';
  const setup = new E2ETestSetup(url);
  
  return await setup.setupCompleteTestEnvironment();
};

const cleanupE2EEnvironment = async (databaseUrl) => {
  const url = databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/portal_test';
  const setup = new E2ETestSetup(url);
  
  await setup.connect();
  await setup.cleanupTestData();
  await setup.disconnect();
};

module.exports = {
  E2ETestSetup,
  setupE2EEnvironment,
  cleanupE2EEnvironment
};
