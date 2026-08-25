import { CourierInterface } from './CourierInterface.js';
import { SHIPPING_STATUS } from '../../constants/shippingStates.js';

export class IndiaPostProvider extends CourierInterface {
  constructor(config = {}) {
    super('India Post Speed Post', config);
  }

  async checkServiceability({ pincode }) {
    // India Post covers all standard Indian 6-digit pin codes
    const isServiceable = /^[1-9]\d{5}$/.test(pincode);
    return {
      serviceable: isServiceable,
      carrier: 'India Post Speed Post',
      estimatedDays: 3
    };
  }

  async getRates({ weightGrams = 500, paymentMethod = 'COD' }) {
    // India Post Speed Post Base calculation
    const baseRate = weightGrams <= 500 ? 50 : 50 + Math.ceil((weightGrams - 500) / 500) * 35;
    const codCharge = paymentMethod === 'COD' ? 40 : 0;
    const totalCharge = baseRate + codCharge;
    return {
      carrier: 'India Post',
      serviceType: 'Speed Post',
      baseRate,
      codCharge,
      totalCharge
    };
  }

  async generateAWB({ orderNumber, branchCode = 'HSR' }) {
    // Generate standard India Post AWB format: EM + 9 digits + IN (e.g. EM123456789IN)
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const awbNumber = `EM${randomDigits}IN`;
    return {
      awbNumber,
      carrier: 'India Post',
      generatedAt: new Date()
    };
  }

  async getTracking({ awbNumber }) {
    return {
      awbNumber,
      carrier: 'India Post',
      status: SHIPPING_STATUS.IN_TRANSIT,
      history: [
        {
          status: SHIPPING_STATUS.SHIPMENT_CREATED,
          location: 'Branch Booking Center',
          activity: 'Consignment booked & barcode generated',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          status: SHIPPING_STATUS.PICKED_UP,
          location: 'Hosur RMS Hub',
          activity: 'Dispatched to National Sorting Hub',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
        },
        {
          status: SHIPPING_STATUS.IN_TRANSIT,
          location: 'Regional Sorting Hub',
          activity: 'In transit to destination delivery post office',
          timestamp: new Date()
        }
      ]
    };
  }

  async cancelShipment({ awbNumber }) {
    return { success: true, awbNumber, message: 'India Post consignment cancelled' };
  }
}

export default IndiaPostProvider;
