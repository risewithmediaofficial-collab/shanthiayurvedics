import { User } from '../models/User.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { ROLES } from '../constants/roles.js';

const NEW_PASSWORD = 'Shanthi@2026!';

await connectDB();

const owner = await User.findOne({ role: ROLES.OWNER }).select('+passwordHash');

if (!owner) {
  console.log('❌ No OWNER account found!');
  process.exit(1);
}

const hashed = await User.hashPassword(NEW_PASSWORD);
owner.passwordHash = hashed;
owner.isActive = true;
owner.isLocked = false;
owner.failedLoginAttempts = 0;
owner.lockUntil = null;
await owner.save();

// Clear all sessions so old tokens are invalidated
const db = User.db;
await db.collection('sessions').deleteMany({ userId: owner._id });

console.log('\n✅ Owner password reset successfully!\n');
console.log('╔══════════════════════════════════════════╗');
console.log('║           OWNER LOGIN CREDENTIALS        ║');
console.log('╠══════════════════════════════════════════╣');
console.log(`║  Email    : ${owner.email.padEnd(28)} ║`);
console.log(`║  Password : ${NEW_PASSWORD.padEnd(28)} ║`);
console.log(`║  Name     : ${owner.name.padEnd(28)} ║`);
console.log('╚══════════════════════════════════════════╝\n');

await mongoose.disconnect();
