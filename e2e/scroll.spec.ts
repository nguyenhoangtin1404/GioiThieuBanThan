import type { Page } from '@playwright/test';
import { test, expect, gotoReady } from './fixtures';

// On tablet and desktop the page is a fullpage scroller: each section is one screen high.
// A section taller than the screen (Experience on a landscape tablet) must scroll its own
// content to the end before the wheel, a swipe or the arrow keys move to the next section.
test.describe('long sections in fullpage mode', () => {
  test.use({ viewport: { width: 1133, height: 744 }, hasTouch: true });

  const experience = (page: Page) => page.locator('#kinh-nghiem');
  const lastTask = (page: Page) => page.locator('#kinh-nghiem .timeline-item').last().locator('li').last();

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'fullpage mode only');
    await gotoReady(page, '/?lang=vi');
    await page.locator('#sidebar li[data-menuanchor="kinh-nghiem"] button').click();
    await expect(experience(page)).toHaveClass(/active/);
    await page.waitForTimeout(1000);
    const overflow = await experience(page).evaluate((s) => s.scrollHeight - s.clientHeight);
    expect(overflow, 'Experience must be taller than the screen for this test').toBeGreaterThan(100);
  });

  test('wheel scrolls the content before moving to the next section', async ({ page }) => {
    await page.mouse.move(500, 400);
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(120);
      if (await experience(page).evaluate((s) => s.scrollTop + s.clientHeight >= s.scrollHeight - 1)) break;
    }
    await expect(experience(page)).toHaveClass(/active/);
    await expect(lastTask(page)).toBeInViewport();

    await page.waitForTimeout(600);
    await page.mouse.wheel(0, 300);
    await expect(page.locator('#lien-he')).toHaveClass(/active/);
  });

  test('arrow keys scroll the content before moving to the next section', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(500);
      if (await experience(page).evaluate((s) => s.scrollTop + s.clientHeight >= s.scrollHeight - 1)) break;
    }
    await expect(experience(page)).toHaveClass(/active/);
    await expect(lastTask(page)).toBeInViewport();
    await page.keyboard.press('PageDown');
    await expect(page.locator('#lien-he')).toHaveClass(/active/);
  });

  test('coming back up from the next section lands at the end of the content', async ({ page }) => {
    await page.locator('#kinh-nghiem').evaluate((s) => { s.scrollTop = s.scrollHeight; });
    await page.waitForTimeout(600);
    await page.keyboard.press('PageDown');
    await expect(page.locator('#lien-he')).toHaveClass(/active/);
    await page.waitForTimeout(1200);
    await page.keyboard.press('PageUp');
    await expect(experience(page)).toHaveClass(/active/);
    await expect(lastTask(page)).toBeInViewport();
  });
});
