/**
 * Base abstract interface for Shipping Providers
 */
export class CourierInterface {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  async checkServiceability({ pincode }) {
    throw new Error('Method checkServiceability() must be implemented');
  }

  async getRates({ weightGrams, fromPincode, toPincode, paymentMethod }) {
    throw new Error('Method getRates() must be implemented');
  }

  async createShipment({ order, packingRecord }) {
    throw new Error('Method createShipment() must be implemented');
  }

  async generateAWB({ orderNumber, branchCode }) {
    throw new Error('Method generateAWB() must be implemented');
  }

  async getTracking({ awbNumber }) {
    throw new Error('Method getTracking() must be implemented');
  }

  async cancelShipment({ awbNumber }) {
    throw new Error('Method cancelShipment() must be implemented');
  }
}

export default CourierInterface;
