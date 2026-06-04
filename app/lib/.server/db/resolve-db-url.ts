/**
 * Resolves the SQLite database file path.
 *
 * Priority:
 *  1. `wisp_DB_PATH` environment variable
 *  2. Default: `./data/wisp.db`
 *
 * Bare paths are automatically prefixed with `file:` for libsql/client.
 */
export function resolveDbUrl(): string {
  const envPath = process.env.wisp_DB_PATH;
  const raw = envPath || './data/wisp.db';

  if (raw.startsWith('file:') || raw.startsWith(':memory:') || raw.startsWith('libsql://')) {
    return raw;
  }

  return `file:${raw}`;
}
