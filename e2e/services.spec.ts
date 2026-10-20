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
    // Copy fixed by the spec, verbatim
    expect(vi.services.process.steps.map((st: any) => st.title)).toEqual([
      'Trao đổi miễn phí', 'Báo giá & đề xuất rõ ràng', 'Làm & cập nhật tiến độ hằng tuần', 'Bàn giao, hướng dẫn sử dụng, bảo hành'
    ]);
    expect(vi.services.items.map((i: any) => i.benefits)).toEqual([
      ['Giao diện đẹp trên điện thoại', 'Khách tìm thấy trên Google', 'Nút gọi / Zalo / bản đồ', 'Tự sửa nội dung được'],
      ['Quản lý đơn, kho, khách hàng tại một chỗ', 'Dùng trên điện thoại và máy tính', 'Báo cáo doanh thu', 'Phân quyền nhân viên'],
      ['Chatbot trả lời khách 24/7', 'Tự động hóa việc lặp lại (nhập liệu, báo cáo, nhắc việc)', 'Kết nối các công cụ đang dùng']
    ]);
    expect(vi.services.whyMe.points).toEqual([
      '9+ năm, hệ thống lớn cho khu vực công & y tế', 'Làm việc trực tiếp, không qua trung gian', 'Giá rõ ràng trước khi bắt đầu', 'Hỗ trợ sau bàn giao'
    ]);
    // Commercial terms the owner has not approved must not appear
    const viText = JSON.stringify(vi.services);
    for (const claim of ['tên miền', 'máy chủ', 'đặt cọc', 'bảo hành miễn phí', 'sửa lỗi miễn phí', 'báo giá miễn phí']) {
      expect(viText, claim).not.toContain(claim);
    }
    const enText = JSON.stringify(en.services).toLowerCase();
    for (const claim of ['domain', 'hosting', 'deposit', 'free 3-month', 'for free during', 'quote are free']) {
      expect(enText, claim).not.toContain(claim);
    }
    // Phase 1 polish content
    expect(vi.services.trust).toEqual([
      { value: '9+ năm', label: 'xây dựng hệ thống' },
      { value: '10.000+', label: 'cán bộ dùng iOffice' },
      { value: '3 phút → 60 giây', label: 'thời gian báo cáo iGate' }
    ]);
    expect(en.services.trust.map((t: any) => t.value)).toEqual(['9+ years', '10,000+', '3 min → 60 s']);
    const featured = [
      { projectId: 'to-lua-eakar', serviceId: 'website' }, { projectId: 'solo-cafe-order', serviceId: 'management' },
      { projectId: 'dsf-hospital-suite', serviceId: 'management' }, { projectId: 'igate', serviceId: 'automation' }
    ];
    expect(vi.services.featured).toEqual(featured);
    expect(en.services.featured).toEqual(featured);
    expect(vi.services.items.map((i: any) => i.fit)).toEqual([
      'cửa hàng, quán, doanh nghiệp cần có mặt trên Google',
      'quán cà phê, cửa hàng, cơ sở dịch vụ có đơn hàng mỗi ngày',
      'đội ngũ đang mất thời gian cho việc lặp lại'
    ]);
    expect(vi.services.items.map((i: any) => !!i.featured)).toEqual([false, true, false]);
    expect(vi.services.labels).toMatchObject({ featuredTitle: 'Dự án tiêu biểu', fit: 'Phù hợp với', askCard: 'Hỏi giá gói này qua Zalo', popular: 'Phổ biến', call: 'Gọi', photoAlt: 'Nguyễn Hoàng Tín' });
    expect(en.services.labels).toMatchObject({ featuredTitle: 'Featured work', fit: 'Good for', askCard: 'Ask about this on Zalo', popular: 'Popular', call: 'Call', photoAlt: 'Nguyen Hoang Tin' });
    expect(vi.services.labels.cv).toBe('Xem hồ sơ năng lực');
    expect(en.services.labels.cv).toBe('View profile');
    // The home page (the CV) carries nothing about the services page
    expect(vi.layout.nav).toBeUndefined();
    expect(vi.contact.servicesLink).toBeUndefined();
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
    await expect(vi(page).locator('[data-service-id="management"] .svc-example')).toHaveAttribute('href', '/projects/solo-cafe-order/?lang=vi');
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

});

