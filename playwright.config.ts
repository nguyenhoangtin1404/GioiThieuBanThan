import { defineConfig, devices } from '@playwright/test';

// Not 4321, so a running `astro dev` is never reused by mistake.
const PORT = 4322;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // HTML report is always produced so each run keeps screenshots as evidence.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02
    }
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: { mode: 'on', fullPage: true }
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      // A full-page capture of the long mobile page can take >5s and then gets
      // silently skipped; evidence.spec.ts already saves the full mobile page.
      use: { ...devices['Pixel 7'], screenshot: { mode: 'on', fullPage: false } }
    }
  ],
  webServer: {
    command: `npm run build && npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
