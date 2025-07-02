import { hashSync } from 'bcrypt';
import { connect, model, Schema } from 'mongoose';

(async () => {
  await connect(process.env.MONGO_URI || process.env.MONGODB_URI || (() => { throw new Error('MongoDB URI is required. Set MONGO_URI or MONGODB_URI environment variable.'); })());

  const User = model('User', new Schema({
    email: String,
    passwordHash: String,
  }), 'users');

  const email = 'ronak@example.com';
  const password = 'quantumsafe123';
  const passwordHash = hashSync(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    { passwordHash },
    { upsert: true, new: true }
  );

  console.log(`✅ User created or updated:
  Email:    ${email}
  Password: ${password}`);
  process.exit(0);
})();