// Same look as the home page: navigation pill, section titles, gradient buttons, glyphs.
test.describe('services page matches the home style', () => {
  test('section titles carry the home underline bar', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const bar = await page.locator('[data-lang-block="vi"] .svc-process h2').evaluate((h) => {
      const s = getComputedStyle(h, '::after');
      return { w: s.width, h: s.height, content: s.content };
    });
    expect(bar).toEqual({ w: '56px', h: '4px', content: '""' });
  });

  test('primary buttons use the home gradient', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const bg = await page.locator('[data-lang-block="vi"] .svc-hero a.svc-zalo').evaluate((a) => getComputedStyle(a).backgroundImage);
    expect(bg).toContain('linear-gradient');
    expect(bg).toContain('rgb(99, 102, 241)');
  });

  test('hero badge and a glyph on every service card', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const vi = page.locator('[data-lang-block="vi"]');
    await expect(vi.locator('.svc-hero .svc-badge')).toHaveText(load('vi').services.labels.badge);
    await expect(vi.locator('.svc-card > .svc-glyph svg')).toHaveCount(3);
  });
});

test.describe('readability', () => {
  // WCAG relative luminance contrast of a CSS rgb() colour against white
  const contrastOnWhite = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
  };

  test('text links meet 4.5:1 on white', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const example = await page.locator('[data-lang-block="vi"] .svc-example').evaluate((a) => getComputedStyle(a).color);
    expect(contrastOnWhite(example)).toBeGreaterThanOrEqual(4.5);
    const cv = await page.locator('.svc-topbar a.svc-cv').evaluate((a) => getComputedStyle(a).color);
    expect(contrastOnWhite(cv)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('home parity details', () => {
  test('buttons are the height of the home buttons', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    const home = (await page.locator('.actions a.primary').first().boundingBox())!.height;
    await gotoReady(page, '/dich-vu/?lang=vi');
    const svc = (await page.locator('[data-lang-block="vi"] .svc-hero a.svc-zalo').boundingBox())!.height;
    expect(Math.abs(svc - home)).toBeLessThanOrEqual(2);
  });

  test('call button keeps a space before the number', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    // Rendered gap between the "·" and the number (innerText keeps a space the layout can collapse)
    const gap = await page.locator('[data-lang-block="vi"] .svc-phone-number').evaluate((num) => {
      const before = num.previousSibling!;
      const dot = before.textContent!.lastIndexOf('·');
      const range = document.createRange();
      range.setStart(before, dot);
      range.setEnd(before, dot + 1);
      return num.getBoundingClientRect().left - range.getBoundingClientRect().right;
    });
    expect(gap).toBeGreaterThanOrEqual(3);
  });

  test('phone number is set to never wrap', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const ws = await page.locator('[data-lang-block="vi"] .svc-phone-number').evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('nowrap');
  });

  test('glyphs and the closing title use the home Contact sizes', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    const c = page.locator('#lien-he');
    const homeGlyph = await c.locator('.glyph').first().evaluate((g) => [g.getBoundingClientRect().width, g.querySelector('svg')!.getBoundingClientRect().width]);
    const homeTitle = await c.locator('h2').evaluate((h) => getComputedStyle(h).fontSize);
    await gotoReady(page, '/dich-vu/?lang=vi');
    const vi = page.locator('[data-lang-block="vi"]');
    const svcGlyph = await vi.locator('.svc-card .svc-glyph').first().evaluate((g) => [g.getBoundingClientRect().width, g.querySelector('svg')!.getBoundingClientRect().width]);
    expect(svcGlyph).toEqual(homeGlyph);
    expect(await vi.locator('.svc-cta h2').evaluate((h) => getComputedStyle(h).fontSize)).toBe(homeTitle);
  });
});

test.describe('polish: hero', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('photo with reserved size and high priority', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const img = vi(page).locator('.svc-hero .svc-photo');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('width', '768');
    await expect(img).toHaveAttribute('height', '768');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(img).toHaveAttribute('alt', 'Nguyễn Hoàng Tín');
  });

  test('title fits on two lines at 1440px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop width');
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const lines = await vi(page).locator('h1').evaluate((h) => Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2);
  });

  test('trust row shows the three stats', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-trust .svc-trust-value')).toHaveText(['9+ năm', '10.000+', '3 phút → 60 giây']);
  });

  test('photo is beside the text on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout');
    await gotoReady(page, '/dich-vu/?lang=vi');
    const text = (await vi(page).locator('.svc-hero-text').boundingBox())!;
    const media = (await vi(page).locator('.svc-hero-media').boundingBox())!;
    expect(media.x).toBeGreaterThan(text.x + text.width - 1);
  });
});

