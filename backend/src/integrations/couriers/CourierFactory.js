import { IndiaPostProvider } from './IndiaPostProvider.js';
import { ProfessionalCourierProvider } from './ProfessionalCourierProvider.js';
import { COURIER_PROVIDERS } from '../../constants/shippingStates.js';
import { AppError } from '../../utils/errors.js';

const providers = {
  [COURIER_PROVIDERS.INDIA_POST]: new IndiaPostProvider(),
  [COURIER_PROVIDERS.PROFESSIONAL_COURIER]: new ProfessionalCourierProvider()
};

export class CourierFactory {
  /**
   * Get provider instance by carrier code
   */
  static getProvider(carrierCode = COURIER_PROVIDERS.INDIA_POST) {
    const provider = providers[carrierCode];
    if (!provider) {
      // Default to India Post Speed Post
      return providers[COURIER_PROVIDERS.INDIA_POST];
    }
    return provider;
  }

  /**
   * List all registered shipping providers
   */
  static listAvailableProviders() {
    return [
      {
        code: COURIER_PROVIDERS.INDIA_POST,
        name: 'India Post Speed Post',
        description: 'National postal network covering all pin codes in India',
        isDefault: true
      },
      {
        code: COURIER_PROVIDERS.PROFESSIONAL_COURIER,
        name: 'The Professional Courier (TPC)',
        description: 'Commercial express parcel service with rapid metro delivery',
        isDefault: false
      }
    ];
  }
}

export default CourierFactory;
