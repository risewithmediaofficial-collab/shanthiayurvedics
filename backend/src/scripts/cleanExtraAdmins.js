import mongoose from 'mongoose';
import { env } from '../config/env.js';

await mongoose.connect(env.MONGO_URI);
console.log('DB connected');

const db = mongoose.connection.db;
const users = await db.collection('users').find({ role: 'OWNER' }).sort({ createdAt: 1 }).toArray();

console.log(`\nFound ${users.length} OWNER accounts:`);
users.forEach((u, i) => console.log(`  [${i}] ${String(u._id)} | ${u.email} | ${u.name}`));

if (users.length <= 1) {
  console.log('\n✅ Only one admin — nothing to remove.');
  await mongoose.disconnect();
  process.exit(0);
}

// Keep the FIRST created (oldest) OWNER; delete the rest
const keep = users[0];
const toDelete = users.slice(1).map(u => u._id);

console.log(`\n✅ Keeping : ${keep.email} (${keep.name})`);
console.log(`🗑  Removing: ${toDelete.length} extra admin account(s)`);

// Also clean any sessions for deleted users
await db.collection('sessions').deleteMany({ userId: { $in: toDelete } });
await db.collection('loginhistories').deleteMany({ userId: { $in: toDelete } });
const result = await db.collection('users').deleteMany({ _id: { $in: toDelete } });

console.log(`\n✅ Deleted ${result.deletedCount} extra admin account(s).`);
console.log(`\n🔑 Login with: ${keep.email}`);

await mongoose.disconnect();
