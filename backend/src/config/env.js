import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  DB_MAX_POOL_SIZE: z.coerce.number().int().min(2).max(200).default(20),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  MONGO_URI: z
    .string()
    .optional()
    .default(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shanthi_ayurvedas_crm'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().default('shanthi_crm_jwt_super_secret_access_key_2026_!@#$%^&*()'),
  JWT_REFRESH_SECRET: z.string().default('shanthi_crm_jwt_super_secret_refresh_key_2026_!@#$%^&*()'),
  ACCESS_TOKEN_EXPIRES: z.string().default(process.env.ACCESS_TOKEN_EXPIRES || (process.env.NODE_ENV === 'production' ? '15m' : '7d')),
  REFRESH_TOKEN_EXPIRES: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('shanthi_cookie_secret_key_secure_2026_xyz123'),
  FIELD_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  LOG_LEVEL: z.string().default('info'),
  SMTP_HOST: z.string().optional().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('no-reply@shanthiayurvedas.com'),
  WHATSAPP_API_URL: z.string().optional().default('https://graph.facebook.com/v19.0'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default('')
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  const config = result.success ? result.data : envSchema.parse({});
  if (config.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET']) {
      const secret = process.env[key];
      if (!secret || secret.length < 32 || /^(your_|default_|shanthi_)/i.test(secret)) {
        throw new Error(`Set a unique ${key} of at least 32 characters for production.`);
      }
    }
    if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
      throw new Error('Access and refresh secrets must differ.');
    }
  }
  return config;
};

export const env = parseEnv();
