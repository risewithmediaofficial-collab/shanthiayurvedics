import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const runBackup = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

  logger.info({ backupPath }, 'Initiating scheduled MongoDB automated backup');

  const cmd = `mongodump --uri="${env.MONGODB_URI}" --out="${backupPath}" --gzip`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      logger.error({ error: error.message }, 'MongoDB backup failed');
      return;
    }
    logger.info({ backupPath }, 'MongoDB backup completed successfully');

    // Keep only last 7 days backups
    fs.readdir(BACKUP_DIR, (err, files) => {
      if (err) return;
      const sorted = files.sort();
      if (sorted.length > 7) {
        const toDelete = sorted.slice(0, sorted.length - 7);
        toDelete.forEach((file) => {
          fs.rmSync(path.join(BACKUP_DIR, file), { recursive: true, force: true });
          logger.info({ file }, 'Purged old backup');
        });
      }
    });
  });
};

// If executed directly from CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runBackup();
}
