/**
 * @file e2e-setup.ts
 * @description E2E test setup utilities for seeding MongoDB Atlas with test data
 * Provides functions to create test users and consent records for E2E testing
 */

import { MongoClient, Db, Collection } from 'mongodb';
import * as bcrypt from 'bcrypt';

interface TestUser {
  _id?: string;
  email: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TestConsent {
  _id?: string;
  userId: string;
  consentType: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class E2ETestSetup {
  private client: MongoClient;
  private db: Db;
  private readonly testUserId = '60d5ec49f1a23c001c8a4d7d';
  private readonly testUserEmail = 'e2e-test@example.com';
  private readonly testUserPassword = 'TestPassword123!';

  constructor(mongoUri: string, dbName: string = 'quantum-safe-privacy-portal-test') {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('Connected to MongoDB for E2E test setup');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  async seedTestUser(): Promise<TestUser> {
    const usersCollection: Collection<TestUser> = this.db.collection('users');
    
    const hashedPassword = await bcrypt.hash(this.testUserPassword, 10);
    
    const testUser: TestUser = {
      email: this.testUserEmail,
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.deleteMany({ email: this.testUserEmail });
    
    const result = await usersCollection.insertOne({
      ...testUser,
      _id: this.testUserId as any,
    });

    console.log(`Test user created with ID: ${result.insertedId}`);
    return { ...testUser, _id: result.insertedId.toString() };
  }

  async seedTestConsent(consentType: string = 'marketing', granted: boolean = true): Promise<TestConsent> {
    const consentsCollection: Collection<TestConsent> = this.db.collection('consents');
    
    const testConsent: TestConsent = {
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

  async cleanupTestData(): Promise<void> {
    const usersCollection: Collection<TestUser> = this.db.collection('users');
    const consentsCollection: Collection<TestConsent> = this.db.collection('consents');
    
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

  async setupCompleteTestEnvironment(): Promise<{
    user: TestUser;
    consent: TestConsent;
    credentials: { email: string; password: string; userId: string };
  }> {
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

export const setupE2EEnvironment = async (mongoUri?: string) => {
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const setup = new E2ETestSetup(uri);
  
  return await setup.setupCompleteTestEnvironment();
};

export const cleanupE2EEnvironment = async (mongoUri?: string) => {
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const setup = new E2ETestSetup(uri);
  
  await setup.connect();
  await setup.cleanupTestData();
  await setup.disconnect();
};
