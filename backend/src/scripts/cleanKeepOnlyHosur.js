import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Inventory } from '../models/Inventory.js';
import { ROLES } from '../constants/roles.js';

export const cleanKeepOnlyHosur = async () => {
  try {
    await connectDB();
    logger.info('🧹 Starting Cleanup: Keeping ONLY Hosur Main Hub & Removing All Fake Seeded Data...');

    const db = mongoose.connection?.db;
    if (!db) {
      throw new Error('Database instance not connected');
    }

    // 1. Ensure Hosur Main Hub Branch is preserved / created
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
        managerName: 'Akash Manager',
        managerPhone: '9629985345',
        isActive: true
      },
      { upsert: true, new: true }
    );
    logger.info(`✅ Hosur Main Hub validated: ${hosurBranch.name} (${hosurBranch._id})`);

    // 2. Delete all other branches (Krishnagiri, Bangalore, Main, etc.)
    const deletedBranchesRes = await Branch.deleteMany({ _id: { $ne: hosurBranch._id } });
    logger.info(`🗑️ Deleted ${deletedBranchesRes.deletedCount} non-Hosur branches.`);

    // 3. Clear all fake transaction & pipeline collections completely
    const collectionsToClear = [
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
      'rtorecords'
    ];

    const deletionSummary = {};
    for (const colName of collectionsToClear) {
      const colExists = await db.listCollections({ name: colName }).toArray();
      if (colExists.length > 0) {
        const res = await db.collection(colName).deleteMany({});
        deletionSummary[colName] = res.deletedCount;
        logger.info(`  - Deleted ${res.deletedCount} records from '${colName}'`);
      } else {
        deletionSummary[colName] = 0;
      }
    }

    // 4. Remove inventory for deleted branches, keep ONLY Hosur inventory
    const deletedInvsRes = await Inventory.deleteMany({ branchId: { $ne: hosurBranch._id } });
    logger.info(`🗑️ Removed ${deletedInvsRes.deletedCount} inventory records belonging to deleted branches.`);

    // Reset allocated and reserved stock on Hosur inventory
    const resetInvRes = await Inventory.updateMany(
      { branchId: hosurBranch._id },
      {
        $set: {
          reservedQuantity: 0,
          allocatedQuantity: 0,
          dispatchedQuantity: 0,
          returnedQuantity: 0
        }
      }
    );
    logger.info(`  - Reset reserved/allocated stock on ${resetInvRes.modifiedCount} Hosur inventory records.`);

    // 5. Clean up Users:
    // Remove staff specifically tied to deleted branches (e.g., manager.krishnagiri)
    const deletedUsersRes = await User.deleteMany({
      email: {
        $in: [
          'manager.krishnagiri@shanthiayurvedas.com',
          'anandhi@shanthiayurvedas.com',
          'vasuki@shanthiayurvedas.com',
          'pattuselvi@shanthiayurvedas.com'
        ]
      }
    });
    logger.info(`🗑️ Removed ${deletedUsersRes.deletedCount} staff accounts belonging to other branches.`);

    // Strictly scope all remaining users to Hosur Main Hub ONLY
    const userUpdateRes = await User.updateMany(
      {},
      {
        $set: {
          branchId: hosurBranch._id,
          branches: [hosurBranch._id]
        }
      }
    );
    logger.info(`🔒 Scoped ${userUpdateRes.modifiedCount} active users strictly to Hosur Main Hub.`);

    logger.info('🎉 All fake data removed! Only Hosur Main Hub and clean inventory preserved.');

    return {
      hosurBranch: {
        id: hosurBranch._id,
        name: hosurBranch.name,
        code: hosurBranch.code
      },
      deletedBranches: deletedBranchesRes.deletedCount,
      deletedTransactions: deletionSummary,
      deletedNonHosurInventories: deletedInvsRes.deletedCount,
      hosurInventoriesPreserved: await Inventory.countDocuments({ branchId: hosurBranch._id }),
      usersUpdated: userUpdateRes.modifiedCount
    };
  } catch (error) {
    logger.error(`❌ Cleanup script failed: ${error.message}`);
    throw error;
  }
};

if (process.argv[1]?.endsWith('cleanKeepOnlyHosur.js')) {
  (async () => {
    try {
      const summary = await cleanKeepOnlyHosur();
      console.log('\n=== HOSUR CLEANUP SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      await disconnectDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      await disconnectDB();
      process.exit(1);
    }
  })();
}

export default cleanKeepOnlyHosur;
