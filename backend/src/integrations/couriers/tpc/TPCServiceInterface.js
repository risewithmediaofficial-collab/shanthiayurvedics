/**
 * TPC Service Interface
 * Defines the standard contract for The Professional Couriers (TPC) API implementations.
 * Both Live and Mock engines adhere strictly to this interface.
 */
export class TPCServiceInterface {
  /**
   * Check if a 6-digit PIN code is serviceable by TPC
   * @param {Object} params
   * @param {string} params.pincode
   * @returns {Promise<{ serviceable: boolean, city?: string, state?: string, estimatedDays?: number, message?: string, isMock: boolean }>}
   */
  async checkServiceability({ pincode }) {
    throw new Error('checkServiceability() must be implemented');
  }

  /**
   * Area / City search to lookup service hubs
   * @param {Object} params
   * @param {string} params.areaName
   * @returns {Promise<Array<{ areaName: string, city: string, pincode?: string }>>}
   */
  async searchCity({ areaName }) {
    throw new Error('searchCity() must be implemented');
  }

  /**
   * Check remaining consignment note stock allocated to the account
   * @returns {Promise<{ availableCnotes: number, totalAllocated?: number, used?: number, status: string, isMock: boolean }>}
   */
  async checkStock() {
    throw new Error('checkStock() must be implemented');
  }

  /**
   * Request additional consignment note allocation
   * @param {Object} params
   * @param {number} params.qty
   * @returns {Promise<{ success: boolean, requestedQty: number, message: string, isMock: boolean }>}
   */
  async requestStock({ qty }) {
    throw new Error('requestStock() must be implemented');
  }

  /**
   * Book a shipment (PickupRequest or CODBooking)
   * @param {Object} params
   * @param {Object} params.order
   * @param {Object} params.packageDetails
   * @param {boolean} params.isCod
   * @returns {Promise<{ success: boolean, awbNumber: string, refNo: string, podNo: string, cnoteNo: string, isMock: boolean, [key: string]: any }>}
   */
  async bookShipment({ order, packageDetails, isCod }) {
    throw new Error('bookShipment() must be implemented');
  }

  /**
   * Generate or retrieve official C-Note printable label (A4 or single-copy)
   * @param {Object} params
   * @param {string} params.awbNumber
   * @param {boolean} [params.singleCopy]
   * @param {Object} [params.shipment]
   * @returns {Promise<{ html?: string, url?: string, awbNumber: string, isMock: boolean }>}
   */
  async getLabel({ awbNumber, singleCopy, shipment }) {
    throw new Error('getLabel() must be implemented');
  }

  /**
   * Fetch real-time track and trace events
   * @param {Object} params
   * @param {string} params.awbNumber
   * @returns {Promise<{ awbNumber: string, status: string, isDelivered: boolean, events: Array<{ status: string, location: string, activity: string, timestamp: Date, rawData?: any }>, isMock: boolean }>}
   */
  async getTracking({ awbNumber }) {
    throw new Error('getTracking() must be implemented');
  }

  /**
   * Cancel consignment note before dispatch
   * @param {Object} params
   * @param {string} params.awbNumber
   * @param {string} [params.reason]
   * @returns {Promise<{ success: boolean, awbNumber: string, message: string, isMock: boolean }>}
   */
  async cancelShipment({ awbNumber, reason }) {
    throw new Error('cancelShipment() must be implemented');
  }

  /**
   * Modify shipment details before dispatch (weight, pieces, invoice)
   * @param {Object} params
   * @param {string} params.awbNumber
   * @param {Object} params.packageDetails
   * @returns {Promise<{ success: boolean, awbNumber: string, message: string, isMock: boolean }>}
   */
  async modifyShipment({ awbNumber, packageDetails }) {
    throw new Error('modifyShipment() must be implemented');
  }
}

export default TPCServiceInterface;