test.describe('polish: featured', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('four cards in order with the right links', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const cards = vi(page).locator('a.svc-featured-card');
    await expect(cards).toHaveCount(4);
    expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('data-project-id')))).toEqual(['to-lua-eakar', 'solo-cafe-order', 'dsf-hospital-suite', 'igate']);
    expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['https://totam.up.railway.app/', '/projects/solo-cafe-order/?lang=vi', '/projects/dsf-hospital-suite/?lang=vi', '/projects/igate/?lang=vi']);
    await expect(cards.first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(cards.first()).toHaveAttribute('target', '_blank');
    await expect(cards.nth(1)).not.toHaveAttribute('target', '_blank');
  });

  test('images are lazy, described and size-reserved', async ({ page }) => {
    await page.route(/\.webp$/, async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const imgs = vi(page).locator('.svc-featured-card img');
    await expect(imgs).toHaveCount(4);
    for (const img of await imgs.all()) {
      await expect(img).toHaveAttribute('loading', 'lazy');
      expect(await img.getAttribute('alt')).toBeTruthy();
      await img.scrollIntoViewIfNeeded();
      expect((await img.boundingBox())!.height, 'height reserved before the image loads').toBeGreaterThan(100);
    }
  });

  test('each featured card is a single focusable link', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('a.svc-featured-card')).toHaveCount(4);
    await expect(vi(page).locator('a.svc-featured-card a, a.svc-featured-card button')).toHaveCount(0);
  });

  test('unknown featured id is skipped', async () => {
    const { resolveFeatured } = await import('../src/components/servicesFeatured');
    const out = resolveFeatured(
      [{ projectId: 'nope', serviceId: 'website' }, { projectId: 'igate', serviceId: 'automation' }, { projectId: 'nolink', serviceId: 'website' }],
      [{ id: 'igate', name: 'iGate', highlight: 'x', cardBackground: '/igate.webp', links: {} }, { id: 'nolink', name: 'n', highlight: '', cardBackground: '/n.webp', links: {} }],
      ['igate']
    );
    expect(out.map((o) => o.id)).toEqual(['igate']);
    expect(out[0]).toMatchObject({ href: '/projects/igate/', external: false, image: '/igate.webp' });
    // The page adds ?lang= for the language it renders
    expect(resolveFeatured([{ projectId: 'igate', serviceId: 'automation' }], [{ id: 'igate', name: 'iGate', links: {} }], ['igate'], 'en')[0].href).toBe('/projects/igate/?lang=en');
  });
});

test.describe('polish: cards', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('fit line, check glyphs and ask button on every card', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-card .svc-fit')).toHaveCount(3);
    await expect(vi(page).locator('[data-service-id="website"] .svc-fit')).toContainText('cửa hàng, quán, doanh nghiệp cần có mặt trên Google');
    await expect(vi(page).locator('.svc-card .svc-benefits .svc-glyph')).toHaveCount(11);
    const ask = vi(page).locator('.svc-card a.svc-ask');
    await expect(ask).toHaveCount(3);
    for (const a of await ask.all()) {
      await expect(a).toHaveAttribute('href', 'https://zalo.me/84856694766');
      await expect(a).toHaveText('Hỏi giá gói này qua Zalo');
    }
  });

  test('management is marked popular', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-card--popular')).toHaveCount(1);
    await expect(vi(page).locator('[data-service-id="management"] .svc-popular')).toHaveText('Phổ biến');
  });

  test('English switch covers the new copy', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.locator('.svc-topbar .svc-lang[data-lang="en"]').click();
    const en = page.locator('[data-lang-block="en"]');
    await expect(en.locator('.svc-trust-value').first()).toHaveText('9+ years');
    await expect(en.locator('[data-service-id="management"] .svc-popular')).toHaveText('Popular');
    await expect(en.locator('h2.svc-title', { hasText: 'Featured work' })).toBeVisible();
    await expect(en.locator('.svc-card a.svc-ask').first()).toHaveText('Ask about this on Zalo');
  });
});

