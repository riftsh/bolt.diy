import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { createScopedLogger } from '~/utils/logger';
import { resolveDbUrl } from './resolve-db-url';
import * as schema from './schema';

const logger = createScopedLogger('Database');

const url = resolveDbUrl();
logger.info(`Initializing SQLite database at ${url}`);

const client = createClient({ url });
export const db = drizzle(client, { schema });

/*
 * ======================
 * Run Migrations
 * ======================
 */
const migrationsFolder =
  process.env.wisp_DATABASE_MIGRATIONS_PATH ??
  (process.env.NODE_ENV === 'production' ? '/app/drizzle' : path.join(process.cwd(), 'drizzle'));

try {
  logger.info(`Running migrations from: ${migrationsFolder}`);

  // Debug info
  const fs = await import('fs');
  const journalPath = path.join(migrationsFolder, 'meta/_journal.json');
  logger.info(`Journal file exists: ${fs.existsSync(journalPath)}`);

  await migrate(db, { migrationsFolder });

  logger.info('Database migrations applied successfully');
} catch (err) {
  logger.error('Failed to apply database migrations:', err);
  throw err;
}

export { schema };
