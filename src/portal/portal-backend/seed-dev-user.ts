import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || (() => { throw new Error('MongoDB URI is required. Set MONGODB_URI or MONGO_URI environment variable.'); })();
const dbName = 'portal_dev';

async function seedUser() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');

  const email = 'test@example.com';
  const password = 'supersecure';
  const hashed = await bcrypt.hash(password, 10);

  const existing = await users.findOne({ email });
  if (existing) {
    console.log('✅ Test user already exists.');
  } else {
    await users.insertOne({ email, password: hashed });
    console.log('🌱 Test user seeded:', email);
  }

  await client.close();
}

seedUser().catch(console.error);
