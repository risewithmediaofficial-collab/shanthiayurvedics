import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Msg91WhatsAppService } from '../src/services/msg91WhatsAppService.js';
import { env } from '../src/config/env.js';
import './setup.js';

describe('Msg91WhatsAppService', () => {
  describe('formatWhatsAppNumber()', () => {
    it('should format 10-digit Indian phone to 91XXXXXXXXXX', () => {
      expect(Msg91WhatsAppService.formatWhatsAppNumber('9876543210')).toBe('919876543210');
      expect(Msg91WhatsAppService.formatWhatsAppNumber(' 98765-43210 ')).toBe('919876543210');
    });

    it('should preserve already formatted 91XXXXXXXXXX numbers', () => {
      expect(Msg91WhatsAppService.formatWhatsAppNumber('919876543210')).toBe('919876543210');
      expect(Msg91WhatsAppService.formatWhatsAppNumber('+919876543210')).toBe('919876543210');
    });

    it('should return null for invalid phone numbers', () => {
      expect(Msg91WhatsAppService.formatWhatsAppNumber('')).toBeNull();
      expect(Msg91WhatsAppService.formatWhatsAppNumber('12345')).toBeNull();
      expect(Msg91WhatsAppService.formatWhatsAppNumber(null)).toBeNull();
    });
  });

  describe('sendOrderConfirmation()', () => {
    const mockOrder = {
      _id: '6ad8656e4e6a6d6f4afa6f99',
      orderNumber: 'ORD-20261021-TEST001',
      patientDetails: {
        patientName: 'Ramesh Kumar',
        mobile: '9876543210'
      },
      items: [
        { productName: 'Weight Loss Kit', quantity: 1 }
      ],
      paymentMethod: 'COD',
      codAmount: 1800,
      grandTotal: 1800,
      deliveryAddress: {
        street: 'No 15, Gandhi Road',
        city: 'Hosur',
        state: 'Tamil Nadu',
        pincode: '635109'
      }
    };

    it('should handle dry run gracefully when MSG91_AUTHKEY is not configured', async () => {
      const origAuth = env.MSG91_AUTHKEY;
      const origProcAuth = process.env.MSG91_AUTHKEY;
      env.MSG91_AUTHKEY = '';
      process.env.MSG91_AUTHKEY = '';

      const res = await Msg91WhatsAppService.sendOrderConfirmation(mockOrder);
      expect(res.success).toBe(false);
      expect(res.dryRun).toBe(true);

      env.MSG91_AUTHKEY = origAuth;
      process.env.MSG91_AUTHKEY = origProcAuth;
    });

    it('should format payload correctly and invoke fetch when MSG91_AUTHKEY is present', async () => {
      const origAuth = env.MSG91_AUTHKEY;
      env.MSG91_AUTHKEY = 'test_auth_key_123';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'success', message: 'Message queued successfully' })
      });
      global.fetch = mockFetch;

      const res = await Msg91WhatsAppService.sendOrderConfirmation(mockOrder);
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/');
      expect(options.headers.authkey).toBe('test_auth_key_123');

      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.integrated_number).toBe('918884747209');
      expect(parsedBody.payload.template.name).toBe('shanthi_order_confirmed');
      expect(parsedBody.payload.template.namespace).toBe('0366c008_69c0_4b6a_aa0b_740b15b04344');

      const components = parsedBody.payload.template.to_and_components[0].components;
      expect(components.body_1.value).toBe('RAMESH KUMAR');
      expect(components.body_2.value).toBe('ORD-20261021-TEST001');
      expect(components.body_3.value).toContain('WEIGHT LOSS KIT');
      expect(components.body_4.value).toBe('1800');
      expect(components.body_5.value).toContain('COD');

      env.MSG91_AUTHKEY = origAuth;
    });

    it('should return failure without throwing if network fails', async () => {
      const origAuth = env.MSG91_AUTHKEY;
      env.MSG91_AUTHKEY = 'test_auth_key_123';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const res = await Msg91WhatsAppService.sendOrderConfirmation(mockOrder);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Network error');

      env.MSG91_AUTHKEY = origAuth;
    });
  });

  describe('sendOrderDispatched()', () => {
    const mockDispatchedOrder = {
      _id: '6ad8656e4e6a6d6f4afa6f99',
      orderNumber: 'ORD-20261021-TEST001',
      trackingNumber: 'EM022996331IN',
      courierName: 'India Post',
      patientDetails: {
        patientName: 'Ramesh Kumar',
        mobile: '9876543210'
      },
      paymentMethod: 'COD',
      codAmount: 1800,
      grandTotal: 1800
    };

    it('should format dispatch payload correctly and invoke fetch', async () => {
      const origAuth = env.MSG91_AUTHKEY;
      env.MSG91_AUTHKEY = 'test_auth_key_123';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'success', message: 'Dispatch message queued successfully' })
      });
      global.fetch = mockFetch;

      const res = await Msg91WhatsAppService.sendOrderDispatched(mockDispatchedOrder);
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.payload.template.name).toBe('shanthi_order_dispatched');

      const components = parsedBody.payload.template.to_and_components[0].components;
      expect(components.body_1.value).toBe('RAMESH KUMAR');
      expect(components.body_2.value).toBe('ORD-20261021-TEST001');
      expect(components.body_3.value).toBe('India Post');
      expect(components.body_4.value).toBe('EM022996331IN');
      expect(components.body_5.value).toBe('1800');

      env.MSG91_AUTHKEY = origAuth;
    });

    it('should format prepaid dispatch payload with 0 (Prepaid)', async () => {
      const origAuth = env.MSG91_AUTHKEY;
      env.MSG91_AUTHKEY = 'test_auth_key_123';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'success', message: 'Dispatch message queued successfully' })
      });
      global.fetch = mockFetch;

      const res = await Msg91WhatsAppService.sendOrderDispatched({
        ...mockDispatchedOrder,
        paymentMethod: 'ONLINE',
        codAmount: 0
      });
      expect(res.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      const parsedBody = JSON.parse(options.body);
      const components = parsedBody.payload.template.to_and_components[0].components;
      expect(components.body_5.value).toBe('0 (Prepaid)');

      env.MSG91_AUTHKEY = origAuth;
    });

    it('should fail cleanly if order has no tracking number', async () => {
      const res = await Msg91WhatsAppService.sendOrderDispatched({
        ...mockDispatchedOrder,
        trackingNumber: ''
      });
      expect(res.success).toBe(false);
      expect(res.reason).toBe('NO_TRACKING_NUMBER');
    });
  });
});

