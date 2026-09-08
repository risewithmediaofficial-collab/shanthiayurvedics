import { connectDB, disconnectDB } from '../config/db.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';

const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_PASSWORD;
const name = process.env.BOOTSTRAP_NAME?.trim() || 'CRM Owner';

if (!email || !password) {
  throw new Error('Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD before running this command.');
}

const bootstrapOwner = async () => {
  await connectDB();
  await RbacService.initializeDefaultRoles();

  const branch = await Branch.findOneAndUpdate(
    { code: 'MAIN' },
    { name: 'Main Branch', code: 'MAIN', branchType: 'COMPANY_OWNED', isActive: true },
    { upsert: true, new: true }
  );

  const passwordHash = await User.hashPassword(password);
  await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      role: ROLES.OWNER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`Bootstrap owner ready: ${email}`);
};

try {
  await bootstrapOwner();
} catch (error) {
  console.error(`Bootstrap failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
