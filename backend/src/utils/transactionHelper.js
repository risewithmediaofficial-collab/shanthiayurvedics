import mongoose from 'mongoose';

/**
 * Executes a callback within a MongoDB ACID transaction if supported,
 * or runs standard operations if running on a standalone single-node instance.
 */
export const withTransaction = async (callback) => {
  let session = null;
  let supportsTransactions = false;

  try {
    // Check if connected deployment is a Replica Set or Sharded cluster
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    if (topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded') {
      session = await mongoose.startSession();
      session.startTransaction();
      supportsTransactions = true;
    }
  } catch (err) {
    supportsTransactions = false;
    session = null;
  }

  if (!supportsTransactions || !session) {
    // Run directly without session
    return await callback(null);
  }

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default withTransaction;
