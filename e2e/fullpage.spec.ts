import type { Page } from '@playwright/test';
import { test, expect, gotoReady } from './fixtures';

// Desktop fullpage scroller: one section per screen, switched by keys, wheel, swipe or the sidebar.
test.describe('desktop fullpage', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'fullpage mode only');
  });

  async function goToSection(page: Page, anchor: string) {
    await page.locator(`#sidebar li[data-menuanchor="${anchor}"] button`).click();
    await expect(page.locator(`#${anchor}`)).toHaveClass(/active/);
    await page.waitForTimeout(1000);
  }

  async function openIgateModal(page: Page) {
    await gotoReady(page, '/?lang=vi');
    await goToSection(page, 'du-an');
    await page.locator('.project-card[data-project-id="igate"] h3').click();
    await expect(page.locator('#project-modal')).toHaveClass(/active/);
  }

  test('keys do not change the section while the modal is open', async ({ page }) => {
    await openIgateModal(page);
    // Fullpage must not swallow the key either, so the modal can scroll with it.
    await page.evaluate(() =>
      window.addEventListener('keydown', (e) => { (window as any).__prevented = e.defaultPrevented; })
    );
    for (const key of ['End', 'PageDown', 'ArrowDown', 'Home']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => (window as any).__prevented), key).toBe(false);
    }
    await expect(page.locator('#du-an')).toHaveClass(/active/);
  });

  test('keys move sections again after the modal closes', async ({ page }) => {
    await openIgateModal(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#project-modal')).not.toHaveClass(/active/);
    await page.waitForTimeout(300);
    // End, not PageDown: PageDown first scrolls a section taller than the screen.
    await page.keyboard.press('End');
    await expect(page.locator('#lien-he')).toHaveClass(/active/);
  });
});
