import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Branch } from '../models/Branch.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { DoctorSlotBooking } from '../models/DoctorSlotBooking.js';
import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { Inventory } from '../models/Inventory.js';
import { StockMovement } from '../models/StockMovement.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { FollowUp } from '../models/FollowUp.js';
import { Order } from '../models/Order.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { Shipment } from '../models/Shipment.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { ShippingPartner } from '../models/ShippingPartner.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { LEAD_SOURCES, LEAD_STATUS, CALL_STATUS } from '../constants/leadStates.js';

export const seedDatabase = async () => {
  try {
    logger.info('🌱 Starting Comprehensive Shanthi Ayurvedas CRM Seeding...');

    // 1. Initialize Default Roles and Permissions
    await RbacService.initializeDefaultRoles();
    logger.info('✅ Roles and Permissions initialized');

    // 2. Seed Default Branches
    const hosurBranch = await Branch.findOneAndUpdate(
      { code: 'HSR' },
      {
        name: 'Hosur Main Branch',
        code: 'HSR',
        branchType: 'COMPANY_OWNED',
        address: {
          street: '14/B, Gandhi Road, Near Bus Stand',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109',
          country: 'India'
        },
        phone: '+91 98421 11223',
        email: 'hosur@shanthiayurvedas.com',
        billerId: '1000058077',
        managerName: 'Anand Manager',
        managerPhone: '+91 98765 00003',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const krishnagiriBranch = await Branch.findOneAndUpdate(
      { code: 'KGI' },
      {
        name: 'Krishnagiri Central Branch',
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
        managerPhone: '+91 98765 00004',
        revenueSharePercent: 15,
        isActive: true
      },
      { upsert: true, new: true }
    );
    logger.info('✅ Branches seeded (Hosur & Krishnagiri)');

    // 3. Seed Users with Argon2id passwords
    const defaultPassword = 'Password@12345';
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

    const seededUsers = {};
    for (const u of usersToSeed) {
      const savedUser = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
      seededUsers[u.email] = savedUser;
    }
    logger.info('✅ Staff accounts seeded');

    // 4. Seed Doctors & Schedules
    const doctorsData = [
      {
        name: 'Dr. Shanthi V (BAMS, MD Ayurveda)',
        category: 'AYURVEDIC_DOCTOR',
        specialization: 'Sandhi Vata / Joint & Spine Care',
        qualification: 'BAMS, MD (Ayurveda)',
        branchId: hosurBranch._id,
        phone: '+91 96299 85345',
        email: 'dr.shanthi@shanthiayurvedas.com',
        consultationFee: 300,
        status: 'AVAILABLE',
        isActive: true,
        weeklySchedule: [1, 2, 3, 4, 5, 6].map((day) => ({
          dayOfWeek: day,
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
          isAvailable: true,
          startTime: '09:30',
          endTime: '17:30',
          slotDurationMinutes: 30,
          maxBookingsPerSlot: 1
        }))
      },
      {
        name: 'Dr. Rajesh Kumar (BAMS, Nadi Pariksha)',
        category: 'SPECIALIST',
        specialization: 'Skin, Scalp & Panchakarma Detox',
        qualification: 'BAMS, Fellowship in Ayurvedic Dermatology',
        branchId: krishnagiriBranch._id,
        phone: '+91 98421 99887',
        email: 'dr.rajesh@shanthiayurvedas.com',
        consultationFee: 350,
        status: 'AVAILABLE',
        isActive: true,
        weeklySchedule: [1, 2, 3, 4, 5, 6].map((day) => ({
          dayOfWeek: day,
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
          isAvailable: true,
          startTime: '10:00',
          endTime: '18:00',
          slotDurationMinutes: 30,
          maxBookingsPerSlot: 1
        }))
      }
    ];

    const seededDoctors = [];
    for (const d of doctorsData) {
      const doc = await Doctor.findOneAndUpdate({ email: d.email }, d, { upsert: true, new: true });
      seededDoctors.push(doc);
    }
    logger.info('✅ Ayurvedic Doctors & Slot Schedules seeded');

    // 5. Seed Ayurvedic Products
    const productsData = [
      {
        name: 'Maha Bhringraj Taila 200ml',
        sku: 'MBT-200',
        category: 'OILS',
        description: 'Traditional hair vitality formulation with Bhringraj, Amla & Brahmi.',
        price: 499,
        mrp: 599,
        costPrice: 190,
        unit: 'Bottle (200ml)',
        taxPercent: 12,
        lowStockThreshold: 20
      },
      {
        name: 'Sandhi Sudha Joint Relief Oil 100ml',
        sku: 'SSO-100',
        category: 'OILS',
        description: 'Fast-acting botanical extract oil for arthritis, knee, and back pain.',
        price: 620,
        mrp: 750,
        costPrice: 220,
        unit: 'Bottle (100ml)',
        taxPercent: 12,
        lowStockThreshold: 15
      },
      {
        name: 'Triphala Churna 250g',
        sku: 'TPC-250',
        category: 'CHURNAS',
        description: 'Digestive colon cleanser and natural detoxifier with Haritaki, Bibhitaki, Amalaki.',
        price: 240,
        mrp: 300,
        costPrice: 85,
        unit: 'Jar (250g)',
        taxPercent: 5,
        lowStockThreshold: 25
      },
      {
        name: 'Ashwagandha Rasayana 500g',
        sku: 'AGR-500',
        category: 'TONICS',
        description: 'Immunity, stamina, and stress-adaptogen herbal rasayana jam.',
        price: 699,
        mrp: 850,
        costPrice: 280,
        unit: 'Jar (500g)',
        taxPercent: 12,
        lowStockThreshold: 15
      },
      {
        name: 'Kumkumadi Radiance Tailam 30ml',
        sku: 'KKT-030',
        category: 'OILS',
        description: 'Precious saffron Ayurvedic night serum for pigmentation and glow.',
        price: 999,
        mrp: 1200,
        costPrice: 380,
        unit: 'Dropper Bottle (30ml)',
        taxPercent: 18,
        lowStockThreshold: 10
      },
      {
        name: 'Shanthi Joint Care 30-Day Kit',
        sku: 'JCK-030',
        category: 'KITS',
        description: 'Complete kit containing Sandhi Oil, Shallaki Vati & Dashamula Decoction.',
        price: 1899,
        mrp: 2400,
        costPrice: 750,
        unit: 'Kit Box',
        taxPercent: 12,
        lowStockThreshold: 10
      }
    ];

    const seededProducts = [];
    const seededBatches = [];

    for (const p of productsData) {
      const prod = await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
      seededProducts.push(prod);

      // Create Batch for each product
      const batchNum = `${p.sku}-B26A`;
      const batch = await ProductBatch.findOneAndUpdate(
        { productId: prod._id, batchNumber: batchNum },
        {
          productId: prod._id,
          batchNumber: batchNum,
          manufacturingDate: new Date('2026-01-15'),
          expiryDate: new Date('2028-01-14'),
          mrp: p.mrp,
          purchasePrice: p.costPrice,
          isActive: true
        },
        { upsert: true, new: true }
      );
      seededBatches.push(batch);

      // Create Inventory in Hosur & Krishnagiri
      await Inventory.findOneAndUpdate(
        { productId: prod._id, batchId: batch._id, branchId: hosurBranch._id },
        {
          productId: prod._id,
          batchId: batch._id,
          branchId: hosurBranch._id,
          availableQuantity: 120,
          reservedQuantity: 5,
          allocatedQuantity: 5
        },
        { upsert: true }
      );

      await Inventory.findOneAndUpdate(
        { productId: prod._id, batchId: batch._id, branchId: krishnagiriBranch._id },
        {
          productId: prod._id,
          batchId: batch._id,
          branchId: krishnagiriBranch._id,
          availableQuantity: 65,
          reservedQuantity: 2,
          allocatedQuantity: 2
        },
        { upsert: true }
      );
    }
    logger.info('✅ Products, Batches & Warehouse Inventory seeded');

    // 6. Seed Customers
    const priyaUser = seededUsers['telecaller.priya@shanthiayurvedas.com'];
    const karthikUser = seededUsers['telecaller.karthik@shanthiayurvedas.com'];

    const customersData = [
      {
        name: 'Venkatesh Raman',
        fatherName: 'Ramanathan K',
        mobile: '9840112233',
        altMobile: '9840112234',
        branchId: hosurBranch._id,
        assignedTelecallerId: priyaUser._id,
        isAppRegistered: true,
        totalOrders: 3,
        totalSpent: 4250,
        addresses: [
          {
            street: '42, Lake View Garden, Rayakottai Road',
            city: 'Hosur',
            state: 'Tamil Nadu',
            pincode: '635109',
            isDefault: true
          }
        ]
      },
      {
        name: 'Meenakshi Sundaram',
        fatherName: 'Sundaramurthy',
        mobile: '9842155667',
        branchId: hosurBranch._id,
        assignedTelecallerId: priyaUser._id,
        isAppRegistered: true,
        totalOrders: 2,
        totalSpent: 3798,
        addresses: [
          {
            street: '18, SIPCOT Phase 1, Near TVS Factory',
            city: 'Hosur',
            state: 'Tamil Nadu',
            pincode: '635126',
            isDefault: true
          }
        ]
      },
      {
        name: 'Kavitha Natarajan',
        fatherName: 'Natarajan M',
        mobile: '9443277889',
        branchId: krishnagiriBranch._id,
        assignedTelecallerId: karthikUser._id,
        isAppRegistered: false,
        totalOrders: 1,
        totalSpent: 1899,
        addresses: [
          {
            street: '55, Anna Nagar 3rd Cross',
            city: 'Krishnagiri',
            state: 'Tamil Nadu',
            pincode: '635001',
            isDefault: true
          }
        ]
      }
    ];

    const seededCustomers = [];
    for (const c of customersData) {
      const cust = await Customer.findOneAndUpdate({ mobile: c.mobile }, c, { upsert: true, new: true });
      seededCustomers.push(cust);
    }
    logger.info('✅ Customers seeded');

    // 7. Seed Leads Pipeline
    const leadsData = [
      {
        name: 'Rajesh Subramanian',
        mobile: '9840987654',
        email: 'rajesh.subramanian@gmail.com',
        source: LEAD_SOURCES.FACEBOOK,
        status: LEAD_STATUS.INTERESTED,
        assignedTo: priyaUser._id,
        branchId: hosurBranch._id,
        city: 'Hosur',
        state: 'Tamil Nadu',
        pincode: '635109',
        notes: 'Inquired about Sandhi Joint Care Kit for mother aged 62'
      },
      {
        name: 'Anitha Jayaram',
        mobile: '9789012345',
        source: LEAD_SOURCES.WHATSAPP,
        status: LEAD_STATUS.ASSIGNED,
        assignedTo: priyaUser._id,
        branchId: hosurBranch._id,
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        notes: 'Looking for Maha Bhringraj hairfall oil'
      },
      {
        name: 'Babu Gounder',
        mobile: '9655123456',
        source: LEAD_SOURCES.CALL,
        status: LEAD_STATUS.CONTACTED,
        assignedTo: karthikUser._id,
        branchId: krishnagiriBranch._id,
        city: 'Krishnagiri',
        state: 'Tamil Nadu',
        pincode: '635001',
        notes: 'Asked about Doctor video consultation for back pain'
      },
      {
        name: 'Divya Parthiban',
        mobile: '9944123456',
        source: LEAD_SOURCES.WEBSITE,
        status: LEAD_STATUS.NEW,
        assignedTo: karthikUser._id,
        branchId: hosurBranch._id,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600028',
        notes: 'Submitted enquiry for Kumkumadi saffron glow serum'
      }
    ];

    for (const l of leadsData) {
      await Lead.findOneAndUpdate({ mobile: l.mobile }, l, { upsert: true, new: true });
    }
    logger.info('✅ Telecaller Leads Pipeline seeded');

    // 8. Seed Doctor Consultation Bookings
    const today = new Date();
    const todaySlotStr = `${today.toISOString().split('T')[0]}`;
    await DoctorSlotBooking.findOneAndUpdate(
      { doctorId: seededDoctors[0]._id, date: todaySlotStr, timeSlot: '11:00 AM' },
      {
        doctorId: seededDoctors[0]._id,
        branchId: hosurBranch._id,
        bookedBy: priyaUser._id,
        date: todaySlotStr,
        timeSlot: '11:00 AM',
        patientName: 'Venkatesh Raman',
        patientMobile: '9840112233',
        consultationType: 'TELEMEDICINE',
        healthConcern: 'Joint Pain / Arthritis',
        status: 'CONFIRMED',
        notes: 'Follow-up on Sandhi Joint Care oil usage'
      },
      { upsert: true }
    );
    logger.info('✅ Doctor consultation bookings seeded');

    // 9. Seed Orders across Lifecycle States
    const sampleOrders = [
      {
        orderNumber: 'ORD-20260826-1001',
        customerId: seededCustomers[0]._id,
        branchId: hosurBranch._id,
        telecallerId: priyaUser._id,
        items: [
          {
            productId: seededProducts[1]._id,
            batchId: seededBatches[1]._id,
            productName: seededProducts[1].name,
            sku: seededProducts[1].sku,
            quantity: 2,
            unitPrice: 620,
            discount: 0,
            total: 1240
          }
        ],
        subtotal: 1240,
        discountTotal: 0,
        shippingCharge: 60,
        grandTotal: 1300,
        status: ORDER_STATUS.CONFIRMED,
        paymentMethod: 'COD',
        paymentStatus: 'COD_PENDING',
        patientDetails: {
          patientName: seededCustomers[0].name,
          fatherName: seededCustomers[0].fatherName,
          mobile: seededCustomers[0].mobile
        },
        deliveryAddress: seededCustomers[0].addresses[0]
      },
      {
        orderNumber: 'ORD-20260826-1002',
        customerId: seededCustomers[1]._id,
        branchId: hosurBranch._id,
        telecallerId: priyaUser._id,
        items: [
          {
            productId: seededProducts[5]._id,
            batchId: seededBatches[5]._id,
            productName: seededProducts[5].name,
            sku: seededProducts[5].sku,
            quantity: 1,
            unitPrice: 1899,
            discount: 0,
            total: 1899
          }
        ],
        subtotal: 1899,
        discountTotal: 100,
        shippingCharge: 0,
        grandTotal: 1799,
        status: ORDER_STATUS.DISPATCHED,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        patientDetails: {
          patientName: seededCustomers[1].name,
          fatherName: seededCustomers[1].fatherName,
          mobile: seededCustomers[1].mobile
        },
        deliveryAddress: seededCustomers[1].addresses[0]
      },
      {
        orderNumber: 'ORD-20260826-1003',
        customerId: seededCustomers[2]._id,
        branchId: krishnagiriBranch._id,
        telecallerId: karthikUser._id,
        items: [
          {
            productId: seededProducts[0]._id,
            batchId: seededBatches[0]._id,
            productName: seededProducts[0].name,
            sku: seededProducts[0].sku,
            quantity: 2,
            unitPrice: 499,
            discount: 0,
            total: 998
          }
        ],
        subtotal: 998,
        discountTotal: 0,
        shippingCharge: 50,
        grandTotal: 1048,
        status: ORDER_STATUS.DELIVERED,
        paymentMethod: 'COD',
        paymentStatus: 'PAID',
        patientDetails: {
          patientName: seededCustomers[2].name,
          fatherName: seededCustomers[2].fatherName,
          mobile: seededCustomers[2].mobile
        },
        deliveryAddress: seededCustomers[2].addresses[0]
      }
    ];

    for (const o of sampleOrders) {
      await Order.findOneAndUpdate({ orderNumber: o.orderNumber }, o, { upsert: true, new: true });
    }
    logger.info('✅ Orders across Lifecycle States seeded');

    // 10. Seed Shipping Partner & Tracking
    await ShippingPartner.findOneAndUpdate(
      { code: 'INDIA_POST' },
      {
        name: 'India Post Speed Post',
        code: 'INDIA_POST',
        trackingUrlTemplate: 'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx?consignmentNo={{awb}}',
        billerId: '1000058077',
        isActive: true
      },
      { upsert: true }
    );
    logger.info('✅ India Post Shipping Partner configuration seeded');

    logger.info('🎉 Database seeding completed with authentic Ayurvedic CRM records!');
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
