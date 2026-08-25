import { ShippingPartner } from '../models/ShippingPartner.js';
import { Lead } from '../models/Lead.js';
import { Branch } from '../models/Branch.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../config/logger.js';
import { LEAD_SOURCES, LEAD_STATUS } from '../constants/leadStates.js';
import { emitToBranch } from '../sockets/index.js';

export const getIntegrations = asyncHandler(async (req, res) => {
  const partners = await ShippingPartner.find().lean();
  return ApiResponse.success(
    res,
    {
      metaLeads: { enabled: true, webhookUrl: '/api/integrations/webhooks/meta' },
      whatsapp: { enabled: true, provider: 'Meta Cloud API' },
      email: { enabled: true, provider: 'SMTP' },
      couriers: partners
    },
    'Integrations status retrieved'
  );
});

export const handleMetaWebhook = asyncHandler(async (req, res) => {
  // Verification challenge from Meta
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.challenge']) {
    return res.send(req.query['hub.challenge']);
  }

  const payload = req.body;
  logger.info({ payload }, 'Meta Webhook Received');

  // Ingest lead from webhook payload
  try {
    const defaultBranch = await Branch.findOne({ isActive: true });
    const leadData = payload?.entry?.[0]?.changes?.[0]?.value?.leadgen_export || payload;

    if (leadData?.name && leadData?.phone_number) {
      const mobile = leadData.phone_number.replace(/\D/g, '').slice(-10);
      const lead = await Lead.create({
        name: leadData.name,
        mobile,
        email: leadData.email,
        source: LEAD_SOURCES.META,
        status: LEAD_STATUS.NEW,
        branchId: defaultBranch._id,
        notes: `Meta Ad Lead: ${leadData.ad_name || 'Campaign'}`
      });

      emitToBranch(defaultBranch._id.toString(), 'lead:assigned', {
        leadId: lead._id,
        name: lead.name,
        source: 'META'
      });
    }
  } catch (err) {
    logger.error(`Error processing Meta lead: ${err.message}`);
  }

  return res.status(200).json({ success: true, message: 'EVENT_RECEIVED' });
});

export const updateCourierCredentials = asyncHandler(async (req, res) => {
  const { code, name, apiKey, apiEndpoint, accountNumber } = req.body;

  const partner = await ShippingPartner.findOneAndUpdate(
    { code },
    {
      name,
      code,
      apiKeyEncrypted: apiKey ? Buffer.from(apiKey).toString('base64') : undefined,
      apiEndpoint,
      accountNumber,
      isActive: true
    },
    { upsert: true, new: true }
  );

  return ApiResponse.success(res, partner, 'Courier partner configuration saved');
});
