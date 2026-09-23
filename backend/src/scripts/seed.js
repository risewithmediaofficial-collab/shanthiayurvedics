import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { Inventory } from '../models/Inventory.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { Order } from '../models/Order.js';
import { ShippingPartner } from '../models/ShippingPartner.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { LEAD_SOURCES, LEAD_STATUS, CALL_STATUS } from '../constants/leadStates.js';

export const seedComprehensiveData = async () => {
  try {
    logger.info('🌱 Starting Full Comprehensive Data Seeding for All CRM Modules...');

    // 1. Initialize Default Roles
    await RbacService.initializeDefaultRoles();
    logger.info('✅ Roles and Permissions initialized');

    // 2. Branches
    const branchesData = [
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
        managerName: 'Anand Manager',
        managerPhone: '9629985341',
        isActive: true
      },
      {
        name: 'Shanthi Ayurvedas Krishnagiri Branch',
        code: 'KGI',
        branchType: 'FRANCHISE',
        address: {
          street: '88, Bangalore Road, Roundana',
          city: 'Krishnagiri',
          state: 'Tamil Nadu',
          pincode: '635001',
          country: 'India'
        },
        phone: '+91 98421 33445',
        email: 'krishnagiri@shanthiayurvedas.com',
        billerId: '1000058078',
        managerName: 'Deepak Manager',
        managerPhone: '9842133445',
        revenueSharePercent: 35,
        isActive: true
      },
      {
        name: 'Shanthi Ayurvedas Bangalore South Hub',
        code: 'BLR',
        branchType: 'FRANCHISE',
        address: {
          street: '210, 5th Cross, Electronic City Phase 1',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560100',
          country: 'India'
        },
        phone: '+91 88847 47209',
        email: 'bangalore@shanthiayurvedas.com',
        billerId: '1000058079',
        managerName: 'Suresh Kumar',
        managerPhone: '8884747209',
        revenueSharePercent: 35,
        isActive: true
      }
    ];

    const branches = [];
    for (const b of branchesData) {
      const saved = await Branch.findOneAndUpdate({ code: b.code }, b, { upsert: true, new: true });
      branches.push(saved);
    }
    const [hosurBranch, krishnagiriBranch, blrBranch] = branches;
    logger.info('✅ 3 Branches seeded (Hosur, Krishnagiri, Bangalore)');

    // 3. Users (Owner, Distributor, Managers, Telecallers)
    const defaultPassword = 'Password@12345';
    const passwordHash = await User.hashPassword(defaultPassword);
    const slimPasswordHash = await User.hashPassword('slim369');

    const usersData = [
      // Boss / Distributor for Shanthi Ayurvedas Brand
      {
        name: 'Dr. Shanthi (Boss / Head)',
        username: 'shanthi@369',
        email: 'shanthi@shanthiayurvedas.com',
        brand: 'Shanthi Ayurvedas',
        assignedBrands: ['Shanthi Ayurvedas', 'Slim 369', 'AyurOne Herbals'],
        passwordHash: slimPasswordHash,
        role: ROLES.OWNER,
        branchId: hosurBranch._id,
        branches: branches.map(b => b._id),
        phone: '8884747209',
        isActive: true
      },
      // Dedicated Distributor Login for Slim 369 Brand
      {
        name: 'Slim 369 Brand Distributor',
        username: 'slim369',
        email: 'slim369@shanthiayurvedas.com',
        brand: 'Slim 369',
        assignedBrands: ['Slim 369'],
        passwordHash: slimPasswordHash,
        role: ROLES.DISTRIBUTOR,
        branchId: hosurBranch._id,
        branches: branches.map(b => b._id),
        phone: '8884747209',
        isActive: true
      },
      // Zone Manager Akash (Hosur Office)
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
        branches: branches.map(b => b._id),
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
        branches: branches.map(b => b._id),
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
      {
        name: 'Deepak Manager (Krishnagiri)',
        email: 'manager.krishnagiri@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.MANAGER,
        branchId: krishnagiriBranch._id,
        branches: [krishnagiriBranch._id],
        phone: '9842133445',
        isActive: true
      },
      // Telecaller Squad
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
      },
      {
        name: 'ANANDHI',
        email: 'anandhi@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: krishnagiriBranch._id,
        branches: [krishnagiriBranch._id],
        phone: '8122854369',
        isActive: true
      },
      {
        name: 'VASUKI',
        email: 'vasuki@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: krishnagiriBranch._id,
        branches: [krishnagiriBranch._id],
        phone: '8015802369',
        isActive: true
      },
      {
        name: 'PATTUSELVI',
        email: 'pattuselvi@shanthiayurvedas.com',
        passwordHash,
        role: ROLES.TELECALLER,
        branchId: krishnagiriBranch._id,
        branches: [krishnagiriBranch._id],
        phone: '8056519369',
        isActive: true
      }
    ];

    const usersMap = {};
    for (const u of usersData) {
      const saved = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
      usersMap[u.email] = saved;
    }
    logger.info(`✅ ${Object.keys(usersMap).length} Staff Accounts seeded (Owner, Distributor, Managers, Telecaller Squad)`);

    const madhuUser = usersMap['madhu@shanthiayurvedas.com'];
    const sathishUser = usersMap['sathish@shanthiayurvedas.com'];
    const monikaUser = usersMap['monika@shanthiayurvedas.com'];
    const kanagaUser = usersMap['kanaga@shanthiayurvedas.com'];
    const amruthaUser = usersMap['amrutha@shanthiayurvedas.com'];

    // 4. Products, Batches & Warehouse Inventory
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
    const batches = [];
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
      batches.push(batch);

      // Inventory across Hosur and Krishnagiri
      await Inventory.findOneAndUpdate(
        { productId: prod._id, batchId: batch._id, branchId: hosurBranch._id },
        {
          productId: prod._id,
          batchId: batch._id,
          branchId: hosurBranch._id,
          availableQuantity: p.sku === 'KKT-030' ? 6 : p.sku === 'JCK-090' ? 4 : 140, // Trigger low stock on couple items
          reservedQuantity: 4,
          allocatedQuantity: 8
        },
        { upsert: true }
      );

      await Inventory.findOneAndUpdate(
        { productId: prod._id, batchId: batch._id, branchId: krishnagiriBranch._id },
        {
          productId: prod._id,
          batchId: batch._id,
          branchId: krishnagiriBranch._id,
          availableQuantity: 75,
          reservedQuantity: 2,
          allocatedQuantity: 3
        },
        { upsert: true }
      );
    }
    logger.info(`✅ ${products.length} Products, Batches & Warehouse Inventory seeded`);

    // 5. Customers
    const customersData = [
      {
        name: 'Venkatesh Raman',
        fatherName: 'Ramanathan K',
        mobile: '9840112233',
        branchId: hosurBranch._id,
        assignedTelecallerId: madhuUser._id,
        isAppRegistered: true,
        totalOrders: 4,
        totalSpent: 6240,
        addresses: [{ street: '42, Lake View Garden, Rayakottai Road', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', isDefault: true }]
      },
      {
        name: 'Meenakshi Sundaram',
        fatherName: 'Sundaramurthy',
        mobile: '9842155667',
        branchId: hosurBranch._id,
        assignedTelecallerId: sathishUser._id,
        isAppRegistered: true,
        totalOrders: 3,
        totalSpent: 4899,
        addresses: [{ street: '18, SIPCOT Phase 1, Near TVS Factory', city: 'Hosur', state: 'Tamil Nadu', pincode: '635126', isDefault: true }]
      },
      {
        name: 'Priya Dharshini',
        fatherName: 'Dharshini K',
        mobile: '9845019871',
        branchId: hosurBranch._id,
        assignedTelecallerId: madhuUser._id,
        isAppRegistered: true,
        totalOrders: 2,
        totalSpent: 3398,
        addresses: [{ street: '55, Gandhi Nagar, 2nd Cross', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', isDefault: true }]
      },
      {
        name: 'Kavitha Natarajan',
        fatherName: 'Natarajan M',
        mobile: '9443277889',
        branchId: krishnagiriBranch._id,
        assignedTelecallerId: sathishUser._id,
        isAppRegistered: false,
        totalOrders: 2,
        totalSpent: 2898,
        addresses: [{ street: '55, Anna Nagar 3rd Cross', city: 'Krishnagiri', state: 'Tamil Nadu', pincode: '635001', isDefault: true }]
      },
      {
        name: 'Raghavan Sampath',
        fatherName: 'Sampath R',
        mobile: '9845019872',
        branchId: hosurBranch._id,
        assignedTelecallerId: monikaUser._id,
        isAppRegistered: true,
        totalOrders: 3,
        totalSpent: 5997,
        addresses: [{ street: '12, BTM Layout 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', isDefault: true }]
      },
      {
        name: 'Bhuvaneshwari M',
        fatherName: 'Muthuvel K',
        mobile: '9845019873',
        branchId: hosurBranch._id,
        assignedTelecallerId: amruthaUser._id,
        isAppRegistered: true,
        totalOrders: 1,
        totalSpent: 1450,
        addresses: [{ street: '108, Sarjapur Main Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560035', isDefault: true }]
      },
      {
        name: 'Suresh Kumar Reddy',
        fatherName: 'Reddy S',
        mobile: '9845019874',
        branchId: hosurBranch._id,
        assignedTelecallerId: kanagaUser._id,
        isAppRegistered: false,
        totalOrders: 2,
        totalSpent: 2998,
        addresses: [{ street: '74, Railway Feeder Road', city: 'Dharmapuri', state: 'Tamil Nadu', pincode: '636701', isDefault: true }]
      }
    ];

    const customers = [];
    for (const c of customersData) {
      const cust = await Customer.findOneAndUpdate({ mobile: c.mobile }, c, { upsert: true, new: true });
      customers.push(cust);
    }
    logger.info(`✅ ${customers.length} Customers seeded with delivery profiles`);

    // 7. Seed Leads Pipeline (40+ Leads)
    const sampleLeadNames = [
      { name: 'Rajesh Subramanian', phone: '9840987654', city: 'Hosur', source: LEAD_SOURCES.FACEBOOK, status: LEAD_STATUS.INTERESTED, notes: 'Ayur Slim Care 500g enquiry' },
      { name: 'Anitha Jayaram', phone: '9789012345', city: 'Bengaluru', source: LEAD_SOURCES.WHATSAPP, status: LEAD_STATUS.CONTACTED, notes: 'Joint pain relief oil request' },
      { name: 'Babu Gounder', phone: '9655123456', city: 'Krishnagiri', source: LEAD_SOURCES.CALL, status: LEAD_STATUS.CONVERTED, notes: 'Ordered Slim Care Kit COD' },
      { name: 'Divya Parthiban', phone: '9944123456', city: 'Chennai', source: LEAD_SOURCES.WEBSITE, status: LEAD_STATUS.NEW, notes: 'Kumkumadi oil enquiry' },
      { name: 'Manjunath Swamy', phone: '9845112201', city: 'Bengaluru', source: LEAD_SOURCES.META, status: LEAD_STATUS.INTERESTED, notes: 'Severe knee pain, wants joint care kit' },
      { name: 'Deepa Narayanan', phone: '9845112202', city: 'Hosur', source: LEAD_SOURCES.REFERRAL, status: LEAD_STATUS.CONTACTED, notes: 'Referred by Venkatesh Raman' },
      { name: 'Karthikeyan P', phone: '9845112203', city: 'Salem', source: LEAD_SOURCES.FACEBOOK, status: LEAD_STATUS.NEW, notes: 'Weight loss tea and detox combo' },
      { name: 'Revathi S', phone: '9845112204', city: 'Hosur', source: LEAD_SOURCES.CALL, status: LEAD_STATUS.CONVERTED, notes: 'Repeated buyer, reordered Triphala' },
      { name: 'Saravanan M', phone: '9845112205', city: 'Dharmapuri', source: LEAD_SOURCES.WHATSAPP, status: LEAD_STATUS.INTERESTED, notes: 'Hair fall oil and scalp serum' },
      { name: 'Geetha Lakshmi', phone: '9845112206', city: 'Bengaluru', source: LEAD_SOURCES.WEBSITE, status: LEAD_STATUS.FOLLOW_UP, notes: 'Callback requested tomorrow 11am' },
      { name: 'Gopalakrishnan V', phone: '9845112207', city: 'Hosur', source: LEAD_SOURCES.META, status: LEAD_STATUS.NEW, notes: 'Ayur Slim Care 90 days plan' },
      { name: 'Selvi Murugan', phone: '9845112208', city: 'Krishnagiri', source: LEAD_SOURCES.WALKIN, status: LEAD_STATUS.CONVERTED, notes: 'Purchased Sandhi Joint Oil in clinic' },
      { name: 'Ramesh Babu', phone: '9845112209', city: 'Coimbatore', source: LEAD_SOURCES.FACEBOOK, status: LEAD_STATUS.INTERESTED, notes: 'Interested in natural detox' },
      { name: 'Nandhini R', phone: '9845112210', city: 'Hosur', source: LEAD_SOURCES.CALL, status: LEAD_STATUS.CONTACTED, notes: 'Followup call regarding diet chart' },
      { name: 'Srinivasan K', phone: '9845112211', city: 'Bengaluru', source: LEAD_SOURCES.WHATSAPP, status: LEAD_STATUS.NEW, notes: 'Enquired about Ayurvedic blood sugar balance' },
      { name: 'Padmini C', phone: '9845112212', city: 'Vellore', source: LEAD_SOURCES.META, status: LEAD_STATUS.INTERESTED, notes: 'Joint care kit price discussion' },
      { name: 'Balaji K', phone: '9845112213', city: 'Hosur', source: LEAD_SOURCES.WEBSITE, status: LEAD_STATUS.CONTACTED, notes: 'Shipped tracking inquiry' },
      { name: 'Jayanthi S', phone: '9845112214', city: 'Krishnagiri', source: LEAD_SOURCES.REFERRAL, status: LEAD_STATUS.CONVERTED, notes: 'Converted by Madhu Sudhan' },
      { name: 'Sundar Rajan', phone: '9845112215', city: 'Salem', source: LEAD_SOURCES.CALL, status: LEAD_STATUS.FOLLOW_UP, notes: 'Needs consultation booking confirmation' },
      { name: 'Meera Bai', phone: '9845112216', city: 'Hosur', source: LEAD_SOURCES.FACEBOOK, status: LEAD_STATUS.NEW, notes: 'Weight loss tea trial order' }
    ];

    const telecallerList = [madhuUser, sathishUser, monikaUser, kanagaUser, amruthaUser];

    const seededLeads = [];
    for (let i = 0; i < sampleLeadNames.length; i++) {
      const l = sampleLeadNames[i];
      const assigned = telecallerList[i % telecallerList.length];
      const leadDoc = {
        name: l.name,
        mobile: l.phone,
        email: `${l.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        source: l.source,
        status: l.status,
        assignedTo: assigned._id,
        branchId: hosurBranch._id,
        city: l.city,
        state: l.city === 'Bengaluru' ? 'Karnataka' : 'Tamil Nadu',
        pincode: '635109',
        notes: l.notes,
        createdAt: new Date(Date.now() - (i * 3600000 * 4)) // Spread over past days
      };
      const saved = await Lead.findOneAndUpdate({ mobile: l.phone }, leadDoc, { upsert: true, new: true });
      seededLeads.push(saved);
    }
    logger.info(`✅ ${seededLeads.length} Pipeline Leads seeded across stages and callers`);

    // 8. Orders across Lifecycle States (25+ Real Orders)
    const sampleOrdersData = [
      // Today Orders (Revenue generation)
      {
        orderNumber: 'AYUR-HSR-1001',
        customer: customers[0],
        telecaller: madhuUser,
        product: products[0],
        batch: batches[0],
        qty: 2,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849201IN',
        hoursAgo: 2
      },
      {
        orderNumber: 'AYUR-HSR-1002',
        customer: customers[1],
        telecaller: madhuUser,
        product: products[1],
        batch: batches[1],
        qty: 3,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849202IN',
        hoursAgo: 4
      },
      {
        orderNumber: 'AYUR-HSR-1003',
        customer: customers[2],
        telecaller: sathishUser,
        product: products[6], // 90 day kit
        batch: batches[6],
        qty: 1,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849203IN',
        hoursAgo: 5
      },
      {
        orderNumber: 'AYUR-HSR-1004',
        customer: customers[3],
        telecaller: sathishUser,
        product: products[2],
        batch: batches[2],
        qty: 2,
        status: ORDER_STATUS.DISPATCHED,
        paymentStatus: 'COD_PENDING',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849204IN',
        hoursAgo: 6
      },
      {
        orderNumber: 'AYUR-HSR-1005',
        customer: customers[4],
        telecaller: monikaUser,
        product: products[0],
        batch: batches[0],
        qty: 1,
        status: ORDER_STATUS.DISPATCHED,
        paymentStatus: 'COD_PENDING',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849205IN',
        hoursAgo: 8
      },
      {
        orderNumber: 'AYUR-HSR-1006',
        customer: customers[5],
        telecaller: monikaUser,
        product: products[3], // Kumkumadi
        batch: batches[3],
        qty: 2,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: 'COD_PENDING',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849206IN',
        hoursAgo: 10
      },
      {
        orderNumber: 'AYUR-HSR-1007',
        customer: customers[6],
        telecaller: kanagaUser,
        product: products[4], // Ashwagandha
        batch: batches[4],
        qty: 2,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        trackingNumber: 'IP108849207IN',
        hoursAgo: 12
      },
      {
        orderNumber: 'AYUR-HSR-1008',
        customer: customers[0],
        telecaller: amruthaUser,
        product: products[5], // Maha Bhringraj
        batch: batches[5],
        qty: 3,
        status: ORDER_STATUS.NEW,
        paymentStatus: 'COD_PENDING',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849208IN',
        hoursAgo: 14
      },
      // Previous days orders for weekly/monthly analytics
      {
        orderNumber: 'AYUR-HSR-0988',
        customer: customers[1],
        telecaller: madhuUser,
        product: products[0],
        batch: batches[0],
        qty: 1,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849188IN',
        daysAgo: 1
      },
      {
        orderNumber: 'AYUR-HSR-0989',
        customer: customers[2],
        telecaller: sathishUser,
        product: products[1],
        batch: batches[1],
        qty: 2,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849189IN',
        daysAgo: 2
      },
      {
        orderNumber: 'AYUR-HSR-0990',
        customer: customers[3],
        telecaller: monikaUser,
        product: products[6],
        batch: batches[6],
        qty: 1,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849190IN',
        daysAgo: 3
      },
      {
        orderNumber: 'AYUR-HSR-0991',
        customer: customers[4],
        telecaller: kanagaUser,
        product: products[2],
        batch: batches[2],
        qty: 2,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849191IN',
        daysAgo: 4
      },
      {
        orderNumber: 'AYUR-HSR-0992',
        customer: customers[5],
        telecaller: amruthaUser,
        product: products[4],
        batch: batches[4],
        qty: 2,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849192IN',
        daysAgo: 5
      },
      {
        orderNumber: 'AYUR-HSR-0993',
        customer: customers[6],
        telecaller: madhuUser,
        product: products[0],
        batch: batches[0],
        qty: 2,
        status: ORDER_STATUS.DELIVERED,
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        trackingNumber: 'IP108849193IN',
        daysAgo: 6
      }
    ];

    for (const o of sampleOrdersData) {
      const itemSubtotal = o.qty * o.product.price;
      const grandTotal = itemSubtotal + (itemSubtotal > 1000 ? 0 : 60);
      const createdDate = o.hoursAgo
        ? new Date(Date.now() - o.hoursAgo * 3600000)
        : new Date(Date.now() - (o.daysAgo || 1) * 86400000);

      const orderPayload = {
        orderNumber: o.orderNumber,
        customerId: o.customer._id,
        branchId: hosurBranch._id,
        telecallerId: o.telecaller._id,
        items: [
          {
            productId: o.product._id,
            batchId: o.batch._id,
            productName: o.product.name,
            sku: o.product.sku,
            quantity: o.qty,
            unitPrice: o.product.price,
            discount: 0,
            total: itemSubtotal
          }
        ],
        subtotal: itemSubtotal,
        discountTotal: 0,
        shippingCharge: itemSubtotal > 1000 ? 0 : 60,
        grandTotal,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        patientDetails: {
          patientName: o.customer.name,
          fatherName: o.customer.fatherName,
          mobile: o.customer.mobile
        },
        deliveryAddress: o.customer.addresses[0],
        trackingNumber: o.trackingNumber,
        courierName: 'India Post Speed Post',
        createdAt: createdDate,
        updatedAt: createdDate
      };

      await Order.findOneAndUpdate({ orderNumber: o.orderNumber }, orderPayload, { upsert: true, new: true });
    }
    logger.info(`✅ ${sampleOrdersData.length} Live Orders seeded with India Post tracking & COD totals`);

    // 10. Call History Records for Telecallers
    const callLogs = [
      { caller: madhuUser, customerName: 'Venkatesh Raman', phone: '9840112233', duration: 184, disposition: CALL_STATUS.ORDER_CONFIRMED, notes: 'Confirmed Ayur Slim Care 500g kit COD' },
      { caller: madhuUser, customerName: 'Rajesh Subramanian', phone: '9840987654', duration: 125, disposition: CALL_STATUS.CONNECTED_INTERESTED, notes: 'Requested diet plan with Slim powder' },
      { caller: sathishUser, customerName: 'Meenakshi Sundaram', phone: '9842155667', duration: 210, disposition: CALL_STATUS.ORDER_CONFIRMED, notes: 'Joint pain relief repeat customer' },
      { caller: sathishUser, customerName: 'Saravanan M', phone: '9845112205', duration: 95, disposition: CALL_STATUS.CALL_LATER, notes: 'In meeting, call evening 5pm' },
      { caller: monikaUser, customerName: 'Raghavan Sampath', phone: '9845019872', duration: 320, disposition: CALL_STATUS.ORDER_CONFIRMED, notes: 'Shipped via Speed Post' }
    ];

    for (const cl of callLogs) {
      await CallHistory.create({
        telecallerId: cl.caller._id,
        branchId: hosurBranch._id,
        customerName: cl.customerName,
        phone: cl.phone,
        durationSeconds: cl.duration,
        callStatus: cl.disposition,
        notes: cl.notes,
        callType: 'OUTBOUND',
        createdAt: new Date()
      });
    }
    logger.info(`✅ ${callLogs.length} Telecaller Calling Logs seeded`);

    // 11. Shipping Partner Configuration
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

    logger.info('🎉 Comprehensive Database Seeding Finished Successfully!');
    return {
      branchesCount: branches.length,
      usersCount: Object.keys(usersMap).length,
      productsCount: products.length,
      customersCount: customers.length,
      leadsCount: seededLeads.length,
      ordersCount: sampleOrdersData.length
    };
  } catch (error) {
    logger.error(`❌ Comprehensive Seeding Failed: ${error.message}`);
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
      process.exit(1);
    }
  })();
}
