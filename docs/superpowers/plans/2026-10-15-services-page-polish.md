# Services page polish (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/dich-vu/` look as professional as the home page and win an SME owner's trust on the first screen: show the owner's photo, real numbers and past projects, make cards actionable, keep one-tap contact on mobile, and fix keyboard and motion gaps.

**Architecture:**
- New content comes from the `services` key in the translation JSON. Featured work reuses `projects.items` by id.
- Featured work gets its own `src/components/ServicesFeatured.astro`. Everything else stays in `src/components/Services.astro` and `src/pages/dich-vu.astro`.
- Each task adds Playwright tests to `e2e/services.spec.ts`, and each test fails before its change.

**Tech Stack:** Astro 6 static build, Playwright 1.56 (screenshot baselines are made in `mcr.microsoft.com/playwright:v1.56.1-noble`).

**Spec:** `docs/superpowers/specs/2026-10-15-services-page-polish-design.md` (builds on `2026-10-15-services-page-design.md`)

## Global Constraints

- **Zalo labels (spec §7):** every Zalo button's visible text contains the word "Zalo".
- **Brand:** reuse the existing site tokens (`--accent`, `--muted`, `--text`, `--surface-weak`, `--radius-lg`, `--radius-md`), the gradient `linear-gradient(135deg, var(--accent), #6366f1)` with text `#010409`, and `#0369a1` for accent text. Introduce no new palette and no new fonts.
- **Mobile breakpoint:** `<768px`. No horizontal scroll at 360px. Interactive targets are ≥44px tall.
- **Zalo / phone:** `CONTACT.zaloHref` = `https://zalo.me/84856694766`, `CONTACT.phoneHref` = `tel:+84856694766` (both from `src/config/contact.ts`).
- **External links:** `target="_blank" rel="noopener noreferrer"`.
- **vi/en:** both keep identical key paths in `services`; the existing test `services keys match between vi and en` must stay green.
- **Home page:** unchanged. The 6 `visual:` screenshot tests must pass in the CI Docker image with no baseline updates.
- **Checks:** `npx astro check` reports 0 errors. Local e2e runs use `--grep-invert visual`.

## Review Focus

