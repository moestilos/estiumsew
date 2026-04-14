import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',       // SSR: necesario para auth con cookies
  adapter: netlify(),
  integrations: [react()],
  vite: {
    define: {
      // Evita warnings de Supabase en SSR
      'process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_REDIRECT_URI': 'undefined',
    },
  },
});
