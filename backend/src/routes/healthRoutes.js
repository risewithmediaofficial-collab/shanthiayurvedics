import { Router } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

router.get('/', (req, res) => {
  return ApiResponse.success(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'shanthi-ayurvedas-crm-api'
  }, 'Service is operational');
});

router.get('/live', (req, res) => {
  return ApiResponse.success(res, {
    status: 'ALIVE',
    uptime: process.uptime()
  }, 'Service is live');
});

router.get('/ready', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  const isReady = mongoose.connection.readyState === 1;

  if (!isReady) {
    return ApiResponse.error(res, 'Service not ready: Database disconnected', 503, { dbStatus });
  }

  return ApiResponse.success(res, {
    status: 'READY',
    dependencies: {
      database: dbStatus
    }
  }, 'Service is ready to handle requests');
});

export default router;