- **Slow image load on a phone.** The hero photo and featured images must not shift the layout or push the price below the fold while loading → Task 2 and Task 3 tests reserve the size (`width`/`height` on the photo, `aspect-ratio` on featured images) and measure the price position before images load (`page.route` delays `*.webp`).
- **Language switch on desktop.** The trust row, the featured chips, the fit lines and the "Popular" chip all switch to English; nothing stays Vietnamese → Task 4 test `English switch covers the new copy`.
- **iPhone safe area and the bottom bar.** The final call to action stays clickable above the bar at the real page bottom → Task 5 test `final CTA clear of the bottom bar` (replaces the floating-button version).
- **Keyboard user on the featured cards.** Each card is one link with a visible focus ring, not nested links → Task 3 test `each featured card is a single focusable link`.
- **A featured `projectId` that no longer exists.** That card is skipped and the page still renders → Task 3 test `unknown featured id is skipped` (run against a fixture prop through the component's pure helper; see Task 3 Interfaces).

---

### Task 1: Content model

**Files:**
- Modify: `src/i18n/translations/vi.json`, `src/i18n/translations/en.json` (inside `services`)
- Test: `e2e/services.spec.ts`. Extend `translations` → `services keys match between vi and en`.

**Interfaces:**
- **Produces:**
  - `services.trust: { value: string; label: string }[]` (exactly 3)
  - `services.featured: { projectId: string; serviceId: 'website'|'management'|'automation' }[]`
  - `services.labels.{ featuredTitle, fit, askCard, popular, call, photoAlt }`
  - `services.items[].fit: string`
  - `services.items[].featured?: true` (on `management` only)

- [ ] **Step 1: Extend the parity test with the spec's values.**

```ts
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
```

The key-path parity check fails if `featured: true` exists only on one item in one language. Add it to `management` in both files.

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g translations --project=desktop`. Expected: FAIL (`trust` undefined).
- [ ] **Step 3: Add the keys to both JSON files.** Keep the `json.dumps(..., ensure_ascii=False, indent=2) + "\n"` round-trip format. en `fit` lines:
  - "shops, cafés and businesses that need to be found on Google"
  - "cafés, shops and service businesses with daily orders"
  - "teams losing time to repetitive work"
- [ ] **Step 4: Run it again.** Expected: PASS. Also run `npx playwright test e2e/home.spec.ts --grep-invert visual` and expect PASS (BaseLayout embeds the translations).
- [ ] **Step 5: Commit** `content(services): trust stats, featured work, fit lines and labels`.

---

### Task 2: Two-column hero with photo and trust row

**Files:**
- Modify: `src/components/Services.astro` (the `svc-hero` section and its styles)
- Test: `e2e/services.spec.ts`, new describe `polish: hero`

**Interfaces:**
- **Consumes:** `services.trust`, `services.labels.photoAlt` (from Task 1).
- **Produces the markup:**
  - `section.svc-hero` gets a `.svc-hero-text` column and a `.svc-hero-media` column.
  - `.svc-hero-media` holds `<picture>` with `<source type="image/webp" srcset="/contact-360.webp 360w, /contact-720.webp 720w" sizes="(max-width: 767px) 96px, 420px">` and `<img class="svc-photo" src="/contact-768.jpg" width="768" height="768" fetchpriority="high" decoding="async" alt={labels.photoAlt}>`.
  - `ul.svc-trust` contains 3 `li` items, each with `strong.svc-trust-value` and `span.svc-trust-label`.
- **Layout:**
  - ≥768px: grid `minmax(0, 1.25fr) minmax(0, 1fr)` with a gap of `clamp(2rem, 5vw, 4rem)`.
  - The photo has the home Hero gradient ring (`Hero.astro:210-214` technique, `padding-box`/`border-box` backgrounds, 4px border) and `border-radius: var(--radius-lg)`.
  - `h1`: `font-size: clamp(2rem, 4.2vw, 3rem); max-width: 22ch`.
- **Mobile <768px:**
  - `.svc-hero-media` becomes a 96px circle placed before the badge (CSS `order`). It stays 96×96, so the reserved space is fixed.
  - The `h1` is `clamp(1.6rem, 7vw, 2rem)`.
  - `.svc-trust` is a single horizontally scrollable row (`overflow-x: auto`, `flex-wrap: nowrap`, inner scroll only, so the page itself does not scroll horizontally).

- [ ] **Step 1: Write the failing tests.**

```ts
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
    test.skip(isMobile);
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
    test.skip(isMobile);
    await gotoReady(page, '/dich-vu/?lang=vi');
    const text = (await vi(page).locator('.svc-hero-text').boundingBox())!;
    const media = (await vi(page).locator('.svc-hero-media').boundingBox())!;
    expect(media.x).toBeGreaterThan(text.x + text.width - 1);
  });
});
```

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g "polish: hero" --grep-invert visual`. Expected: FAIL (`.svc-photo` not found).
- [ ] **Step 3: Implement the hero markup and styles as described in Interfaces.** Keep the existing badge, subtitle, buttons, `.svc-zalo` and `.svc-projects` classes, because older tests use them.
- [ ] **Step 4: Run the same command plus the whole `e2e/services.spec.ts`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(services): two-column hero with photo and trust stats`.

---

### Task 3: Featured work section

**Files:**
- Create: `src/components/ServicesFeatured.astro`
- Modify: `src/components/Services.astro` (render it after `.svc-list`, before `.svc-process`) and `src/pages/dich-vu.astro` (pass `projects`)
- Test: `e2e/services.spec.ts`, new describe `polish: featured`

**Interfaces:**
- **Pure helper,** exported from the component's frontmatter module `src/components/servicesFeatured.ts` (create it):

  ```ts
  export function resolveFeatured(
    featured: { projectId: string; serviceId: string }[],
    projects: any[],
    idsWithDetail: string[]
  ): { id: string; serviceId: string; name: string; highlight: string; image: string; href: string; external: boolean }[];
  ```

  - It drops entries whose `projectId` is not in `projects`.
  - `href` is `/projects/<id>/` when the id is in `idsWithDetail`, else `project.links.demo`.
  - It drops entries that have neither a detail page nor a demo link.
  - `image` is `project.cardBackground`.
- **Component props:** `ServicesFeatured.astro` takes `{ items: ReturnType<typeof resolveFeatured>; title: string; serviceTitles: Record<string, string> }` and renders nothing if `items` is empty.
- **Card markup:** `section.svc-featured` > `h2.svc-title` > `.svc-featured-grid` > `a.svc-featured-card[data-project-id]`. Each card is one link containing:
  - `img` with `loading="lazy"`, `decoding="async"`, `alt=name`, `width="1200"` and `height="750"`
  - `span.svc-featured-chip` with the service title
  - `h3` with the name
  - `p` with the highlight

  External cards get `target`/`rel`.
- **Card styles:**
  - The image box uses `aspect-ratio: 16 / 10; object-fit: cover`.
  - A bottom overlay uses the home project gradient `linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.2) 30%, rgba(15,23,42,0.78) 62%, rgba(15,23,42,0.96) 100%)` with white text.
  - Grid: 2 columns at ≥768px, 1 below.
- **Data flow:** `Services.astro` gains the prop `projects: any[]`. `dich-vu.astro` passes `(await getTranslations(lang)).projects.items` for each language.

- [ ] **Step 1: Write the failing tests.**

```ts
test.describe('polish: featured', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  test('four cards in order with the right links', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const cards = vi(page).locator('a.svc-featured-card');
    await expect(cards).toHaveCount(4);
    expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('data-project-id')))).toEqual(['to-lua-eakar', 'solo-cafe-order', 'dsf-hospital-suite', 'igate']);
    expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['https://totam.up.railway.app/', '/projects/solo-cafe-order/', '/projects/dsf-hospital-suite/', '/projects/igate/']);
    await expect(cards.first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(cards.nth(1)).not.toHaveAttribute('target', '_blank');
  });
  test('images are lazy, described and size-reserved', async ({ page }) => {
    await page.route(/\.webp$/, async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
    await gotoReady(page, '/dich-vu/?lang=vi');
    const imgs = vi(page).locator('.svc-featured-card img');
    for (const img of await imgs.all()) {
      await expect(img).toHaveAttribute('loading', 'lazy');
      expect(await img.getAttribute('alt')).toBeTruthy();
      expect((await img.boundingBox())!.height, 'height reserved before the image loads').toBeGreaterThan(100);
    }
  });
  test('each featured card is a single focusable link', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('a.svc-featured-card a')).toHaveCount(0);
  });
  test('unknown featured id is skipped', async ({ page }) => {
    // Pure helper, imported in the test runner (Node): no page needed
    const { resolveFeatured } = await import('../src/components/servicesFeatured.ts');
    const out = resolveFeatured([{ projectId: 'nope', serviceId: 'website' }, { projectId: 'igate', serviceId: 'automation' }],
      [{ id: 'igate', name: 'iGate', highlight: 'x', cardBackground: '/igate.webp', links: {} }], ['igate']);
    expect(out.map((o) => o.id)).toEqual(['igate']);
  });
});
```

If importing `.ts` from the spec is not supported by the Playwright config, make `servicesFeatured.ts` plain ESM-compatible TS, since Playwright transpiles TS imports. Record a ruling if a change is needed.

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g "polish: featured" --grep-invert visual`. Expected: FAIL (helper module or cards missing).
- [ ] **Step 3: Implement the helper, the component and the wiring.**
- [ ] **Step 4: Run it again plus the whole spec file.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(services): featured work from real projects`.

---

### Task 4: Service cards (fit, checks, ask button, popular)

**Files:**
- Modify: `src/components/Services.astro` (`.svc-card` markup and styles)
- Test: `e2e/services.spec.ts`, new describe `polish: cards`

**Interfaces:**
- **Consumes:** `items[].fit`, `items[].featured`, and `labels.fit`/`askCard`/`popular` (Task 1); `.svc-glyph--sm` and the `CHECK` path (already in `Services.astro`).
- **Markup per card:**
  - `p.svc-fit` containing `<strong>{labels.fit}:</strong> {fit}`.
  - The benefits become `ul.svc-benefits` with `li` items, each `span.svc-glyph.svc-glyph--sm` (check) followed by the text, and `list-style: none`.
  - `a.svc-btn.svc-btn--ghost.svc-ask.svc-zalo-card` → `CONTACT.zaloHref`, external, full width, placed last in the card.
  - When `featured`: the card gets the class `svc-card--popular` (a 2px gradient border using the padding-box/border-box technique) and a `span.svc-popular` chip at the top right.
- **Selector note:** the card ask button must not use the class `svc-zalo`. The existing test `Zalo and phone links` counts exactly 2 `a.svc-zalo` (hero and closing call to action).

- [ ] **Step 1: Write the failing tests.**

```ts
test.describe('polish: cards', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  test('fit line, check glyphs and ask button on every card', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-card .svc-fit')).toHaveCount(3);
    await expect(vi(page).locator('[data-service-id="website"] .svc-fit')).toContainText('cửa hàng, quán, doanh nghiệp cần có mặt trên Google');
    await expect(vi(page).locator('.svc-card .svc-benefits .svc-glyph')).toHaveCount(11);
    const ask = vi(page).locator('.svc-card a.svc-ask');
    await expect(ask).toHaveCount(3);
    for (const a of await ask.all()) await expect(a).toHaveAttribute('href', 'https://zalo.me/84856694766');
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
```

11 = 4 + 4 + 3 benefits.

- [ ] **Step 2: Run** `-g "polish: cards"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole services spec.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(services): fit line, checks, per-card ask and popular card`.

---

### Task 5: Mobile bottom contact bar and price above the fold

**Files:**
- Modify: `src/pages/dich-vu.astro` (replace `a.svc-zalo-float` with the bar; bottom padding)
- Modify: `src/components/Services.astro` (mobile compaction if needed for the price-above-fold test)
- Modify: `e2e/services.spec.ts`. Replace the tests `floating Zalo: visible on mobile, hidden on desktop` and `final CTA is clickable at page bottom on mobile` with the ones below. Keep the smooth-scroll-off technique.

**Interfaces:**
- **Bar markup:** `nav.svc-contact-bar[aria-label]`, outside the language blocks.
  - The `aria-label` uses `data-i18n-attr="aria-label:services.cta.title"`.
  - It contains `a.svc-bar-zalo` (gradient, label `Zalo`, external) and `a.svc-bar-call` (ghost, `tel:`, label from `services.labels.call` via `data-i18n="services.labels.call"`).
  - Each button is half the width and at least 48px tall.
- **Bar styles:**
  - Hidden at ≥768px.
  - Below 768px: `position: fixed; bottom: 0; left: 0; right: 0`, white background, top shadow `0 -6px 20px rgba(2,6,23,0.08)`, `padding: 8px 12px calc(8px + env(safe-area-inset-bottom))`.
  - `.services-page` bottom padding is the bar height (64px) + 16px + safe area.

- [ ] **Step 1: Write the failing tests** (mobile project only).

```ts
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
  test.skip(isMobile);
  await gotoReady(page, '/dich-vu/?lang=vi');
  await expect(page.locator('.svc-contact-bar')).toBeHidden();
});
```

- [ ] **Step 2: Run** `-g "polish: mobile|bottom bar hidden"`. Expected: FAIL (the bar is missing; the price is below the fold).
- [ ] **Step 3: Implement the bar.** Then compact the mobile hero and cards until the price test passes. Allowed knobs:
  - hero spacing
  - 96px avatar
  - `h1` size from Task 2
  - the trust row as one line
  - card padding `1.25rem`
  - `.svc-fit` before the benefits

  Do not hide content.
- [ ] **Step 4: Run the whole services spec, plus** `npx playwright test --grep-invert visual -g "no horizontal scroll"`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(services): mobile contact bar, price on the first screen`.

