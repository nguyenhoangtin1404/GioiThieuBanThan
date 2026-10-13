import type { Page, TestInfo } from '@playwright/test';
import { test, gotoReady } from './fixtures';

// Saves a named PNG under test-results/ and attaches it to the HTML report.
async function snap(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

// Captures every section and page on each run as evidence (attached to the HTML report).
// Waits until reveal animations inside `scope` have been triggered and finished.
async function settle(page: Page, scope: string) {
  await page.waitForFunction((sel) => {
    const root = document.querySelector(sel);
    if (!root) return false;
    const fades = [...root.querySelectorAll('.fade-in-item')].every((el) => el.classList.contains('fade-in-visible'));
    const slides = [...root.querySelectorAll('[data-slide-in]')].every((el) => el.classList.contains('slide-in-visible'));
    return fades && slides;
  }, scope, { timeout: 15_000 });
  // Only one-shot CSS transitions; the floating chat bubble animation loops forever.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {})))
  );
}

// Scrolls through the page so scroll-triggered reveals fire, then returns to top.
async function revealAll(page: Page) {
  // Re-read scrollHeight each step: images loading can make the page grow.
  const step = page.viewportSize()!.height / 2;
  for (let y = step; y < (await page.evaluate(() => document.documentElement.scrollHeight)); y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await settle(page, '#fullpage');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

// snap() already captures everything; skip the automatic end-of-test screenshot.
test.use({ screenshot: 'off' });

const SECTIONS = ['home', 'du-an', 'kinh-nghiem', 'lien-he'];
const PROJECTS = ['igate', 'ecabinet', 'ioffice', 'other-projects'];

for (const lang of ['vi', 'en'] as const) {
  test(`evidence: home sections (${lang})`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(90_000);
    await gotoReady(page, `/?lang=${lang}`);
    await page.locator('[data-hero-message]').waitFor({ state: 'visible', timeout: 5_000 });

    if (isMobile) {
      // Mobile is one long scroll page: reveal everything, then grab it whole.
      await revealAll(page);
      await snap(page, testInfo, `home-${lang}-full`, true);
      return;
    }

    // Desktop uses fullpage.js: one section per screen, navigate via the sidebar menu.
    for (const anchor of SECTIONS) {
      await page.locator(`#sidebar li[data-menuanchor="${anchor}"] button`).click();
      const section = `#fullpage > .section[data-anchor="${anchor}"]`;
      await page.locator(`${section}.active`).waitFor();
      // The page resets and replays reveal animations shortly after a section turns active.
      await page.waitForTimeout(600);
      await settle(page, section);
      await snap(page, testInfo, `home-${lang}-${anchor}`);
    }
  });
}

test('evidence: project pages', async ({ page }, testInfo) => {
  for (const id of PROJECTS) {
    await gotoReady(page, `/projects/${id}/?lang=vi`);
    await page.locator('.pd-title').filter({ visible: true }).first().waitFor();
    await snap(page, testInfo, `project-${id}`, true);
  }
});
