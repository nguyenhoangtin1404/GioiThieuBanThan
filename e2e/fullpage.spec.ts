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

  // Tablet rotation / window resize: desktop → mobile layout → desktop.
  async function crossBreakpoint(page: Page) {
    // The fullpage script loads async; cross only once it is running.
    await page.waitForFunction(() => (window as any).vanillaFullpage);
    await page.setViewportSize({ width: 600, height: 900 });
    await page.waitForTimeout(400);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => (window as any).vanillaFullpage);
    await page.waitForTimeout(300);
  }

  test('one instance after crossing the breakpoint', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await crossBreakpoint(page);
    // Count section moves across every live instance.
    await page.evaluate(() => {
      const w = window as any;
      w.__moves = 0;
      const orig = w.VanillaFullpage.prototype.goToSection;
      w.VanillaFullpage.prototype.goToSection = function (i: number) { w.__moves++; return orig.call(this, i); };
    });
    await page.keyboard.press('PageDown');
    await expect(page.locator('#du-an')).toHaveClass(/active/);
    expect(await page.evaluate(() => (window as any).__moves)).toBe(1);
  });

  test('sidebar click after resize changes history once', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await crossBreakpoint(page);
    const before = await page.evaluate(() => history.length);
    await page.locator('#sidebar li[data-menuanchor="lien-he"] button').click();
    await expect(page.locator('#lien-he')).toHaveClass(/active/);
    expect((await page.evaluate(() => history.length)) - before).toBeLessThanOrEqual(1);
  });
});