---

### Task 6: Focus, tap targets, reduced motion, FAQ accordion

**Files:**
- Modify: `src/components/Services.astro` (styles; the FAQ `summary` markup gets a chevron)
- Test: `e2e/services.spec.ts`, new describe `polish: a11y`

**Interfaces:**
- **Focus:** `.services a:focus-visible, .services summary:focus-visible, .svc-contact-bar a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }`. The back link gets `display: inline-flex; align-items: center; min-height: 44px`.
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)`, page elements have `transition: none` and no `transform` on hover.
- **FAQ:**
  - `summary` uses `list-style: none` and hides `::-webkit-details-marker`.
  - Layout is `display: flex; justify-content: space-between; align-items: center; min-height: 48px`.
  - The `svg.svc-chevron` (stroke, `aria-hidden`) gets `transform: rotate(180deg)` under `details[open]`.

- [ ] **Step 1: Write the failing tests.**

```ts
test.describe('polish: a11y', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  test('visible 2px focus ring on links, buttons and FAQ', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    for (const sel of ['a.svc-back', '.svc-hero a.svc-zalo', '.svc-faq summary']) {
      const el = vi(page).locator(sel).first();
      await el.focus();
      await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); // keyboard modality → :focus-visible
      const ow = await el.evaluate((e) => getComputedStyle(e).outlineWidth);
      expect(ow, sel).toBe('2px');
    }
  });
  test('back link is a 44px target', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    expect((await vi(page).locator('a.svc-back').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  test('no motion under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoReady(page, '/dich-vu/?lang=vi');
    expect(await vi(page).locator('.svc-card').first().evaluate((c) => getComputedStyle(c).transitionDuration)).toBe('0s');
  });
  test('FAQ has no native marker and the chevron turns when open', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const s = vi(page).locator('.svc-faq summary').first();
    expect(await s.evaluate((e) => getComputedStyle(e).listStyleType)).toBe('none');
    const before = await s.locator('.svc-chevron').evaluate((e) => getComputedStyle(e).transform);
    await s.click();
    const after = await s.locator('.svc-chevron').evaluate((e) => getComputedStyle(e).transform);
    expect(after).not.toBe(before);
    expect((await s.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  });
});
```

If `Shift+Tab`/`Tab` lands on a different element in the focus test, focus by tabbing from the previous focusable instead. The goal is a keyboard-initiated focus, so `:focus-visible` applies.

- [ ] **Step 2: Run** `-g "polish: a11y"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole services spec.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(services): focus ring, tap targets, reduced motion, FAQ accordion`.

---

### Task 7: Verify

- [ ] `npx astro check` (0 errors), `npm run test:voice` (pass), `npx playwright test --grep-invert visual` (all pass).
- [ ] Visual tests in the CI image, using the host `node_modules` (do not run `npm ci` inside the container). Expected: 6 passed, no PNG changes.

  ```bash
  docker run --rm --ipc=host -e CI=1 -e HOME=/root -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.56.1-noble npx playwright test -g visual
  ```

- [ ] Take screenshots of `/dich-vu/` at 1440×900 and 375×812, top and bottom, and compare them against the spec sections 1–7.
- [ ] Push, start `e2e.yml` with `workflow_dispatch` on the branch, and confirm it is green.
