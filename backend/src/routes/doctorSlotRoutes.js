import express from 'express';
import { DoctorSlotController } from '../controllers/doctorSlotController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Allow public or authenticated access to view slots
router.get('/slots', DoctorSlotController.getDoctorsWithSlots);

// Protected routes for booking and managing
router.post('/slots/book', authenticate, DoctorSlotController.bookSlot);
router.patch('/slots/:id/status', authenticate, DoctorSlotController.updateBookingStatus);

export default router;
