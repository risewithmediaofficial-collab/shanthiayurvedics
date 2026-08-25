import pino from 'pino';
import { env } from './env.js';

const isDevelopment = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  base: {
    service: 'shanthi-ayurvedas-crm-api'
  }
});
