import { CourierInterface } from './CourierInterface.js';
import { TPCServiceFactory } from './tpc/TPCServiceFactory.js';
import { SHIPPING_STATUS } from '../../constants/shippingStates.js';

export class ProfessionalCourierProvider extends CourierInterface {
  constructor(config = {}) {
    super('The Professional Courier (TPC)', config);
  }

  get tpcService() {
    return TPCServiceFactory.getService();
  }

  get isMock() {
    return TPCServiceFactory.isMockMode();
  }

  /**
   * Check PIN-code serviceability
   */
  async checkServiceability({ pincode }) {
    return this.tpcService.checkServiceability({ pincode });
  }

  /**
   * Search city / hubs
   */
  async searchCity({ areaName }) {
    return this.tpcService.searchCity({ areaName });
  }

  /**
   * Check C-Note stock
   */
  async checkStock() {
    return this.tpcService.checkStock();
  }

  /**
   * Request additional C-notes
   */
  async requestStock({ qty }) {
    return this.tpcService.requestStock({ qty });
  }

  /**
   * Calculate parcel shipping rates
   */
  async getRates({ weightGrams = 500, paymentMethod = 'PREPAID' }) {
    const weightKg = weightGrams / 1000;
    // Standard TPC commercial pricing model
    const baseRate = weightKg <= 0.5 ? 60 : 60 + Math.ceil((weightKg - 0.5) / 0.5) * 40;
    const isCod = paymentMethod === 'COD';
    const codCharge = isCod ? 50 : 0;

    return {
      carrier: 'The Professional Courier (TPC)',
      serviceType: 'Express Parcel (ST)',
      baseRate,
      codCharge,
      totalCharge: baseRate + codCharge,
      weightKg
    };
  }

  /**
   * Book shipment and allocate official AWB
   */
  async bookShipment({ order, packageDetails = {}, isCod = false }) {
    return this.tpcService.bookShipment({ order, packageDetails, isCod });
  }

  /**
   * Backward-compatible generateAWB method
   */
  async generateAWB({ orderNumber, branchCode = 'HSR', order = null }) {
    if (order) {
      const result = await this.bookShipment({ order, isCod: false });
      return {
        awbNumber: result.awbNumber,
        carrier: 'The Professional Courier',
        generatedAt: result.bookingDate || new Date(),
        rawResult: result
      };
    }

    // Direct booking fallback when only order number is provided
    const dummyOrder = {
      orderNumber,
      grandTotal: 100,
      deliveryAddress: { pincode: '635109', city: 'Hosur', street: 'Main Road' },
      patientDetails: { patientName: 'Customer', mobile: '9876543210' }
    };
    const result = await this.tpcService.bookShipment({ order: dummyOrder, isCod: false });
    return {
      awbNumber: result.awbNumber,
      carrier: 'The Professional Courier',
      generatedAt: new Date(),
      rawResult: result
    };
  }

  /**
   * Retrieve printable C-Note label
   */
  async getLabel({ awbNumber, singleCopy = true, shipment = null }) {
    return this.tpcService.getLabel({ awbNumber, singleCopy, shipment });
  }

  /**
   * Synchronize Track & Trace events
   */
  async getTracking({ awbNumber }) {
    return this.tpcService.getTracking({ awbNumber });
  }

  /**
   * Cancel shipment before dispatch
   */
  async cancelShipment({ awbNumber, reason = '' }) {
    return this.tpcService.cancelShipment({ awbNumber, reason });
  }
}

export default ProfessionalCourierProvider;
