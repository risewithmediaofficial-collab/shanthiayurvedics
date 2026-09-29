import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { Inventory } from '../models/Inventory.js';
import { ShippingPartner } from '../models/ShippingPartner.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';

export const seedComprehensiveData = async () => {
  try {
    logger.info('🌱 Starting Data Seeding (Hosur Main Hub Only & Clean Database)...');

    // 1. Initialize Default Roles
    await RbacService.initializeDefaultRoles();
    logger.info('✅ Roles and Permissions initialized');

    // 2. Only ONE Branch: Shanthi Ayurvedas Hosur Main Hub
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
    logger.info(`✅ Seeded single active branch: ${hosurBranch.name} (${hosurBranch.code})`);

    // 3. Staff Accounts (Owner, Dedicated Distributor, Dedicated Manager, Telecallers)
    // All scoped strictly to Hosur Main Hub
    const defaultPassword = 'Password@12345';
    const passwordHash = await User.hashPassword(defaultPassword);
    const slimPasswordHash = await User.hashPassword('slim369');

    const usersData = [
      // Boss / Head
      {
        name: 'Dr. Shanthi (Boss / Head)',
        username: 'shanthi@369',
        email: 'shanthi@shanthiayurvedas.com',
        brand: 'Shanthi Ayurvedas',
        assignedBrands: ['Shanthi Ayurvedas', 'Slim 369', 'Shanthi Herbals'],
        passwordHash: slimPasswordHash,
        role: ROLES.OWNER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '8884747209',
        isActive: true
      },
      // Dedicated Distributor Login for Slim 369 Brand (Hosur Branch Only)
      {
        name: 'Slim 369 Brand Distributor',
        username: 'slim369',
        email: 'slim369@shanthiayurvedas.com',
        brand: 'Slim 369',
        assignedBrands: ['Slim 369'],
        passwordHash: slimPasswordHash,
        role: ROLES.DISTRIBUTOR,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '8884747209',
        isActive: true
      },
      // Dedicated Office Manager Akash (Hosur Branch Only)
      {
        name: 'Akash (Hosur Office Manager)',
        username: 'shanthi ayurvedas office',
        email: 'akash.manager@shanthiayurvedas.com',
        brand: 'Shanthi Ayurvedas',
        passwordHash: slimPasswordHash,
        role: ROLES.MANAGER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9629985345',
        isActive: true
      },
      {
        name: 'CRM Owner',
        email: 'owner@shanthiayurvedas.com',
        username: 'owner',
        brand: 'Shanthi Ayurvedas',
        passwordHash,
        role: ROLES.OWNER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9629985340',
        isActive: true
      },
      {
        name: 'Ramesh Distributor',
        email: 'distributor@shanthiayurvedas.com',
        username: 'distributor',
        brand: 'Shanthi Ayurvedas',
        passwordHash,
        role: ROLES.DISTRIBUTOR,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '8884747209',
        isActive: true
      },
      {
        name: 'Anand Manager (Hosur)',
        email: 'manager.hosur@shanthiayurvedas.com',
        username: 'manager.hosur',
        brand: 'Shanthi Ayurvedas',
        passwordHash,
        role: ROLES.MANAGER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9629985341',
        isActive: true
      },
      // Hosur Telecaller Team
      {
        name: 'MADHU SUDHAN',
        email: 'madhu@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9629985341',
        isActive: true
      },
      {
        name: 'SATHISH KUMAR',
        email: 'sathish@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9629985342',
        isActive: true
      },
      {
        name: 'MONIKA',
        email: 'monika@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9148554369',
        isActive: true
      },
      {
        name: 'AMRUTHA',
        email: 'amrutha@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '8147940269',
        isActive: true
      },
      {
        name: 'RATHNA',
        email: 'rathna@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9566112369',
        isActive: true
      },
      {
        name: 'KANAGAVALLI',
        email: 'kanaga@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9487572369',
        isActive: true
      },
      {
        name: 'PIYALO',
        email: 'piyalo@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: hosurBranch._id,
        branches: [hosurBranch._id],
        phone: '9360448854',
        isActive: true
      }
    ];

    const usersMap = {};
    for (const u of usersData) {
      const saved = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
      usersMap[u.email] = saved;
    }
    logger.info(`✅ ${Object.keys(usersMap).length} Staff Accounts seeded strictly for Hosur Main Hub`);

    // 4. Products, Batches & Warehouse Inventory (Hosur Only)
    const productsData = [
      {
        name: 'Ayur Slim Care 500g',
        sku: 'ASC-500',
        category: 'CHURNAS',
        description: 'Herbal metabolism and natural weight management formula with Triphala, Guggulu, Vrikshamla & Pippali.',
        price: 1499,
        mrp: 1899,
        costPrice: 520,
        unit: 'Jar (500g)',
        taxPercent: 5,
        lowStockThreshold: 15
      },
      {
        name: 'Sandhi Sudha Joint Relief Oil 100ml',
        sku: 'SSO-100',
        category: 'OILS',
        description: 'Fast-acting botanical extract oil for arthritis, knee, and lower back pain.',
        price: 620,
        mrp: 750,
        costPrice: 220,
        unit: 'Bottle (100ml)',
        taxPercent: 12,
        lowStockThreshold: 15
      },
      {
        name: 'Triphala & Guggulu Detox Combo',
        sku: 'TPG-200',
        category: 'KITS',
        description: 'Colon cleanse, deep toxin detoxifier and cholesterol metabolism support.',
        price: 850,
        mrp: 1100,
        costPrice: 310,
        unit: 'Combo Pack',
        taxPercent: 5,
        lowStockThreshold: 10
      },
      {
        name: 'Kumkumadi Radiance Tailam 30ml',
        sku: 'KKT-030',
        category: 'OILS',
        description: 'Precious Kashmiri saffron Ayurvedic facial night drops for hyperpigmentation.',
        price: 999,
        mrp: 1200,
        costPrice: 380,
        unit: 'Dropper (30ml)',
        taxPercent: 18,
        lowStockThreshold: 8
      },
      {
        name: 'Ashwagandha Rasayana 500g',
        sku: 'AGR-500',
        category: 'TONICS',
        description: 'Immunity, stamina, vitality, and stress-adaptogen herbal rasayana jam.',
        price: 699,
        mrp: 850,
        costPrice: 280,
        unit: 'Jar (500g)',
        taxPercent: 12,
        lowStockThreshold: 12
      },
      {
        name: 'Maha Bhringraj Taila 200ml',
        sku: 'MBT-200',
        category: 'OILS',
        description: 'Traditional hair vitality formulation with Bhringraj, Amla, Shikakai & Brahmi.',
        price: 499,
        mrp: 599,
        costPrice: 190,
        unit: 'Bottle (200ml)',
        taxPercent: 12,
        lowStockThreshold: 20
      },
      {
        name: 'Shanthi Joint Care 90-Day Full Kit',
        sku: 'JCK-090',
        category: 'KITS',
        description: 'Comprehensive 3-month holistic joint care treatment kit.',
        price: 3499,
        mrp: 4500,
        costPrice: 1350,
        unit: 'Treatment Box',
        taxPercent: 12,
        lowStockThreshold: 5
      },
      {
        name: 'Digestive Metabolism Tea 100g',
        sku: 'DMT-100',
        category: 'TONICS',
        description: 'Green herbal digestive infusion with Cumin, Fennel, Ginger & Licorice.',
        price: 380,
        mrp: 450,
        costPrice: 120,
        unit: 'Pouch (100g)',
        taxPercent: 5,
        lowStockThreshold: 20
      }
    ];

    const products = [];
    for (const p of productsData) {
      const prod = await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
      products.push(prod);

      const batchNum = `${p.sku}-B26`;
      const batch = await ProductBatch.findOneAndUpdate(
        { productId: prod._id, batchNumber: batchNum },
        {
          productId: prod._id,
          batchNumber: batchNum,
          manufacturingDate: new Date('2026-01-10'),
          expiryDate: new Date('2028-01-09'),
          mrp: p.mrp,
          purchasePrice: p.costPrice,
          isActive: true
        },
        { upsert: true, new: true }
      );

      // Inventory ONLY for Hosur Main Hub
      await Inventory.findOneAndUpdate(
        { productId: prod._id, batchId: batch._id, branchId: hosurBranch._id },
        {
          productId: prod._id,
          batchId: batch._id,
          branchId: hosurBranch._id,
          availableQuantity: 100,
          reservedQuantity: 0,
          allocatedQuantity: 0,
          dispatchedQuantity: 0,
          returnedQuantity: 0
        },
        { upsert: true }
      );
    }
    logger.info(`✅ ${products.length} Products & Batches seeded for Hosur Main Hub`);

    // Clean Production State: ZERO Fake Leads, ZERO Fake Orders, ZERO Fake Customers
    logger.info('✨ Clean Production Mode: 0 fake orders, 0 fake leads. Database ready for live operations.');

    // 5. Shipping Partner Configuration
    await ShippingPartner.findOneAndUpdate(
      { code: 'INDIA_POST' },
      {
        name: 'India Post Speed Post (Self Upload)',
        code: 'INDIA_POST',
        trackingUrlTemplate: 'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx?consignmentNo={{awb}}',
        billerId: '1000058077',
        isActive: true
      },
      { upsert: true }
    );
    logger.info('✅ India Post Logistics Hub configuration seeded');

    logger.info('🎉 Seeding Finished Successfully: Hosur Main Hub Only & Zero Fake Data!');
    return {
      branchesCount: 1,
      usersCount: Object.keys(usersMap).length,
      productsCount: products.length,
      customersCount: 0,
      leadsCount: 0,
      ordersCount: 0
    };
  } catch (error) {
    logger.error(`❌ Seeding Failed: ${error.message}`);
    throw error;
  }
};

export const seedDatabase = seedComprehensiveData;
export default seedComprehensiveData;

// Direct CLI Execution
if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seedComprehensiveData.js')) {
  (async () => {
    try {
      await connectDB();
      const summary = await seedComprehensiveData();
      console.log('\n=== SEED SUMMARY ===');
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
