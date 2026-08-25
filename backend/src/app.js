import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import pinoHttp from 'pino-http';
import './models/index.js'; // Ensure all Mongoose models are registered
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import followupRoutes from './routes/followupRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import rtoRoutes from './routes/rtoRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import doctorSlotRoutes from './routes/doctorSlotRoutes.js';

const app = express();

app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Branch-ID']
}));

// Global Rate Limiting
if (env.NODE_ENV !== 'test') {
  app.use(globalRateLimiter);
}

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Sanitization & Protection
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

// Request logging (skip in test mode to keep test output clean)
if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url.startsWith('/health') } }));
}

// Health Check Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Phase 2 Routes (Auth & Administration)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit', auditRoutes);

// Phase 3 Routes (Leads, Followups & Customers)
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/customers', customerRoutes);

// Phase 4 & 5 Routes (Products, Inventory & Orders)
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);

// Phase 6, 7 & 8 Routes (Operations, Shipping & RTO)
app.use('/api/operations', operationsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/rto', rtoRoutes);

// Phase 9, 10 & 11 Routes (Dashboard, Reports, Notifications & Integrations)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/doctors', doctorSlotRoutes);

// Base API route placeholder
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Shanthi Ayurvedas CRM API v1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Dynamic API routes will be registered here as phases progress

// 404 Route Handler
app.use('*', (req, res, next) => {
  next(new NotFoundError('Route', `Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