test.describe('polish: mobile', () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, 'mobile only'));
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('bottom bar with Zalo and call; no floating bubble', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(page.locator('a.svc-zalo-float')).toHaveCount(0);
    await expect(page.locator('.svc-contact-bar a.svc-bar-zalo')).toHaveText('Zalo');
    await expect(page.locator('.svc-contact-bar a.svc-bar-zalo')).toHaveAttribute('href', 'https://zalo.me/84856694766');
    await expect(page.locator('.svc-contact-bar a.svc-bar-call')).toHaveAttribute('href', 'tel:+84856694766');
  });

  for (const [width, height] of [[360, 740], [375, 812]]) {
    test(`first price visible on a ${width}x${height} screen, even before images load`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.route(/\.(webp|jpg)$/, async (r) => { await new Promise((res) => setTimeout(res, 2000)); await r.continue(); });
      await gotoReady(page, '/dich-vu/?lang=vi');
      const price = (await vi(page).locator('.svc-price').first().boundingBox())!;
      const bar = (await page.locator('.svc-contact-bar').boundingBox())!;
      expect(price.y + price.height).toBeLessThanOrEqual(bar.y);
    });
  }

  test('sections below the hero keep the 32px rhythm', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const tops = await vi(page).locator('article.services > *').evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return [e.className, r.top, r.bottom] as [string, number, number]; }));
    // From the cards on: only the hero gap is tightened to reach the first price
    for (let i = 2; i < tops.length; i++) {
      expect(tops[i][1] - tops[i - 1][2], `${tops[i - 1][0]} → ${tops[i][0]}`).toBeGreaterThanOrEqual(32);
    }
  });

  test('final CTA clear of the bottom bar', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.documentElement.scrollHeight); });
    await page.waitForTimeout(200);
    const bar = (await page.locator('.svc-contact-bar').boundingBox())!;
    for (const b of await vi(page).locator('.svc-cta a').all()) {
      const box = (await b.boundingBox())!;
      expect(box.y + box.height, 'CTA above the bar').toBeLessThanOrEqual(bar.y);
    }
    const card = (await vi(page).locator('.svc-cta').boundingBox())!;
    expect(card.y + card.height, 'whole CTA card above the bar').toBeLessThanOrEqual(bar.y);
  });
});

test('bottom bar hidden on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await gotoReady(page, '/dich-vu/?lang=vi');
  await expect(page.locator('.svc-contact-bar')).toBeHidden();
});

test.describe('polish: a11y', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('visible 2px focus ring on links, buttons and FAQ', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.keyboard.press('Tab'); // keyboard modality, so :focus-visible applies
    for (const sel of ['.svc-hero a.svc-zalo', '.svc-card a.svc-ask', 'a.svc-featured-card', '.svc-case a.svc-case-ask', '.svc-case a.svc-case-link', '.svc-faq summary']) {
      const el = vi(page).locator(sel).first();
      await el.focus();
      const style = await el.evaluate((e) => [e.matches(':focus-visible'), getComputedStyle(e).outlineWidth, getComputedStyle(e).outlineStyle]);
      expect(style, sel).toEqual([true, '2px', 'solid']);
    }
  });

  test('CV link and language buttons are 44px targets', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    for (const el of await page.locator('.svc-topbar a, .svc-topbar button').all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('no motion under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoReady(page, '/dich-vu/?lang=vi');
    for (const sel of ['.svc-card', '.svc-btn', '.svc-featured-card']) {
      expect(await vi(page).locator(sel).first().evaluate((c) => getComputedStyle(c).transitionDuration), sel).toBe('0s');
    }
  });

  test('FAQ has no native marker and the chevron turns when open', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const s = vi(page).locator('.svc-faq summary').first();
    expect(await s.evaluate((e) => getComputedStyle(e).listStyleType)).toBe('none');
    const before = await s.locator('.svc-chevron').evaluate((e) => getComputedStyle(e).transform);
    await s.click();
    await page.waitForTimeout(300);
    const after = await s.locator('.svc-chevron').evaluate((e) => getComputedStyle(e).transform);
    expect(after).not.toBe(before);
    expect((await s.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('polish: layout details', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');

  test('every section title carries the home bar, featured included', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const titles = vi(page).locator('h2.svc-title');
    await expect(titles).toHaveCount(6);
    for (const h of await titles.all()) {
      const bar = await h.evaluate((e) => { const s = getComputedStyle(e, '::after'); return [s.width, s.height, getComputedStyle(e).fontSize]; });
      expect([bar[0], bar[1]], await h.innerText()).toEqual(['56px', '4px']);
      expect(parseFloat(bar[2]), await h.innerText()).toBeGreaterThanOrEqual(32);
    }
  });

  test('popular chip never covers the card title', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const card = vi(page).locator('[data-service-id="management"]');
    const chip = (await card.locator('.svc-popular').boundingBox())!;
    const title = (await card.locator('> h2').boundingBox())!;
    const overlap = chip.x < title.x + title.width && title.x < chip.x + chip.width && chip.y < title.y + title.height && title.y < chip.y + chip.height;
    expect(overlap).toBe(false);
  });

  test('mobile card: icon beside a left-aligned title', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile layout');
    await gotoReady(page, '/dich-vu/?lang=vi');
    const card = vi(page).locator('[data-service-id="website"]');
    const glyph = (await card.locator('> .svc-glyph').boundingBox())!;
    const title = (await card.locator('> h2').boundingBox())!;
    expect(Math.abs((glyph.y + glyph.height / 2) - (title.y + title.height / 2)), 'same row').toBeLessThan(8);
    expect(title.x).toBeGreaterThan(glyph.x + glyph.width);
    expect(await card.locator('> h2').evaluate((e) => getComputedStyle(e).textAlign)).not.toBe('center');
  });
});

