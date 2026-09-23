import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';

export const deleteFakeData = async () => {
  try {
    await connectDB();
    logger.info('🧹 Starting deletion of fake seeded data from database...');

    const db = mongoose.connection.db;

    // Collections to delete all records from
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

    const results = {};

    for (const colName of collectionsToClear) {
      const collections = await db.listCollections({ name: colName }).toArray();
      if (collections.length > 0) {
        const res = await db.collection(colName).deleteMany({});
        results[colName] = res.deletedCount;
        logger.info(`  Deleted ${res.deletedCount} records from '${colName}'`);
      } else {
        results[colName] = 0;
      }
    }

    // Reset reserved, allocated, dispatched quantities in inventory
    const invRes = await db.collection('inventories').updateMany(
      {},
      {
        $set: {
          reservedQuantity: 0,
          allocatedQuantity: 0,
          dispatchedQuantity: 0,
          returnedQuantity: 0
        }
      }
    );
    logger.info(`  Reset reserved/allocated quantities in ${invRes.modifiedCount} inventory records.`);

    logger.info('✅ Successfully deleted all fake transaction data!');
    return results;
  } catch (err) {
    logger.error(`❌ Failed to delete fake data: ${err.message}`);
    throw err;
  }
};

if (process.argv[1]?.endsWith('deleteFakeData.js')) {
  (async () => {
    try {
      const summary = await deleteFakeData();
      console.log('\n=== DELETION SUMMARY ===');
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
