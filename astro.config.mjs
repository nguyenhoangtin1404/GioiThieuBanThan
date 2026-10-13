import { defineConfig } from 'astro/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://www.nguyenhoangtin.com',
  srcDir: 'src',
  // CSS is small (~10 KB): inline it so it doesn't block the first render
  build: {
    inlineStylesheets: 'always'
  },
  server: {
    host: true
  },
  vite: {
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@i18n': path.resolve(__dirname, './src/i18n')
      }
    }
  }
});
