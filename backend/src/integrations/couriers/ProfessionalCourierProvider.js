import { CourierInterface } from './CourierInterface.js';
import { SHIPPING_STATUS } from '../../constants/shippingStates.js';

export class ProfessionalCourierProvider extends CourierInterface {
  constructor(config = {}) {
    super('The Professional Courier (TPC)', config);
  }

  async checkServiceability({ pincode }) {
    // Professional Courier network
    const isServiceable = /^[1-9]\d{5}$/.test(pincode);
    return {
      serviceable: isServiceable,
      carrier: 'The Professional Courier',
      estimatedDays: 2
    };
  }

  async getRates({ weightGrams = 500, paymentMethod = 'COD' }) {
    const baseRate = weightGrams <= 500 ? 60 : 60 + Math.ceil((weightGrams - 500) / 500) * 40;
    const codCharge = paymentMethod === 'COD' ? 50 : 0;
    return {
      carrier: 'The Professional Courier',
      serviceType: 'Express Parcel',
      baseRate,
      codCharge,
      totalCharge: baseRate + codCharge
    };
  }

  async generateAWB({ orderNumber, branchCode = 'HSR' }) {
    // Generate TPC format: TPC + 8 digits (e.g. TPC84920194)
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    const awbNumber = `TPC${randomDigits}`;
    return {
      awbNumber,
      carrier: 'The Professional Courier',
      generatedAt: new Date()
    };
  }

  async getTracking({ awbNumber }) {
    return {
      awbNumber,
      carrier: 'The Professional Courier',
      status: SHIPPING_STATUS.OUT_FOR_DELIVERY,
      history: [
        {
          status: SHIPPING_STATUS.SHIPMENT_CREATED,
          location: 'Branch Logistics Desk',
          activity: 'Shipment created & manifest generated',
          timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000)
        },
        {
          status: SHIPPING_STATUS.PICKED_UP,
          location: 'Hosur Main Hub',
          activity: 'Parcel picked up by courier van',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          status: SHIPPING_STATUS.IN_TRANSIT,
          location: 'Regional Transshipment Center',
          activity: 'Arrived at delivery hub',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
        },
        {
          status: SHIPPING_STATUS.OUT_FOR_DELIVERY,
          location: 'Local Delivery Branch',
          activity: 'Out for delivery with delivery agent',
          timestamp: new Date()
        }
      ]
    };
  }

  async cancelShipment({ awbNumber }) {
    return { success: true, awbNumber, message: 'Professional Courier booking cancelled' };
  }
}

export default ProfessionalCourierProvider;
