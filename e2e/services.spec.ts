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

// Same look as the home page: navigation pill, section titles, gradient buttons, glyphs.
test.describe('services page matches the home style', () => {
  test('desktop shows the home navigation pill with services active and a working language switch', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop pill');
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('#sidebar li.sidebar-link')).toHaveClass(/active/);
    await page.locator('.sidebar-nav .lang-option[data-lang="en"]').click();
    await expect(page.locator('[data-lang-block="en"] h1')).toBeVisible();
    await expect(page).toHaveTitle(load('en').services.meta.title);
  });

  test('section buttons in the pill go to that home section', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop pill');
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.locator('#sidebar li[data-menuanchor="du-an"] button').click();
    await expect(page).toHaveURL(/\/\?lang=vi#du-an$/);
  });

  test('back link to the home page', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const back = page.locator('[data-lang-block="vi"] a.svc-back');
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute('href', '/?lang=vi');
  });

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
    await gotoReady(page, '/?lang=vi');
    const contact = await page.locator('#lien-he a.contact-services-link').evaluate((a) => getComputedStyle(a).color);
    expect(contrastOnWhite(contact)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('home parity details', () => {
  test('services item in the pill looks active, like the home item', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop pill');
    await gotoReady(page, '/?lang=vi');
    const homeActiveBg = await page.locator('#sidebar li.active button').evaluate((b) => getComputedStyle(b).backgroundColor);
    await gotoReady(page, '/dich-vu/?lang=vi');
    const link = page.locator('#sidebar li.sidebar-link a');
    await expect(link).toHaveAttribute('aria-current', 'page');
    expect(await link.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe(homeActiveBg);
  });

  test('no dead voice button on the services page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop pill');
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(page.locator('.sidebar-nav [data-voice-toggle]')).toBeHidden();
  });

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
    expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['https://totam.up.railway.app/', '/projects/solo-cafe-order/', '/projects/dsf-hospital-suite/', '/projects/igate/']);
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

  test('English switch covers the new copy', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop pill switch');
    await gotoReady(page, '/dich-vu/?lang=vi');
    await page.locator('.sidebar-nav .lang-option[data-lang="en"]').click();
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

  test('first price visible on a 375x812 screen, even before images load', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route(/\.(webp|jpg)$/, async (r) => { await new Promise((res) => setTimeout(res, 2000)); await r.continue(); });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const price = (await vi(page).locator('.svc-price').first().boundingBox())!;
    const bar = (await page.locator('.svc-contact-bar').boundingBox())!;
    expect(price.y + price.height).toBeLessThanOrEqual(bar.y);
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
    for (const sel of ['a.svc-back', '.svc-hero a.svc-zalo', '.svc-card a.svc-ask', '.svc-faq summary']) {
      const el = vi(page).locator(sel).first();
      await el.focus();
      const style = await el.evaluate((e) => [e.matches(':focus-visible'), getComputedStyle(e).outlineWidth, getComputedStyle(e).outlineStyle]);
      expect(style, sel).toEqual([true, '2px', 'solid']);
    }
  });

  test('back link is a 44px target', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    expect((await vi(page).locator('a.svc-back').boundingBox())!.height).toBeGreaterThanOrEqual(44);
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
