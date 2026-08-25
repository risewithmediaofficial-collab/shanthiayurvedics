import { DoctorSlotService } from '../services/doctorSlotService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class DoctorSlotController {
  static async getDoctorsWithSlots(req, res, next) {
    try {
      const { date } = req.query;
      const data = await DoctorSlotService.getDoctorsWithSlots(date);
      return ApiResponse.success(res, data, 'Doctors availability and slots retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async bookSlot(req, res, next) {
    try {
      const booking = await DoctorSlotService.bookSlot(req.body, req.user, req);
      return ApiResponse.created(res, booking, 'Consultation slot successfully booked');
    } catch (err) {
      next(err);
    }
  }

  static async updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const booking = await DoctorSlotService.updateBookingStatus(id, status, req.user, req);
      return ApiResponse.success(res, booking, 'Booking status updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default DoctorSlotController;
