import type { Page } from '@playwright/test';
import { test, expect, gotoReady } from './fixtures';

declare global {
  interface Window { __played: string[] }
}

// Record play()/pause() of audio instead of producing sound (the projects tile video is not narration).
async function stubAudio(page: Page) {
  await page.addInitScript(() => {
    window.__played = [];
    HTMLMediaElement.prototype.play = function () {
      if (!(this instanceof HTMLVideoElement)) window.__played.push(this.src);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      if (!(this instanceof HTMLVideoElement)) window.__played.push('pause');
    };
  });
}

const played = (page: Page) => page.evaluate(() => window.__played);
const lastPlayed = async (page: Page) => (await played(page)).filter((p) => p !== 'pause').pop() || '';
const toggle = (page: Page) => page.locator('[data-voice-toggle]').filter({ visible: true }).first();

async function goToSection(page: Page, isMobile: boolean, anchor: string) {
  if (isMobile) {
    await page.locator(`#fullpage > .section[data-anchor="${anchor}"]`).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  } else {
    await page.locator(`#sidebar li[data-menuanchor="${anchor}"] button`).click();
    await page.locator(`#fullpage > .section[data-anchor="${anchor}"].active`).waitFor();
    // fullpage ignores navigation while its 800 ms transition runs
    await page.waitForTimeout(900);
  }
}

test.describe('voice narration', () => {
  test('off by default', async ({ page }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await page.locator('.intro h1').click();
    await page.waitForTimeout(300);
    expect(await played(page)).toEqual([]);
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle(page)).toHaveAttribute('aria-label', 'Bật giọng đọc');
  });

  test('toggle plays current section', async ({ page }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await expect.poll(() => lastPlayed(page)).toMatch(/\/audio\/home-vi\.mp3$/);
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle(page)).toHaveAttribute('aria-label', 'Tắt giọng đọc');
  });

  test('section change plays new file', async ({ page, isMobile }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await goToSection(page, isMobile, 'du-an');
    await expect.poll(() => lastPlayed(page)).toMatch(/du-an-vi\.mp3$/);
    await goToSection(page, isMobile, 'home');
    await page.waitForTimeout(500);
    expect(await lastPlayed(page)).toMatch(/du-an-vi\.mp3$/); // home not replayed
  });

  test('latest section wins', async ({ page, isMobile }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    if (isMobile) {
      await goToSection(page, true, 'du-an');
      await goToSection(page, true, 'kinh-nghiem');
    } else {
      // Earliest a second fullpage navigation is accepted.
      await goToSection(page, false, 'du-an');
      await page.locator('#sidebar li[data-menuanchor="kinh-nghiem"] button').click();
    }
    await expect.poll(() => lastPlayed(page), { timeout: 5000 }).toMatch(/kinh-nghiem-vi\.mp3$/);
    const log = await played(page);
    const last = log.map((p) => p.endsWith('kinh-nghiem-vi.mp3')).lastIndexOf(true);
    expect(log.slice(0, last)).toContain('pause');
  });

  test('language switch stops and switches files', async ({ page, isMobile }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await expect.poll(() => lastPlayed(page)).toMatch(/home-vi\.mp3$/);
    const before = (await played(page)).length;
    await page.locator('.lang-switcher .lang-option[data-lang="en"]').filter({ visible: true }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect((await played(page)).slice(before)).toContain('pause');
    await expect(toggle(page)).toHaveAttribute('aria-label', 'Turn voice off');
    await goToSection(page, isMobile, 'du-an');
    await expect.poll(() => lastPlayed(page)).toMatch(/du-an-en\.mp3$/);
  });

  test('returning to a narrated section stops the current audio', async ({ page, isMobile }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await goToSection(page, isMobile, 'du-an');
    await expect.poll(() => lastPlayed(page)).toMatch(/du-an-vi\.mp3$/);
    const before = (await played(page)).length;
    await goToSection(page, isMobile, 'home');
    await expect.poll(async () => (await played(page)).slice(before)).toContain('pause');
  });

  test('saved preference waits for a real gesture and retries', async ({ page }) => {
    // Like real browsers: play() is refused until a click-type gesture happened.
    await page.addInitScript(() => {
      window.__played = [];
      let gesture = false;
      document.addEventListener('click', () => { gesture = true; }, true);
      HTMLMediaElement.prototype.play = function () {
        if (!gesture) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
        window.__played.push(this.src);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () { window.__played.push('pause'); };
      localStorage.setItem('voice', 'on');
    });
    await gotoReady(page, '/?lang=vi');
    const h1 = page.locator('.intro h1');
    const box = (await h1.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down(); // pointerdown alone is not a media gesture
    await page.waitForTimeout(200);
    expect(await played(page)).toEqual([]);
    await page.mouse.up(); // completes the click
    await expect.poll(() => lastPlayed(page)).toMatch(/home-vi\.mp3$/);
  });

  test('preference persists', async ({ page }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    expect(await played(page)).toEqual([]); // nothing before a user gesture
    await page.locator('.intro h1').click();
    await expect.poll(() => lastPlayed(page)).toMatch(/home-vi\.mp3$/);
  });

  test('missing file stays silent', async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/audio/*.mp3', (r) => r.fulfill({ status: 404, body: '' }));
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await goToSection(page, isMobile, 'du-an');
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  });

  test('tab hidden pauses', async ({ page }) => {
    await stubAudio(page);
    await gotoReady(page, '/?lang=vi');
    await toggle(page).click();
    await expect.poll(() => lastPlayed(page)).toMatch(/home-vi\.mp3$/);
    const before = (await played(page)).length;
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await played(page)).slice(before)).toContain('pause');
  });
});
