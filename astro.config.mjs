import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://profilio.local',
  srcDir: 'src',
  server: {
    host: true
  }
});
