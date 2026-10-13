import { test, expect, gotoReady, expectNoHorizontalScroll } from './fixtures';

const GREETING = {
  vi: 'Chăm chút từng điểm ảnh',
  en: 'Making pixels pretty and products powerful'
};

test.describe('home page', () => {
  test('hero renders with name, avatar and chat greeting (vi)', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');

    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('.intro h1')).toBeVisible();

    const avatar = page.locator('.avatar');
    await expect(avatar).toBeVisible();
    await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);

    // Typing dots show first, then the message appears (~2.5s).
    const message = page.locator('[data-hero-message]');
    await expect(message).toBeVisible({ timeout: 5_000 });
    await expect(message).toContainText(GREETING.vi);
    await expect(page.locator('[data-hero-typing]')).toBeHidden();

    await expectNoHorizontalScroll(page);
  });

  test('chat greeting is shown in English with ?lang=en', async ({ page }) => {
    await gotoReady(page, '/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('[data-hero-message]')).toContainText(GREETING.en, { timeout: 5_000 });
  });

  test('language switcher toggles vi <-> en', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    const message = page.locator('[data-hero-message]');
    await expect(message).toContainText(GREETING.vi, { timeout: 5_000 });

    const option = (lang: string) =>
      page.locator(`.lang-switcher .lang-option[data-lang="${lang}"]`).filter({ visible: true }).first();

    await option('en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(message).toContainText(GREETING.en);

    await option('vi').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(message).toContainText(GREETING.vi);
  });

  test('chat bubble stays inside the viewport', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await expect(page.locator('[data-hero-message]')).toBeVisible({ timeout: 5_000 });
    const box = await page.locator('.chat-bubble').boundingBox();
    const width = page.viewportSize()!.width;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });

  test('layout mode matches viewport', async ({ page, isMobile }) => {
    await gotoReady(page, '/?lang=vi');
    if (isMobile) {
      await expect(page.locator('body')).toHaveClass(/mobile-layout/);
      // All sections are stacked and reachable by normal scroll.
      for (const id of ['home', 'du-an', 'kinh-nghiem', 'lien-he']) {
        const section = page.locator(`#fullpage > .section[data-anchor="${id}"]`);
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator('h1, h2').first()).toBeVisible();
      }
    } else {
      await expect(page.locator('body')).not.toHaveClass(/mobile-layout/);
    }
  });

  test('visual: hero', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await expect(page.locator('[data-hero-message]')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveScreenshot('home-hero.png');
  });
});
