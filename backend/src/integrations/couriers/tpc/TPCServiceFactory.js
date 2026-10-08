import { env } from '../../../config/env.js';
import { TPCLiveService } from './TPCLiveService.js';
import { TPCMockService } from './TPCMockService.js';

let serviceInstance = null;

export class TPCServiceFactory {
  /**
   * Get the active TPC service instance (Mock or Live based on TPC_MODE)
   */
  static getService() {
    if (serviceInstance) {
      return serviceInstance;
    }

    const config = {
      baseUrl: env.TPC_BASE_URL,
      clientId: env.TPC_CLIENT_ID,
      password: env.TPC_PASSWORD,
      senderCode: env.TPC_SENDER_CODE,
      senderName: env.TPC_SENDER_NAME,
      senderAddress: env.TPC_SENDER_ADDRESS,
      senderCity: env.TPC_SENDER_CITY,
      senderPincode: env.TPC_SENDER_PINCODE,
      senderMobile: env.TPC_SENDER_MOB,
      senderEmail: env.TPC_SENDER_EMAIL,
      senderGstin: env.TPC_SENDER_GSTIN,
      codEnabled: env.TPC_COD_ENABLED,
      timeoutMs: env.TPC_TIMEOUT_MS
    };

    if (env.TPC_MODE === 'live') {
      serviceInstance = new TPCLiveService(config);
    } else {
      serviceInstance = new TPCMockService(config);
    }

    return serviceInstance;
  }

  /**
   * Force re-instantiation (useful for tests or runtime toggles)
   */
  static resetService() {
    serviceInstance = null;
  }

  /**
   * Return current mode string ('mock' | 'live')
   */
  static getMode() {
    return env.TPC_MODE || 'mock';
  }

  /**
   * Check if current mode is mock
   */
  static isMockMode() {
    return this.getMode() === 'mock';
  }

  /**
   * Return safe configuration summary for frontend display (WITHOUT secrets!)
   */
  static getConfigSummary() {
    return {
      mode: this.getMode(),
      isMock: this.isMockMode(),
      baseUrl: env.TPC_BASE_URL,
      hasCredentials: Boolean(env.TPC_CLIENT_ID && env.TPC_PASSWORD),
      senderCode: env.TPC_SENDER_CODE || '',
      senderCity: env.TPC_SENDER_CITY || 'Hosur',
      codEnabled: Boolean(env.TPC_COD_ENABLED),
      trackingSyncEnabled: Boolean(env.TPC_TRACKING_SYNC_ENABLED)
    };
  }
}

export default TPCServiceFactory;
