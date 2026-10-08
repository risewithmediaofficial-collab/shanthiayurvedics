import { TPCServiceInterface } from './TPCServiceInterface.js';
import { AppError } from '../../../utils/errors.js';
import { SHIPPING_STATUS } from '../../../constants/shippingStates.js';
import { logger } from '../../../config/logger.js';

/**
 * TPC Live Service
 * Real HTTP integration for The Professional Couriers (TPC) Web API.
 * Strict credential enforcement: throws if credentials are not configured.
 * Does NOT silently fall back to mock in live mode.
 */
export class TPCLiveService extends TPCServiceInterface {
  constructor(config = {}) {
    super();
    this.baseUrl = (config.baseUrl || 'https://www.tpcglobe.com').replace(/\/+$/, '');
    this.clientId = config.clientId || '';
    this.password = config.password || '';
    this.senderCode = config.senderCode || '';
    this.senderDetails = {
      name: config.senderName || 'Shanthi Ayurvedas',
      address: config.senderAddress || 'No 45 Ayur Bhavan, Main Road',
      city: config.senderCity || 'Hosur',
      pincode: config.senderPincode || '635109',
      mobile: config.senderMobile || '9876543210',
      email: config.senderEmail || 'orders@shanthiayurvedas.com',
      gstin: config.senderGstin || '33AAAAA0000A1Z5'
    };
    this.timeoutMs = config.timeoutMs || 10000;
    this.codEnabled = Boolean(config.codEnabled);
  }

  /**
   * Validate that credentials exist. Throws actionable AppError if missing.
   */
  _requireCredentials() {
    if (!this.clientId || !this.password) {
      throw new AppError(
        'TPC Live credentials not configured. Please supply TPC_CLIENT_ID and TPC_PASSWORD in environment settings.',
        500
      );
    }
  }

