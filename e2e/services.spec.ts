import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect, gotoReady, expectNoHorizontalScroll } from './fixtures';

const load = (lang: string) => JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'));

// Every key path; array items are compared position by position.
function keyPaths(o: any, p = ''): string[] {
  if (Array.isArray(o)) return o.flatMap((v, i) => keyPaths(v, `${p}[${i}]`));
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => keyPaths(v, p ? `${p}.${k}` : k));
  return [p];
}

test.describe('contact links', () => {
  test('home Contact keeps its channels', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    const c = page.locator('#lien-he');
    await expect(c.locator('a[href="mailto:tinnh.pyn@gmail.com"]')).toHaveCount(1);
    await expect(c.locator('a[href="tel:+84856694766"]')).toHaveCount(1);
    await expect(c.locator('a[href="https://t.me/tinnh94"]')).toHaveCount(1);
    await expect(c.locator('a[href="https://github.com/nguyenhoangtin1404"]')).toHaveCount(1);
  });
});

test.describe('translations', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'file check, one project is enough');
  });

  test('services keys match between vi and en', () => {
    const vi = load('vi');
    const en = load('en');
    expect(vi.services, 'vi.services').toBeTruthy();
    expect(keyPaths(en.services).sort()).toEqual(keyPaths(vi.services).sort());
    expect(vi.services.items.map((i: any) => i.id)).toEqual(['website', 'management', 'automation']);
    expect(vi.services.items.map((i: any) => i.price)).toEqual(['Từ 5 triệu', 'Từ 15 triệu', 'Từ 5 triệu']);
    expect(vi.services.process.steps).toHaveLength(4);
    expect(vi.services.whyMe.points).toHaveLength(4);
    expect(vi.services.faq.items).toHaveLength(5);
    expect(vi.layout.nav.services).toBe('Dịch vụ');
    expect(en.layout.nav.services).toBe('Services');
  });
});

test.describe('services page', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  const en = (p: Page) => p.locator('[data-lang-block="en"]');

  test('three services with prices (vi)', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-card')).toHaveCount(3);
    await expect(vi(page).locator('.svc-price')).toHaveText(['Từ 5 triệu', 'Từ 15 triệu', 'Từ 5 triệu']);
    await expect(vi(page).locator('h1')).toBeVisible();
  });

  test('?lang=en shows English', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=en');
    await expect(en(page).locator('h1')).toBeVisible();
    await expect(vi(page).locator('h1')).toBeHidden();
  });

  // Sub pages have no language switcher (BaseLayout hides the sidebar there): the
  // language chosen on the home page is saved and must carry over.
  test('language saved on the home page carries over, title included', async ({ page }) => {
    await gotoReady(page, '/');
    await page.locator('.lang-switcher .lang-option[data-lang="en"]').filter({ visible: true }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await gotoReady(page, '/dich-vu/');
    await expect(en(page).locator('h1')).toBeVisible();
    await expect(vi(page).locator('h1')).toBeHidden();
    await expect(page).toHaveTitle(load('en').services.meta.title);
  });

  test('Zalo and phone links', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const zalo = vi(page).locator('a.svc-zalo');
    await expect(zalo).toHaveCount(2);
    for (const href of await zalo.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toBe('https://zalo.me/84856694766');
    }
    await expect(zalo.first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(vi(page).locator('a.svc-phone')).toHaveAttribute('href', 'tel:+84856694766');
  });

  test('example link only for a project with a detail page', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-example')).toHaveCount(1);
    await expect(vi(page).locator('[data-service-id="management"] .svc-example')).toHaveAttribute('href', '/projects/solo-cafe-order/');
  });

  test('no fullpage script', async ({ page }) => {
    await gotoReady(page, '/dich-vu/');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => typeof (window as any).VanillaFullpage)).toBe('undefined');
  });

  test('no horizontal scroll at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('h1')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('floating Zalo: visible on mobile, hidden on desktop', async ({ page, isMobile }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const floating = page.locator('a.svc-zalo-float');
    await expect(floating).toHaveAttribute('href', 'https://zalo.me/84856694766');
    if (isMobile) await expect(floating).toBeVisible();
    else await expect(floating).toBeHidden();
  });

  test('final CTA is clickable at page bottom on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'floating button is mobile-only');
    await gotoReady(page, '/dich-vu/?lang=vi');
    const phone = vi(page).locator('.svc-cta a.svc-phone');
    await phone.scrollIntoViewIfNeeded();
    // trial: fails if another element (the floating button) would receive the click
    await phone.click({ trial: true, timeout: 3000 });
  });
});

test.describe('site links', () => {
  test('sidebar Dịch vụ link opens /dich-vu/', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sidebar; the mobile bottom bar has no room (see mobile bottom bar)');
    await gotoReady(page, '/?lang=vi');
    const link = page.locator('#sidebar a[href="/dich-vu/"]');
    await expect(link).toHaveAttribute('aria-label', 'Dịch vụ');
    await link.click();
    await expect(page).toHaveURL(/\/dich-vu\/$/);
  });

  test('Contact section links to services', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await expect(page.locator('#lien-he a.contact-services-link')).toHaveAttribute('href', '/dich-vu/');
  });
});

test.describe('mobile bottom bar', () => {
  for (const width of [360, 390]) {
    test(`fits at ${width}px: language and sound controls do not overlap`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'mobile bottom bar');
      await page.setViewportSize({ width, height: 800 });
      await gotoReady(page, '/?lang=vi');
      const bar = page.locator('.sidebar-nav-mobile');
      // Kept off the bottom bar: a fifth icon pushes the sound button off a 360px screen
      await expect(bar.locator('a[href="/dich-vu/"]')).toBeHidden();
      const box = async (sel: string) => (await bar.locator(sel).first().boundingBox())!;
      const lang = await box('.lang-switcher');
      const voice = await box('.voice-toggle');
      const barBox = await box(':scope');
      expect(lang.x + lang.width, 'language switcher ends before the sound button').toBeLessThanOrEqual(voice.x);
      expect(voice.x + voice.width, 'sound button inside the bar').toBeLessThanOrEqual(barBox.x + barBox.width);
    });
  }
});
