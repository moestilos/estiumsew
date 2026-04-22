/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { AdminUser } from './lib/auth';

declare namespace App {
  interface Locals {
    user?: AdminUser;
    isAdmin?: boolean;
  }
}

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly BLOB_READ_WRITE_TOKEN?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
