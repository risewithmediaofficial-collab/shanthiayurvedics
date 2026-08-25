import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';

export const seedDatabase = async () => {
  try {
    logger.info('🌱 Starting Shanthi Ayurvedas CRM Database Seeding...');

    // 1. Initialize Default Roles and Permissions
    await RbacService.initializeDefaultRoles();
    logger.info('✅ Roles and Permissions seeded');

    // 2. Seed Default Branches
    const hosurBranch = await Branch.findOneAndUpdate(
      { code: 'HSR' },
      {
        name: 'Hosur Main Branch',
        code: 'HSR',
        address: {
          street: '14/B, Gandhi Road, Near Bus Stand',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109',
          country: 'India'
        },
        phone: '+91 98421 11223',
        email: 'hosur@shanthiayurvedas.com',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const krishnagiriBranch = await Branch.findOneAndUpdate(
      { code: 'KGI' },
      {
        name: 'Krishnagiri Central Branch',
        code: 'KGI',
        address: {
          street: '88, Bangalore Road, Roundana',
          city: 'Krishnagiri',
          state: 'Tamil Nadu',
          pincode: '635001',
          country: 'India'
        },
        phone: '+91 98421 33445',
        email: 'krishnagiri@shanthiayurvedas.com',
        isActive: true
      },
      { upsert: true, new: true }
    );
    logger.info('✅ Branches seeded (Hosur & Krishnagiri)');

    // 3. Seed Users with Argon2id passwords
    const defaultPassword = 'Password@12345'; // Meets 10+ chars, uppercase, lowercase, number, special char
    const passwordHash = await User.hashPassword(defaultPassword);

    const usersToSeed = [
      {
        name: 'Santhosh Kumar (Owner)',
        email: 'owner@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.OWNER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id, krishnagiriBranch._id],
        phone: '+91 98765 00001',
        isActive: true
      },
      {
        name: 'Ramesh Distributor',
        email: 'distributor@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.DISTRIBUTOR,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id, krishnagiriBranch._id],
        phone: '+91 98765 00002',
        isActive: true
      },
      {
        name: 'Anand Manager (Hosur)',
        email: 'manager.hosur@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.MANAGER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '+91 98765 00003',
        isActive: true
      },
      {
        name: 'Deepak Manager (Krishnagiri)',
        email: 'manager.krishnagiri@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.MANAGER,
        branchId: krishnagiriBranch._id,
        branches: [krishnagiriBranch._id],
        phone: '+91 98765 00004',
        isActive: true
      },
      {
        name: 'Priya Telecaller (Hosur)',
        email: 'telecaller.priya@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '+91 98765 00005',
        isActive: true
      },
      {
        name: 'Karthik Telecaller (Hosur)',
        email: 'telecaller.karthik@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '+91 98765 00006',
        isActive: true
      }
    ];

    for (const u of usersToSeed) {
      await User.findOneAndUpdate({ email: u.email }, u, { upsert: true });
    }
    logger.info('✅ Default staff accounts seeded:');
    logger.info('   👑 Owner: owner@shanthiayurvedas.com / Password@12345');
    logger.info('   🏢 Manager Hosur: manager.hosur@shanthiayurvedas.com / Password@12345');
    logger.info('   🏢 Manager Krishnagiri: manager.krishnagiri@shanthiayurvedas.com / Password@12345');
    logger.info('   📊 Distributor: distributor@shanthiayurvedas.com / Password@12345');
    logger.info('   📞 Telecaller 1: telecaller.priya@shanthiayurvedas.com / Password@12345');
    logger.info('   📞 Telecaller 2: telecaller.karthik@shanthiayurvedas.com / Password@12345');

    logger.info('🎉 Database seeding completed successfully!');
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    throw error;
  }
};

// If run directly via `node src/scripts/seed.js`
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}
