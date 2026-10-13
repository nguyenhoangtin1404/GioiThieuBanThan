import type { Page } from '@playwright/test';
import { test, expect, gotoReady, expectNoHorizontalScroll } from './fixtures';

import vi from '../src/i18n/translations/vi.json' with { type: 'json' };

const PROJECTS = ['igate', 'ecabinet', 'ioffice', 'other-projects', 'dsf-hospital-suite', 'solo-cafe-order'];
const ITEMS = vi.projects.items as { id: string; type: string }[];
const ALL_IDS = ITEMS.map((i) => i.id);

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

  test('personal project without detail has no page', async ({ request }) => {
    const res = await request.get('/projects/pyn-world/');
    expect(res.status()).toBe(404);
  });

  test('visual: igate detail', async ({ page }) => {
    await gotoReady(page, '/projects/igate/?lang=vi');
    await expect(page.locator('.pd-title').filter({ visible: true }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('project-igate.png');
  });
});

// --- Projects section on the home page (filter + cards) ---

async function gotoProjects(page: Page, isMobile: boolean, lang: 'vi' | 'en' = 'vi') {
  await gotoReady(page, `/?lang=${lang}`);
  const section = page.locator('#fullpage > .section[data-anchor="du-an"]');
  if (isMobile) {
    await section.scrollIntoViewIfNeeded();
  } else {
    await page.locator('#sidebar li[data-menuanchor="du-an"] button').click();
    await page.locator('#fullpage > .section[data-anchor="du-an"].active').waitFor();
  }
  // The title fades in with the section.
  await page.locator('.projects-header h2.fade-in-visible').waitFor();
  return section;
}

// Cards fade in when revealed (per card on mobile); wait until one is interactive.
async function readyCard(page: Page, id: string) {
  const card = page.locator(`.project-card[data-project-id="${id}"]`);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/fade-in-visible/);
  return card;
}


test.describe('projects section', () => {
  test('shows every project, no filter or type labels', async ({ page, isMobile }) => {
    await gotoProjects(page, isMobile);
    await expect(page.locator('.project-card')).toHaveCount(ITEMS.length);
    await expect(page.locator('.project-filter, .project-badge')).toHaveCount(0);
  });

  test('links do not open the modal', async ({ page, isMobile, context }) => {
    await gotoProjects(page, isMobile);
    const card = await readyCard(page, 'pyn-world');
    await expect(card.locator('.project-detail-btn')).toHaveCount(0);
    await expect(card).toHaveAttribute('data-has-detail', 'false');

    const github = card.locator('a.project-link[data-link="github"]');
    await expect(github).toHaveAttribute('href', 'https://github.com/nguyenhoangtin1404/pyn-world');
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('rel', /noopener/);
    await context.route('https://github.com/**', (r) => r.fulfill({ body: 'ok' }));
    const [popup] = await Promise.all([context.waitForEvent('page'), github.click()]);
    await popup.close();
    await expect(page.locator('#project-modal')).not.toHaveClass(/active/);

    await card.locator('h3').click();
    await expect(page.locator('#project-modal')).not.toHaveClass(/active/);
  });

  test('work card opens modal', async ({ page, isMobile }) => {
    await gotoProjects(page, isMobile);
    await (await readyCard(page, 'igate')).locator('h3').click();
    await expect(page.locator('#project-modal')).toHaveClass(/active/);
    await expect(page.locator('#project-modal [data-pd-title]')).toContainText('Hệ thống Thông tin');
  });

  for (const lang of ['vi', 'en'] as const) {
    test(`card backgrounds exist (${lang})`, async ({ page, request, isMobile }) => {
      test.skip(isMobile, 'same assets on every viewport');
      await gotoProjects(page, false, lang);
      // Language switch rewrites backgrounds client-side after load.
      await page.waitForTimeout(1000);
      const urls = await page.locator('.project-card .card-background').evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).style.backgroundImage.match(/url\(["']?([^"')]+)/)?.[1] || '')
      );
      for (const url of urls.filter(Boolean)) {
        expect((await request.get(url)).status(), url).toBe(200);
      }
    });
  }

  test('every card button has the same height', async ({ page, isMobile }) => {
    await gotoProjects(page, isMobile);
    for (const id of ALL_IDS) await readyCard(page, id);
    const heights = await page.locator('.project-card .project-detail-btn, .project-card .project-link').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().height))
    );
    expect(heights.length).toBeGreaterThan(3);
    expect(new Set(heights).size, heights.join(',')).toBe(1);
  });

  test('card text follows the language switch', async ({ page, isMobile }) => {
    await gotoProjects(page, isMobile);
    await page.locator('.lang-switcher .lang-option[data-lang="en"]').filter({ visible: true }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.project-card[data-project-id="solo-cafe-order"] .highlight')).toContainText('QR ordering');
    await expect(page.locator('.project-card[data-project-id="dsf-hospital-suite"] .highlight')).toContainText('Booking');
  });
});

test.describe('projects bento grid', () => {
  test('every card fits in the section on desktop, featured tile is 2x2', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      await gotoProjects(page, false);
      for (const id of ALL_IDS) await readyCard(page, id);
      const vh = size.height;
      for (const id of ALL_IDS) {
        const box = (await page.locator(`.project-card[data-project-id="${id}"]`).boundingBox())!;
        expect(box.y + box.height, `${id} bottom at ${size.width}x${size.height}`).toBeLessThanOrEqual(vh + 1);
      }
      const feature = (await page.locator('.project-card[data-size="feature"]').boundingBox())!;
      const base = (await page.locator('.project-card[data-project-id="to-lua-eakar"]').boundingBox())!;
      expect(feature.width).toBeGreaterThan(base.width * 1.9);
      expect(feature.height).toBeGreaterThan(base.height * 1.9);
    }
  });

  test('featured video plays only while the section is shown', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.route('**/pyn-world.mp4', (r) => r.fulfill({ status: 404, body: '' }));
    await gotoReady(page, '/?lang=vi');
    const video = page.locator('.project-card[data-size="feature"] video.card-video');
    await expect(video).not.toHaveAttribute('src', /mp4/);
    await page.locator('#sidebar li[data-menuanchor="du-an"] button').click();
    await expect(video).toHaveAttribute('src', /\/pyn-world\.mp4$/);
  });

  test('reduced motion never loads the video', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoProjects(page, isMobile);
    await readyCard(page, 'pyn-world');
    await expect(page.locator('video.card-video')).not.toHaveAttribute('src', /mp4/);
  });

  test('no horizontal scroll in projects on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await gotoProjects(page, true);
    for (const id of ALL_IDS) await readyCard(page, id);
    const overflow = await page.locator('.projects-grid').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('visual: projects section', async ({ page, isMobile }) => {
    // Reduced motion keeps the featured video off so the screenshot is stable.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const section = await gotoProjects(page, isMobile);
    for (const id of ALL_IDS) await readyCard(page, id);
    await page.evaluate(() =>
      Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {})))
    );
    await page.mouse.move(0, 0);
    await expect(section).toHaveScreenshot('projects-section.png');
  });
});
