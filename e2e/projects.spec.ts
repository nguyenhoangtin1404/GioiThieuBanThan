import { test, expect, gotoReady, expectNoHorizontalScroll } from './fixtures';

const PROJECTS = ['igate', 'ecabinet', 'ioffice', 'other-projects'];

test.describe('project pages', () => {
  for (const id of PROJECTS) {
    test(`${id} renders without layout breakage`, async ({ page }) => {
      const res = await page.goto(`/projects/${id}/?lang=vi`);
      expect(res?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);

      await expect(page.locator('.pd-title').first()).toBeVisible();
      await expect(page.locator('.pd-title').first()).not.toBeEmpty();
      await expectNoHorizontalScroll(page);
    });
  }

  test('visual: igate detail', async ({ page }) => {
    await gotoReady(page, '/projects/igate/?lang=vi');
    await expect(page.locator('.pd-title').first()).toBeVisible();
    await expect(page).toHaveScreenshot('project-igate.png');
  });
});
