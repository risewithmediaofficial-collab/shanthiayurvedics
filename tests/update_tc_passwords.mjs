import mongoose from 'mongoose';
import argon2 from 'argon2';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/shanthi_ayurvedas_crm';

async function updatePasswords() {
  try {
    await mongoose.connect(MONGODB_URI);
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      isActive: Boolean,
      failedLoginAttempts: Number,
      isLocked: Boolean,
      lockUntil: Date,
      passwordHash: { type: String, select: true }
    }, { collection: 'users' });

    let User;
    try { User = mongoose.model('User'); } catch(e) { User = mongoose.model('User', userSchema); }

    const users = await User.find({ role: 'TELECALLER' });
    console.log(`Found ${users.length} telecaller(s).`);

    const hash = await argon2.hash('Password@12345', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1
    });

    for (const u of users) {
      u.passwordHash = hash;
      u.failedLoginAttempts = 0;
      u.isLocked = false;
      u.lockUntil = null;
      await u.save();
      console.log(`✅ Set argon2 password to 'Password@12345' for telecaller: ${u.email} (${u.name})`);
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updatePasswords();
