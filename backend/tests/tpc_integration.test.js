import { describe, it, expect } from 'vitest';
import { TPCMockService } from '../src/integrations/couriers/tpc/TPCMockService.js';
import { TPCLiveService } from '../src/integrations/couriers/tpc/TPCLiveService.js';
import { TPCServiceFactory } from '../src/integrations/couriers/tpc/TPCServiceFactory.js';
import { ProfessionalCourierProvider } from '../src/integrations/couriers/ProfessionalCourierProvider.js';
import { CourierFactory } from '../src/integrations/couriers/CourierFactory.js';
import { COURIER_PROVIDERS } from '../src/constants/shippingStates.js';

describe('TPC Courier Integration Tests', () => {
  it('TPCMockService should correctly verify serviceable PIN codes', async () => {
    const mockService = new TPCMockService();
    const result1 = await mockService.checkServiceability({ pincode: '563130' });
    expect(result1.serviceable).toBe(true);
    expect(result1.city).toBe('Malur Hub');
    expect(result1.isMock).toBe(true);

    const result2 = await mockService.checkServiceability({ pincode: '635109' });
    expect(result2.serviceable).toBe(true);
    expect(result2.city).toBe('Hosur Main Hub');
    expect(result2.isMock).toBe(true);
  });

  it('TPCMockService should reject invalid or unserviceable PIN codes', async () => {
    const mockService = new TPCMockService();
    const invalidPinResult = await mockService.checkServiceability({ pincode: '123' });
    expect(invalidPinResult.serviceable).toBe(false);

    const unserviceableResult = await mockService.checkServiceability({ pincode: '999123' });
    expect(unserviceableResult.serviceable).toBe(false);
  });

  it('TPCMockService should return stock and permit stock requests', async () => {
    const mockService = new TPCMockService();
    const stock1 = await mockService.checkStock();
    expect(stock1.availableCnotes).toBe(98);
    expect(stock1.isMock).toBe(true);

    const reqResult = await mockService.requestStock({ qty: 50 });
    expect(reqResult.success).toBe(true);
    expect(reqResult.requestedQty).toBe(50);
    expect(reqResult.newAvailableCount).toBe(148);
  });

  it('TPCMockService should book shipment with valid parameters and generate TPC AWB', async () => {
    const mockService = new TPCMockService();
    const dummyOrder = {
      orderNumber: 'ORD-2026-TEST',
      deliveryAddress: { pincode: '635109', city: 'Hosur', street: '12 Temple Street' },
      patientDetails: { patientName: 'Sathish Kumar', mobile: '9876543210' },
      grandTotal: 1250,
      paymentMethod: 'ONLINE'
    };

    const booking = await mockService.bookShipment({
      order: dummyOrder,
      packageDetails: { weight: 0.75, pieces: 1 },
      isCod: false
    });

    expect(booking.success).toBe(true);
    expect(booking.awbNumber.startsWith('TPC')).toBe(true);
    expect(booking.refNo).toBe('ORD-2026-TEST');
    expect(booking.isMock).toBe(true);
  });

  it('TPCMockService should reject COD booking when COD is disabled', async () => {
    const mockService = new TPCMockService({ codEnabled: false });
    const dummyOrder = {
      orderNumber: 'ORD-COD-TEST',
      deliveryAddress: { pincode: '635109' },
      patientDetails: { mobile: '9876543210' }
    };

    await expect(
      mockService.bookShipment({
        order: dummyOrder,
        packageDetails: { weight: 0.5 },
        isCod: true
      })
    ).rejects.toThrow(/COD booking is disabled for The Professional Couriers/);
  });

  it('TPCMockService should return HTML label stamped with MOCK/SAMPLE watermark', async () => {
    const mockService = new TPCMockService();
    const labelResult = await mockService.getLabel({
      awbNumber: 'TPC88291029',
      singleCopy: true
    });

    expect(labelResult.html).toContain('SAMPLE / DEMO MODE');
    expect(labelResult.html).toContain('TPC88291029');
    expect(labelResult.html).toContain('THE PROFESSIONAL COURIERS');
  });

  it('TPCMockService should return simulated tracking timeline', async () => {
    const mockService = new TPCMockService();
    const tracking = await mockService.getTracking({ awbNumber: 'TPC88291029' });

    expect(tracking.awbNumber).toBe('TPC88291029');
    expect(tracking.events.length).toBeGreaterThan(0);
    expect(tracking.isMock).toBe(true);
  });

  it('TPCMockService should permit cancellation', async () => {
    const mockService = new TPCMockService();
    const cancelResult = await mockService.cancelShipment({
      awbNumber: 'TPC88291029',
      reason: 'Customer requested change of address'
    });

    expect(cancelResult.success).toBe(true);
    expect(cancelResult.status).toBe('CANCELLED');
    expect(cancelResult.isMock).toBe(true);
  });

  it('TPCLiveService should cleanly reject calls without credentials without falling back to mock', async () => {
    const liveService = new TPCLiveService({
      clientId: '',
      password: ''
    });

    await expect(liveService.checkStock()).rejects.toThrow(/TPC Live credentials not configured/);

    await expect(
      liveService.bookShipment({
        order: { deliveryAddress: { pincode: '635109' }, patientDetails: { mobile: '9876543210' } }
      })
    ).rejects.toThrow(/TPC Live credentials not configured/);
  });

  it('CourierFactory should correctly register ProfessionalCourierProvider', () => {
    const provider = CourierFactory.getProvider(COURIER_PROVIDERS.PROFESSIONAL_COURIER);
    expect(provider instanceof ProfessionalCourierProvider).toBe(true);
    expect(provider.name).toBe('The Professional Courier (TPC)');

    const providers = CourierFactory.listAvailableProviders();
    expect(providers.some((p) => p.code === COURIER_PROVIDERS.PROFESSIONAL_COURIER)).toBe(true);
  });

  it('TPCServiceFactory should report mock configuration correctly', () => {
    const summary = TPCServiceFactory.getConfigSummary();
    expect(summary.mode).toBe('mock');
    expect(summary.isMock).toBe(true);
    expect(summary.hasCredentials).toBe(false);
  });
});
