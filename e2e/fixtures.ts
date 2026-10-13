import { test as base, expect, type Page } from '@playwright/test';

// Block analytics so tests stay deterministic and never send hits.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
    await use(page);
  }
});

export { expect };

export async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
}