  /**
   * Helper to scrub sensitive credentials from URLs for logging
   */
  _sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.searchParams.has('tpcpwd')) parsed.searchParams.set('tpcpwd', '***REDACTED***');
      if (parsed.searchParams.has('PSWD')) parsed.searchParams.set('PSWD', '***REDACTED***');
      return parsed.toString();
    } catch {
      return url.replace(/tpcpwd=[^&]+/gi, 'tpcpwd=***REDACTED***').replace(/PSWD=[^&]+/gi, 'PSWD=***REDACTED***');
    }
  }

  /**
   * Execute authenticated HTTP request with timeout
   */
  async _request(path, options = {}) {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const sanitizedUrl = this._sanitizeUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      logger.info(`[TPC-Live] Calling ${options.method || 'GET'} ${sanitizedUrl}`);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          ...(options.headers || {})
        }
      });

      clearTimeout(timer);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        throw new AppError(`TPC server responded with status ${response.status}: ${text.slice(0, 200)}`, response.status);
      }

      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new AppError(`TPC API request timed out after ${this.timeoutMs}ms (${sanitizedUrl})`, 504);
      }
      logger.error(`[TPC-Live] Request failed (${sanitizedUrl}):`, err.message);
      throw err;
    }
  }

  /**
   * Check PIN-code serviceability
   * Endpoint: GET /tpcwebservice/PINcodeService.ashx?pincode={pincode}
   */
  async checkServiceability({ pincode }) {
    if (!pincode || !/^[1-9]\d{5}$/.test(pincode.toString().trim())) {
      throw new AppError('A valid 6-digit Indian PIN code is required.', 400);
    }

    const cleanPin = pincode.toString().trim();
    const data = await this._request(`/tpcwebservice/PINcodeService.ashx?pincode=${cleanPin}`);

    // Parse TPC service response
    // Response can be JSON array or object or text indicating service station
    let isServiceable = false;
    let hubName = '';
    let state = '';

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      isServiceable = Boolean(item.Serviceable || item.City || item.Pincode || item.Station || item.Status !== 'Not Serviceable');
      hubName = item.City || item.Station || item.Area || '';
      state = item.State || '';
    } else if (data && typeof data === 'object') {
      isServiceable = !data.error && data.status !== 'Not Serviceable' && data.status !== 'failed';
      hubName = data.City || data.Station || data.city || '';
    } else if (typeof data === 'string') {
      isServiceable = !data.toLowerCase().includes('not serviceable') && !data.toLowerCase().includes('invalid');
      hubName = data;
    }

    return {
      serviceable: isServiceable,
      carrier: 'The Professional Courier (TPC)',
      pincode: cleanPin,
      city: hubName || 'TPC Service Network',
      state,
      estimatedDays: isServiceable ? 2 : null,
      message: isServiceable ? `Serviceable via TPC ${hubName || 'network'}` : 'PIN code not serviced by TPC network',
      isMock: false
    };
  }

  /**
   * Search serviceable cities / hubs
   * Endpoint: POST /TPCWebservice/PINcodeCitysearch.ashx?AreaName={city}
   */
  async searchCity({ areaName }) {
    if (!areaName) return [];
    const encoded = encodeURIComponent(areaName.trim());
    const data = await this._request(`/TPCWebservice/PINcodeCitysearch.ashx?AreaName=${encoded}`, {
      method: 'POST'
    });

    if (Array.isArray(data)) {
      return data.map((item) => ({
        areaName: item.AreaName || item.Area || item.City || areaName,
        city: item.City || areaName,
        pincode: item.Pincode || ''
      }));
    }
    return [];
  }

  /**
   * Check Consignment Note Stock
   * Endpoint: GET /tpcwebservice/ClientCnoteStock.ashx?client={client}&tpcpwd={pwd}
   */
  async checkStock() {
    this._requireCredentials();
    const data = await this._request(
      `/tpcwebservice/ClientCnoteStock.ashx?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}`
    );

    let count = 0;
    if (Array.isArray(data) && data.length > 0) {
      const respData = data[0]?.['Response Data'] || data[0];
      const avail = respData?.['Available stocks'] || respData;
      count = parseInt(avail?.['No of Cnotes'] || avail?.available || '0', 10);
    } else if (data && typeof data === 'object') {
      const respData = data['Response Data'] || data;
      const avail = respData['Available stocks'] || respData;
      count = parseInt(avail['No of Cnotes'] || avail.available || '0', 10);
    }

    if (Number.isNaN(count)) count = 0;

    return {
      availableCnotes: count,
      status: count > 20 ? 'SUFFICIENT' : count > 0 ? 'LOW' : 'DEPLETED',
      message: `Available C-Notes in TPC account: ${count}`,
      isMock: false
    };
  }

  /**
   * Request Additional Consignment Notes
   * Endpoint: GET /TPCWebService/CnoteRequest.ashx?client={client}&tpcpwd={pwd}&Qty={qty}
   */
  async requestStock({ qty = 100 }) {
    this._requireCredentials();
    const data = await this._request(
      `/TPCWebService/CnoteRequest.ashx?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}&Qty=${qty}`
    );

    return {
      success: true,
      requestedQty: qty,
      response: data,
      message: `Consignment note allocation request of ${qty} sent to TPC station`,
      isMock: false
    };
  }

  /**
   * Book Shipment (PickupRequest or CODBooking)
   * Endpoints:
   *   - Standard: POST /TPCWebService/PickupRequest.ashx?client={client}&tpcpwd={pwd}
   *   - COD: POST /TPCWebService/CODBooking.ASHX?client={client}&tpcpwd={pwd}
   */
  async bookShipment({ order, packageDetails = {}, isCod = false }) {
    this._requireCredentials();

    if (isCod && !this.codEnabled) {
      throw new AppError(
        'COD booking is disabled for this TPC account. Please select Prepaid payment.',
        400
      );
    }

    const recipientAddress = order.deliveryAddress || {};
    const recipientName = order.patientDetails?.patientName || order.customerId?.name || 'Customer';
    const recipientMobile = (order.patientDetails?.mobile || order.customerId?.mobile || '').replace(/\D/g, '').slice(-10);

    if (!recipientAddress.pincode || !/^[1-9]\d{5}$/.test(recipientAddress.pincode)) {
      throw new AppError('Valid 6-digit delivery PIN code required for booking.', 400);
    }
    if (!recipientMobile || recipientMobile.length !== 10) {
      throw new AppError('Valid 10-digit customer mobile number required for booking.', 400);
    }

    const weightKg = (Number(packageDetails.weight) || 0.5).toFixed(2);
    const pieces = String(packageDetails.pieces || 1);
    const length = String(packageDetails.length || 15);
    const width = String(packageDetails.width || 12);
    const height = String(packageDetails.height || 10);
    const orderNumber = order.orderNumber || String(order._id);
    const invoiceAmt = Number(order.grandTotal || 0).toFixed(2);

    const bdate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const payload = {
      REF_NO: orderNumber,
      BDATE: bdate,
      SENDER: this.senderDetails.name,
      SENDER_CODE: this.senderCode || '1234',
      SENDER_ADDRESS: this.senderDetails.address,
      SENDER_CITY: this.senderDetails.city,
      SENDER_PINCODE: this.senderDetails.pincode,
      SENDER_MOB: this.senderDetails.mobile,
      SENDER_EMAIL: this.senderDetails.email,
      GSTIN: this.senderDetails.gstin,
      RECIPIENT: recipientName,
      RECIPIENT_COMPANY: '',
      RECIPIENT_ADDRESS: `${recipientAddress.street || ''}, ${recipientAddress.city || ''}`.trim(),
      RECIPIENT_CITY: recipientAddress.city || 'City',
      RECIPIENT_PINCODE: recipientAddress.pincode,
      RECIPIENT_MOB: recipientMobile,
      RECIPIENT_EMAIL: order.patientDetails?.email || order.customerId?.email || 'customer@gmail.com',
      WEIGHT: weightKg,
      PIECES: pieces,
      RECIPIENT_GSTIN: '',
      FLYER_NO: '',
      CUST_INVOICE: orderNumber,
      CUST_INVOICEAMT: invoiceAmt,
      VOL_LENGTH: length,
      VOL_WIDTH: width,
      VOL_HEIGHT: height,
      DESCRIPTION: 'Ayurvedic Herbal Health Products',
      REMARKS: 'Fragile herbal bottles - Handle with care',
      COD_AMOUNT: isCod ? invoiceAmt : '0.00',
      PAYMENT_MODE: isCod ? 'CASH' : 'PREPAID',
      TYPE: 'PICKUP',
      ORDER_STATUS: 'CONFIRMED',
      MODE: 'ST', // Surface Transit
      SERVICE: 'STD',
      POD_NO: ''
    };

    const endpoint = isCod
      ? `/TPCWebService/CODBooking.ASHX?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}`
      : `/TPCWebService/PickupRequest.ashx?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}`;

    const response = await this._request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Handle TPC booking response format
    // Success sample: {"POD_NO": "Saved Successfully with Cons No COD1112122752", "ID": "2921497", "status": "success", "error": "0"}
    // or {"POD_NO": "BLR12345678", "status": "success", "error": "0"}
    // Error sample: {"status": "failed", "Desc": "Duplicate Order no", "error": "1"}
    if (response.error === '1' || response.status === 'failed' || response.error_description) {
      const errMsg = response.Desc || response.error_description || response.message || response.error || 'TPC Booking failed';
      throw new AppError(`TPC Booking Error: ${errMsg}`, 400);
    }

    let awbNumber = response.POD_NO || response.pod_no || response.CNOTE_NO || '';
    // Extract AWB if wrapped in "Saved Successfully with Cons No XYZ"
    const match = awbNumber.match(/Cons No\s+([A-Za-z0-9]+)/i);
    if (match) {
      awbNumber = match[1];
    }

    if (!awbNumber) {
      throw new AppError('TPC response did not contain an allocated AWB / Consignment number.', 502);
    }

    return {
      success: true,
      awbNumber,
      refNo: orderNumber,
      podNo: awbNumber,
      cnoteNo: awbNumber,
      bookingDate: new Date(),
      isCod,
      mode: 'ST',
      service: 'STD',
      isMock: false,
      rawResponse: response
    };
  }

  /**
   * Get Shipping Label
   * Endpoints:
   *   - Standard A4: GET /TPCWebService/CnotePrinting.aspx?client={client}&tpcpwd={pwd}&podno={awb}
   *   - Single Copy: GET /TPCWebService/CnotePrintingsingle.aspx?client={client}&tpcpwd={pwd}&podno={awb}
   */
  async getLabel({ awbNumber, singleCopy = true, shipment = null }) {
    this._requireCredentials();
    const endpoint = singleCopy ? 'CnotePrintingsingle.aspx' : 'CnotePrinting.aspx';
    const labelUrl = `${this.baseUrl}/TPCWebService/${endpoint}?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}&podno=${encodeURIComponent(awbNumber)}`;

    return {
      url: labelUrl,
      awbNumber,
      singleCopy,
      isMock: false
    };
  }

  /**
   * Real-time Track & Trace
   * Endpoint: GET /TPCWebService/tracktracejsonnew.ashx?podno={awb}&client={client}&tpcpwd={pwd}
   */
  async getTracking({ awbNumber }) {
    this._requireCredentials();
    const data = await this._request(
      `/TPCWebService/tracktracejsonnew.ashx?podno=${encodeURIComponent(awbNumber)}&client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}`
    );

    if (data?.error === '1' || data?.error_description || data?.message?.error === '1') {
      const desc = data?.error_description || data?.message?.description || 'No tracking information found';
      return {
        awbNumber,
        status: SHIPPING_STATUS.SHIPMENT_CREATED,
        isDelivered: false,
        events: [],
        message: desc,
        isMock: false
      };
    }

    const rawList = Array.isArray(data) ? data : data ? [data] : [];
    const events = [];
    let currentStatus = SHIPPING_STATUS.SHIPMENT_CREATED;
    let isDelivered = false;

    for (const item of rawList) {
      const activity = item.Activity || item.Remarks || '';
      const actLower = activity.toLowerCase();
      let status = SHIPPING_STATUS.IN_TRANSIT;

      if (actLower.includes('delivered')) {
        status = SHIPPING_STATUS.DELIVERED;
        currentStatus = SHIPPING_STATUS.DELIVERED;
        isDelivered = true;
      } else if (actLower.includes('out for delivery')) {
        status = SHIPPING_STATUS.OUT_FOR_DELIVERY;
        if (currentStatus !== SHIPPING_STATUS.DELIVERED) currentStatus = SHIPPING_STATUS.OUT_FOR_DELIVERY;
      } else if (actLower.includes('picked') || actLower.includes('despatched') || actLower.includes('outbound')) {
        status = SHIPPING_STATUS.PICKED_UP;
        if (currentStatus === SHIPPING_STATUS.SHIPMENT_CREATED) currentStatus = SHIPPING_STATUS.IN_TRANSIT;
      } else if (actLower.includes('booking completed')) {
        status = SHIPPING_STATUS.SHIPMENT_CREATED;
      }

      // Date format from TPC: DD/MM/YYYY and HH:MM
      let eventDate = new Date();
      const dateStr = item.T_Date || item.Date;
      const timeStr = item.T_Time || item.Time;
      if (dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const [hh, mm] = (timeStr || '00:00').split(':').map((n) => parseInt(n, 10));
          eventDate = new Date(y, m, d, hh || 0, mm || 0);
        }
      }

      events.push({
        status,
        location: item.City || 'TPC Hub',
        activity: activity || 'Shipment in transit',
        timestamp: eventDate,
        rawData: item
      });
    }

    return {
      awbNumber,
      status: currentStatus,
      isDelivered,
      events,
      isMock: false
    };
  }

  /**
   * Cancel Shipment
   * Endpoint: GET /TPCWebService/CancelCnoteBKG.ashx?client={client}&tpcpwd={pwd}&podno={awb}
   */
  async cancelShipment({ awbNumber, reason = '' }) {
    this._requireCredentials();
    const data = await this._request(
      `/TPCWebService/CancelCnoteBKG.ashx?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}&podno=${encodeURIComponent(awbNumber)}`
    );

    if (data.error === '1' || data.status === 'failed') {
      const errMsg = data.status || data.error || 'TPC Cancellation rejected';
      throw new AppError(`Cancellation failed: ${errMsg}`, 400);
    }

    return {
      success: true,
      awbNumber,
      status: 'CANCELLED',
      message: 'Consignment booking successfully cancelled in TPC network',
      isMock: false,
      response: data
    };
  }

  /**
   * Modify Shipment details before dispatch
   * Endpoint: POST /tpCWebService/PickupAddon.ashx?client={client}&tpcpwd={pwd}
   */
  async modifyShipment({ awbNumber, packageDetails = {} }) {
    this._requireCredentials();
    const payload = {
      POD_NO: awbNumber,
      WEIGHT: String(packageDetails.weight || '0.5'),
      PIECES: String(packageDetails.pieces || '1'),
      CONTENT: 'Ayurvedic Health Products',
      DECLARED_VALUE: String(packageDetails.declaredValue || '500'),
      CUST_INVOICE: packageDetails.invoiceNumber || '',
      CUST_INVOICEAMT: String(packageDetails.invoiceAmount || '500')
    };

    const data = await this._request(
      `/tpCWebService/PickupAddon.ashx?client=${encodeURIComponent(this.clientId)}&tpcpwd=${encodeURIComponent(this.password)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );

    return {
      success: true,
      awbNumber,
      message: 'Shipment specifications updated in TPC network',
      isMock: false,
      response: data
    };
  }
}

export default TPCLiveService;
