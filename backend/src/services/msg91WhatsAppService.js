import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class Msg91WhatsAppService {
  /**
   * Format phone number to E.164 without plus (e.g., 919876543210)
   */
  static formatWhatsAppNumber(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return digits;
    return null;
  }

  /**
   * Send WhatsApp Order Confirmation notification via MSG91
   */
  static async sendOrderConfirmation(order) {
    try {
      if (!order) return { success: false, reason: 'NO_ORDER' };

      const pat = order.patientDetails || {};
      const addr = order.deliveryAddress || {};
      const rawMobile = pat.mobile || addr.phone || order.customerId?.mobile;
      const formattedPhone = this.formatWhatsAppNumber(rawMobile);

      if (!formattedPhone) {
        logger.warn({ orderNumber: order.orderNumber, rawMobile }, 'MSG91 WhatsApp: Invalid customer mobile number');
        return { success: false, reason: 'INVALID_PHONE' };
      }

      const patientName = (pat.patientName || order.customerId?.name || 'Valued Patient').toUpperCase();
      const orderNumber = String(order.orderNumber || '');

      // Format medicines list
      const itemsList = Array.isArray(order.items) && order.items.length > 0
        ? order.items.map((it) => `${(it.productName || 'Medicine').toUpperCase()} X${it.quantity || 1}`).join(', ')
        : 'AYURVEDIC MEDICINES';

      // Payable amount
      const isCOD = (order.paymentMethod || 'COD') === 'COD';
      const advanceAmount = Number(order.advanceAmount || 0);
      const payableAmount = Math.round(Number(
        isCOD
          ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : Math.max(0, (order.grandTotal || 0) - advanceAmount))
          : order.grandTotal
      ) || 0);

      const paymentMode = isCOD ? 'Cash on Delivery (COD)' : `Prepaid (${order.paymentMethod || 'Online'})`;

      // Delivery Address
      const addressParts = [
        addr.street,
        addr.landmark ? `Landmark: ${addr.landmark}` : null,
        addr.village,
        addr.taluk,
        addr.city || addr.district,
        addr.state ? `${addr.state} - ${addr.pincode || ''}` : addr.pincode
      ].filter(Boolean);
      const formattedAddress = (addressParts.join(', ') || 'Address on file').slice(0, 120);

      const authKey = env.MSG91_AUTHKEY || process.env.MSG91_AUTHKEY;
      if (!authKey) {
        logger.info(
          { orderNumber, phone: formattedPhone, patientName, payableAmount },
          'MSG91_AUTHKEY not configured in .env. WhatsApp order confirmation logged in dry-run mode.'
        );
        return { success: false, reason: 'AUTHKEY_NOT_CONFIGURED', dryRun: true };
      }

      const integratedNumber = env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '918884747209';
      const namespace = env.MSG91_WHATSAPP_NAMESPACE || '0366c008_69c0_4b6a_aa0b_740b15b04344';

      const payload = {
        integrated_number: integratedNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: 'shanthi_order_confirmed',
            language: {
              code: 'en',
              policy: 'deterministic'
            },
            namespace: namespace,
            to_and_components: [
              {
                to: [formattedPhone],
                components: {
                  body_1: {
                    type: 'text',
                    value: patientName
                  },
                  body_2: {
                    type: 'text',
                    value: orderNumber
                  },
                  body_3: {
                    type: 'text',
                    value: itemsList.slice(0, 100)
                  },
                  body_4: {
                    type: 'text',
                    value: String(payableAmount)
                  },
                  body_5: {
                    type: 'text',
                    value: paymentMode
                  },
                  body_6: {
                    type: 'text',
                    value: formattedAddress
                  }
                }
              }
            ]
          }
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': authKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        logger.warn({ status: res.status, data, orderNumber }, 'MSG91 WhatsApp API returned error response');
        return { success: false, status: res.status, data };
      }

      logger.info({ orderNumber, phone: formattedPhone, data }, 'MSG91 WhatsApp order confirmation sent successfully');
      return { success: true, data };
    } catch (err) {
      logger.error({ err: err?.message, orderId: order?._id, orderNumber: order?.orderNumber }, 'Error sending MSG91 WhatsApp order confirmation');
      return { success: false, error: err?.message };
    }
  }
}

export default Msg91WhatsAppService;
