import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = 'mongodb://localhost:27017'; // Or use `mongo` if running inside container
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
