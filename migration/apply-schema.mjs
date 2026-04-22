import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }

const sql = readFileSync(new URL('../neon/schema.sql', import.meta.url), 'utf8');
const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query(sql);
  console.log('schema applied');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
} finally {
  await c.end();
}
