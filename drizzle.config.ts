import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/lib/.server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.wisp_DB_PATH
      ? process.env.wisp_DB_PATH.startsWith('file:')
        ? process.env.wisp_DB_PATH
        : `file:${process.env.wisp_DB_PATH}`
      : 'file:./data/wisp.db',
  },
});
