import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server', // SSR: necesario para sesiones en cookies
  adapter: vercel(),
  integrations: [react()],
});
