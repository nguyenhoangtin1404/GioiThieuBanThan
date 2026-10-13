import { test, expect, gotoReady, expectNoHorizontalScroll } from './fixtures';

const PROJECTS = ['igate', 'ecabinet', 'ioffice', 'other-projects'];

test.describe('project pages', () => {
  for (const id of PROJECTS) {
    test(`${id} renders without layout breakage`, async ({ page }) => {
      const res = await page.goto(`/projects/${id}/?lang=vi`);
      expect(res?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);

      await expect(page.locator('.pd-title').filter({ visible: true }).first()).toBeVisible();
      await expect(page.locator('.pd-title').filter({ visible: true }).first()).not.toBeEmpty();
      await expectNoHorizontalScroll(page);
    });
  }

  test('detail content follows the page language', async ({ page }) => {
    await gotoReady(page, '/projects/igate/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const title = page.locator('.pd-title').filter({ visible: true });
    await expect(title).toHaveCount(1);
    await expect(title).toHaveText('Administrative Procedure Resolution Information System');
    await expect(page.locator('.back-link')).toContainText('Back to projects');
    await expect(page).toHaveTitle(/^Administrative Procedure/);

    await gotoReady(page, '/projects/igate/?lang=vi');
    await expect(title).toHaveText('Hệ thống Thông tin Giải quyết Thủ tục Hành chính');
    await expect(page.locator('.back-link')).toContainText('Quay lại dự án');
    await expect(page).toHaveTitle(/^Hệ thống Thông tin/);
  });

  test('visual: igate detail', async ({ page }) => {
    await gotoReady(page, '/projects/igate/?lang=vi');
    await expect(page.locator('.pd-title').filter({ visible: true }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('project-igate.png');
  });
});
