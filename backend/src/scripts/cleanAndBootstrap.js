/**
 * cleanAndBootstrap.js
 * ─────────────────────────────────────────────────────────────
 * Removes ALL fake/seeded data from the database while
 * preserving (or creating) the admin (OWNER) account.
 *
 * Usage:
 *   BOOTSTRAP_EMAIL=admin@shanthiayurvedas.com \
 *   BOOTSTRAP_PASSWORD=YourSecurePass123! \
 *   BOOTSTRAP_NAME="Admin User" \
 *   node src/scripts/cleanAndBootstrap.js
 *
 * Or via npm script:  npm run clean:bootstrap
 * ─────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';
import { logger } from '../config/logger.js';

const ADMIN_EMAIL    = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.BOOTSTRAP_PASSWORD;
const ADMIN_NAME     = process.env.BOOTSTRAP_NAME?.trim() || 'Super Admin';

/**
 * Collections to completely wipe (all fake/seeded transactional data).
 * Users, Branches, Roles, and Permissions are intentionally excluded.
 */
const COLLECTIONS_TO_CLEAR = [
  'orders',
  'orderstatushistories',
  'leads',
  'leadassignments',
  'customers',
  'callhistories',
  'followups',
  'packingrecords',
  'shipments',
  'trackingevents',
  'rtorecords',
  'inventories',
  'stockmovements',
  'stockadjustments',
  'stocktransfers',
  'productbatches',
  'withdrawalrequests',
  'auditlogs',
  'loginhistories',
  'sessions',
  'notifications'
];

const run = async () => {
  await connectDB();
  await RbacService.initializeDefaultRoles();

  const db = mongoose.connection.db;
  const summary = {};

  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  🧹  Cleaning all fake / seeded transactional data…');
  logger.info('═══════════════════════════════════════════════════════');

  for (const col of COLLECTIONS_TO_CLEAR) {
    const exists = await db.listCollections({ name: col }).toArray();
    if (exists.length > 0) {
      const result = await db.collection(col).deleteMany({});
      summary[col] = result.deletedCount;
      logger.info(`  ✓ Cleared '${col}' — ${result.deletedCount} records removed`);
    } else {
      summary[col] = 0;
    }
  }

  // Remove all non-OWNER users (telecallers, managers, distributors)
  const nonOwnerResult = await User.deleteMany({ role: { $ne: ROLES.OWNER } });
  summary['users_non_owner'] = nonOwnerResult.deletedCount;
  logger.info(`  ✓ Removed ${nonOwnerResult.deletedCount} non-admin user accounts`);

  // ── Ensure admin (OWNER) account exists ──────────────────────────────────
  const ownerExists = await User.findOne({ role: ROLES.OWNER });

  if (ownerExists) {
    logger.info(`  ✅ Admin account already exists: ${ownerExists.email}`);
  } else {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      logger.warn('  ⚠️  No existing admin found and BOOTSTRAP_EMAIL/BOOTSTRAP_PASSWORD not set.');
      logger.warn('     Set those env vars and re-run to create the admin account.');
    } else {
      const passwordHash = await User.hashPassword(ADMIN_PASSWORD);
      const admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: ROLES.OWNER,
        isActive: true
      });
      logger.info(`  🔑 Admin account created: ${admin.email}`);
      summary['admin_created'] = admin.email;
    }
  }

  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  ✅ Database clean-up complete.');
  logger.info('═══════════════════════════════════════════════════════');

  return summary;
};

try {
  const summary = await run();
  console.log('\n=== CLEAN & BOOTSTRAP SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  logger.error(`Fatal: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
