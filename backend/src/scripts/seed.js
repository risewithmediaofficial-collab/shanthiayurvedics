import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';

/**
 * Collections to wipe completely (all seeded/fake data).
 */
const COLLECTIONS_TO_CLEAR = [
  'orders',
  'orderstatushistories',
  'leads',
  'leadassignments',
  'customers',
  'callhistories',
  'doctorslotbookings',
  'doctors',
  'packingrecords',
  'shipments',
  'trackingevents',
  'followups',
  'rtorecords',
  'inventories',
  'productbatches',
  'products',
  'shippingpartners',
  'stockmovements',
  'stockadjustments',
  'stocktransfers',
  'withdrawalrequests',
  'auditlogs',
  'loginhistories',
  'sessions',
  'notifications'
];

export const seedComprehensiveData = async () => {
  try {
    await connectDB();
    logger.info('🌱 Initializing Clean System with Owner Login Only...');

    // 1. Initialize Default Roles and Permissions
    await RbacService.initializeDefaultRoles();
    logger.info('✅ Roles and Permissions initialized');

    // 2. Primary Active Operating Hub: Shanthi Ayurvedas Hosur Main Hub
    const hosurBranch = await Branch.findOneAndUpdate(
      { code: 'HSR' },
      {
        name: 'Shanthi Ayurvedas Hosur Main Hub',
        code: 'HSR',
        branchType: 'COMPANY_OWNED',
        address: {
          street: '14/B, Gandhi Road, Near Bus Stand',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109',
          country: 'India'
        },
        phone: '+91 96299 85341',
        email: 'hosur@shanthiayurvedas.com',
        billerId: '1000058077',
        isActive: true
      },
      { upsert: true, new: true }
    );
    logger.info(`✅ Seeded single active branch: ${hosurBranch.name} (${hosurBranch.code})`);

    // 3. Clear all fake/seeded collections
    const db = mongoose.connection.db;
    const clearedSummary = {};

    for (const col of COLLECTIONS_TO_CLEAR) {
      const exists = await db.listCollections({ name: col }).toArray();
      if (exists.length > 0) {
        const result = await db.collection(col).deleteMany({});
        clearedSummary[col] = result.deletedCount;
      }
    }
    logger.info('✅ Cleared all seeded transactional records, products, inventories, and leads');

    // 4. Ensure Essential Accounts exist (Owner + Quick Switch demo accounts for testing each role)
    const defaultPassword = 'Password@12345';
    const passwordHash = await User.hashPassword(defaultPassword);

    const QUICK_ACCOUNTS = [
      {
        name: 'CRM Owner',
        email: 'owner@shanthiayurvedas.com',
        username: 'owner',
        role: ROLES.OWNER,
        phone: '9629985340'
      },
      {
        name: 'Hosur Hub Manager',
        email: 'manager.hosur@shanthiayurvedas.com',
        username: 'manager_hosur',
        role: ROLES.MANAGER,
        phone: '9629985342'
      },
      {
        name: 'Ramesh Distributor',
        email: 'distributor@shanthiayurvedas.com',
        username: 'distributor_ramesh',
        role: ROLES.DISTRIBUTOR,
        phone: '9629985343'
      },
      {
        name: 'Sathish Telecaller',
        email: 'sathish@shanthiayurvedas.com',
        username: 'telecaller_sathish',
        role: ROLES.TELECALLER,
        phone: '9629985344'
      }
    ];

    const quickEmails = QUICK_ACCOUNTS.map((a) => a.email);

    // Delete extraneous users outside the core accounts
    const deletedUsers = await User.deleteMany({ email: { $nin: quickEmails } });
    logger.info(`✅ Removed ${deletedUsers.deletedCount} extraneous accounts`);

    // Create or update all 4 quick role accounts
    for (const acc of QUICK_ACCOUNTS) {
      await User.findOneAndUpdate(
        { email: acc.email },
        {
          name: acc.name,
          email: acc.email,
          username: acc.username,
          brand: 'Shanthi Ayurvedas',
          assignedBrands: ['Shanthi Ayurvedas'],
          passwordHash,
          role: acc.role,
          branchId: hosurBranch._id,
          branches: [hosurBranch._id],
          phone: acc.phone,
          isActive: true
        },
        { upsert: true, new: true }
      );
    }
    logger.info(`✅ Preserved core role accounts (${quickEmails.join(', ')}) with Hosur Main Hub`);

    logger.info('🎉 Database is clean with Hosur Main Hub and role accounts ready.');

    return {
      branchesCount: 1,
      usersCount: QUICK_ACCOUNTS.length,
      ownerEmail: 'owner@shanthiayurvedas.com',
      ownerUsername: 'owner',
      productsCount: 0,
      customersCount: 0,
      leadsCount: 0,
      ordersCount: 0,
      cleared: clearedSummary
    };
  } catch (error) {
    logger.error(`❌ Setup Failed: ${error.message}`);
    throw error;
  }
};

export const seedDatabase = seedComprehensiveData;
export default seedComprehensiveData;

if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seedComprehensiveData.js')) {
  try {
    const summary = await seedComprehensiveData();
    console.log('\n=== CLEAN SEED SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\nCredential:');
    console.log('  Email:    owner@shanthiayurvedas.com');
    console.log('  Username: owner');
    console.log('  Password: Password@12345\n');
  } catch (err) {
    console.error('Fatal:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