test.describe('polish: review fixes', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  // White text contrast over a translucent dark background, worst case: pure white behind it
  const contrastWhiteOver = (rgba: string) => {
    const [r, g, b, a = 1] = rgba.match(/[\d.]+/g)!.map(Number);
    const lin = (v: number) => { const c = (v * a + 255 * (1 - a)) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return 1.05 / (L + 0.05);
  };

  test('featured card text stays readable over any screenshot', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const card = vi(page).locator('a.svc-featured-card').first();
    const body = await card.locator('.svc-featured-body').evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(contrastWhiteOver(body), 'caption panel').toBeGreaterThanOrEqual(4.5);
    const chip = await card.locator('.svc-featured-chip').evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(contrastWhiteOver(chip), 'chip').toBeGreaterThanOrEqual(4.5);
  });

  test('third trust stat peeks into view on a 375px phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile row');
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const row = (await vi(page).locator('.svc-trust').boundingBox())!;
    const third = (await vi(page).locator('.svc-trust li').nth(2).boundingBox())!;
    expect(third.x, 'third stat starts inside the visible row').toBeLessThan(row.x + row.width - 24);
  });

  test('every link and control is at least 44px tall', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const els = [...(await vi(page).locator('a, summary').all()), ...(await page.locator('.svc-contact-bar a').all())];
    for (const el of els) {
      if (!(await el.isVisible())) continue;
      const h = (await el.boundingBox())!.height;
      expect(h, (await el.innerText()).slice(0, 40)).toBeGreaterThanOrEqual(44);
    }
  });
});

