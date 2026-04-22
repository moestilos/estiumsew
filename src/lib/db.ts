// ─────────────────────────────────────────────────────────────
//  Cliente Neon (HTTP, serverless-friendly)
//  Uso:
//    const rows = await sql`select * from productos where activo = ${true}`;
// ─────────────────────────────────────────────────────────────
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = import.meta.env.DATABASE_URL as string | undefined;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required');
}

export const sql = neon(DATABASE_URL);