// The home page is the CV for recruiters; the services page is for clients.
// Home never links to services; services links to the CV once.
test.describe('separate audiences', () => {
  test('home page has no link to the services page', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await expect(page.locator('a[href*="dich-vu"]')).toHaveCount(0);
  });

  test('services page has no home navigation pill', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(page.locator('.sidebar-nav')).toBeHidden();
    await expect(page.locator('.sidebar-nav-mobile')).toBeHidden();
  });

  test('exactly one link back to the profile (hồ sơ năng lực)', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const home = await page.locator('a').evaluateAll((as) =>
      as.filter((a) => (a as HTMLElement).offsetParent !== null)
        .map((a) => a.getAttribute('href') || '')
        .filter((h) => h === '/' || h.startsWith('/?') || h.startsWith('/#'))
    );
    expect(home).toEqual(['/?lang=vi']);
    await expect(page.locator('.svc-topbar a.svc-cv')).toHaveText('Xem hồ sơ năng lực');
  });

  test('"see past work" stays on the page', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(page.locator('[data-lang-block="vi"] .svc-hero a.svc-projects')).toHaveAttribute('href', '#du-an-tieu-bieu-vi');
    await expect(page.locator('[data-lang-block="vi"] section#du-an-tieu-bieu-vi')).toHaveCount(1);
    // Ids must be unique: both languages are rendered
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids.length).toBe(new Set(ids).size);
  });

  test('language toggle on the page works on every screen', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.locator('.svc-topbar .svc-lang[data-lang="en"]').click();
    await expect(page.locator('[data-lang-block="en"] h1')).toBeVisible();
    await expect(page).toHaveTitle(load('en').services.meta.title);
    await expect(page.locator('.svc-topbar a.svc-cv')).toHaveText('View profile');
    await expect(page.locator('.svc-topbar a.svc-cv')).toHaveAttribute('href', '/?lang=en');
    await expect(page.locator('.svc-topbar .svc-lang[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('hero text stays inside the screen on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone widths');
  for (const width of [360, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const hero = page.locator('[data-lang-block="vi"] .svc-hero');
    for (const sel of ['h1', '.svc-subtitle', '.svc-actions', '.svc-trust']) {
      const box = (await hero.locator(sel).boundingBox())!;
      expect(box.x + box.width, `${sel} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

test.describe('codex review fixes', () => {
  test('English "see past projects" scrolls to the English featured work', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=en');
    await page.locator('[data-lang-block="en"] .svc-hero a.svc-projects').click();
    await expect(page.locator('[data-lang-block="en"] .svc-featured')).toBeInViewport();
  });

  test('a shared ?lang=en link keeps English on the project pages', async ({ page }) => {
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('lang', 'vi'); sessionStorage.setItem('seeded', '1'); } } catch {} });
    await gotoReady(page, '/dich-vu/?lang=en');
    const en = page.locator('[data-lang-block="en"]');
    await expect(en.locator('[data-service-id="management"] .svc-example')).toHaveAttribute('href', '/projects/solo-cafe-order/?lang=en');
    await en.locator('a.svc-featured-card[data-project-id="igate"]').click();
    await expect(page).toHaveURL(/\/projects\/igate\/\?lang=en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('case study', () => {
  const project = (lang: string) => load(lang).projects.items.find((p: any) => p.id === 'solo-cafe-order');

  for (const lang of ['vi', 'en'] as const) {
    test(`Vibe Cafe told from the project data (${lang})`, async ({ page }) => {
      const p = project(lang);
      const cs = load(lang).services.caseStudy;
      await gotoReady(page, `/dich-vu/?lang=${lang}`);
      const s = page.locator(`[data-lang-block="${lang}"] section.svc-case`);
      await expect(s.locator('h2')).toHaveText(cs.title);
      // Honest framing: a demo the owner built, so benefits and no business results
      await expect(s.locator('.svc-case-tag')).toHaveText(cs.tag);
      await expect(s.locator('.svc-case-problem')).toHaveText(p.problem);
      await expect(s.locator('.svc-case-solution li')).toHaveText(p.tasks);
      await expect(s.locator('.svc-case-impact')).toHaveText(p.impact);
      await expect(s.locator('a.svc-case-demo')).toHaveAttribute('href', p.links.demo);
      await expect(s.locator('a.svc-case-demo')).toHaveAttribute('target', '_blank');
      await expect(s.locator('a.svc-case-demo')).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(s.locator('a.svc-case-detail')).toHaveAttribute('href', `/projects/solo-cafe-order/?lang=${lang}`);
      await expect(s.locator('a.svc-case-ask')).toHaveAttribute('href', 'https://zalo.me/84856694766');
      await expect(s.locator('a.svc-case-ask')).toHaveText(cs.ask);
      const shots = s.locator('figure img');
      await expect(shots).toHaveCount(3);
      for (const img of await shots.all()) {
        await expect(img).toHaveAttribute('loading', 'lazy');
        await expect(img).toHaveAttribute('width', /\d+/);
        await expect(img).toHaveAttribute('height', /\d+/);
        expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(0);
      }
      await expect(s.locator('figcaption')).toHaveText(cs.shots.map((x: any) => x.caption));
    });
  }

  test('sits right after the featured work', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const next = await page.locator('[data-lang-block="vi"] section.svc-featured').evaluate((el) => el.nextElementSibling?.className || '');
    expect(next).toContain('svc-case');
  });

  test('no result claims in the case study copy', () => {
    // Everything the section shows: its own labels and the project text it reads
    const shown = (lang: string) => JSON.stringify([load(lang).services.caseStudy, project(lang)]).toLowerCase();
    for (const claim of ['%', 'doanh thu tăng', 'tăng doanh thu', 'khách hàng thật']) expect(shown('vi'), claim).not.toContain(claim);
    for (const claim of ['%', 'revenue', 'real client', 'increased sales']) expect(shown('en'), claim).not.toContain(claim);
  });
});
