# Services page (`/dich-vu/`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bilingual, normally-scrolling `/dich-vu/` page that sells three freelance services to Vietnamese SMEs, with Zalo as the main call to action. It is linked from the sidebar, the home Contact section and the sitemap.

**Architecture:**
- Content lives in a new `services` key in `src/i18n/translations/{vi,en}.json`.
- Contact values move to `src/config/contact.ts`.
- A presentational `Services.astro` renders one language.
- `src/pages/dich-vu.astro` renders both languages in `data-lang-block` wrappers, the same pattern as `projects/[id].astro`.

**Tech Stack:** Astro 6 static build, Playwright e2e. Screenshot baselines live in `mcr.microsoft.com/playwright:v1.56.1-noble`.

**Spec:** `docs/superpowers/specs/2026-10-15-services-page-design.md` (the copy in it is binding).

## Global Constraints

- Route `/dich-vu/` (trailing slash, as Astro builds it). Normal page scroll. Do not load `/js/vanilla-fullpage.js`.
- Zalo: `https://zalo.me/84856694766`. Phone link: `tel:+84856694766`. Phone display: `+84 8566 947 66`. Email: `tinnh.pyn@gmail.com`. Telegram: `@tinnh94` / `https://t.me/tinnh94`. GitHub: `https://github.com/nguyenhoangtin1404`.
- The three services, in this order:

  | id | Price | Duration | Example |
  |---|---|---|---|
  | `website` | Từ 5 triệu | 1–2 tuần | none |
  | `management` | Từ 15 triệu | 3–6 tuần | `solo-cafe-order` |
  | `automation` | Từ 5 triệu | 1–3 tuần | none |

- Warranty is 3 tháng. Payment is "chia đợt theo tiến độ".
- External links use `target="_blank" rel="noopener noreferrer"`. `tel:` links do not.
- Mobile breakpoint is `<768px`. Nothing may scroll horizontally.
- The floating Zalo button is mobile-only.
- `npx astro check` reports 0 errors. Local e2e runs use `--grep-invert visual`. Screenshot baselines are only (re)generated in the Docker image (README line 97).

## Review Focus

- **Long Vietnamese text on a 360px phone.** Prices like "Từ 15 triệu" and long FAQ answers wrap, and nothing overflows → Task 3 test `no horizontal scroll at 360px`.
- **The floating Zalo button covering the final CTA.** At the bottom of the page the final CTA buttons stay clickable → Task 3 test `final CTA is clickable at page bottom on mobile`.
- **Switching language on `/dich-vu/`.** The en block shows, the vi block hides, and `<title>` changes → Task 3 test `language switch swaps content and title`.
- **Arriving with `?lang=en` from a shared link.** English shows on first paint → Task 3 test `?lang=en shows English`.
- **The new sidebar link on the home page.** It must not be treated as a fullpage section button. Clicking it navigates and does not swallow the click → Task 4 test `sidebar Dịch vụ link opens /dich-vu/`.

---

### Task 1: Single contact config

**Files:**
- Create: `src/config/contact.ts`
- Modify: `src/components/ContactCard.astro:7-12`
- Create: `e2e/services.spec.ts` (the first describe block is `contact links`)

**Interfaces:**
- Produces: `export const CONTACT: { email: string; emailHref: string; github: string; githubHref: string; phone: string; phoneHref: string; telegram: string; telegramHref: string; zaloHref: string }`, with the values from Global Constraints.
- `ContactCard.astro` builds its `channels` array from `CONTACT`. Order and labels stay unchanged.

- [ ] **Step 1: Write the characterization test.** It passes before and after the refactor, so it guards the move.

```ts
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
```

- [ ] **Step 2: Run it.** `npx playwright test e2e/services.spec.ts --grep-invert visual`. Expected: PASS on both projects. This is a characterization test, so it passes before the change.
- [ ] **Step 3: Create `src/config/contact.ts` and use it in `ContactCard.astro`.**
- [ ] **Step 4: Run the test again plus `npx astro check`.** Expected: PASS, 0 errors.
- [ ] **Step 5: Commit** `refactor(contact): move contact values to src/config/contact.ts`.

---

### Task 2: `services` content in vi and en

**Files:**
- Modify: `src/i18n/translations/vi.json`, `src/i18n/translations/en.json` (new top-level `services` key, and `layout.nav.services`)
- Test: `e2e/services.spec.ts` (describe `translations`)

**Interfaces:**
- Produces the shape below. Every field is required in both languages.

```ts
services: {
  meta: { title: string; description: string };
  hero: { title: string; subtitle: string; primaryCta: string; secondaryCta: string };
  labels: { benefits: string; duration: string; example: string; floatingZalo: string };
  items: { id: 'website'|'management'|'automation'; title: string; benefits: string[]; price: string; duration: string; exampleProjectId?: string }[];
  process: { title: string; steps: { title: string; text: string }[] };   // 4 steps
  whyMe: { title: string; points: string[] };                              // 4 points
  faq: { title: string; items: { q: string; a: string }[] };               // 5 items
  cta: { title: string; text: string; zalo: string; phone: string };
}
layout.nav.services: string   // vi "Dịch vụ", en "Services"
```

- vi copy: take it verbatim from the spec where the spec gives it. Where the spec only names a topic (process step text, FAQ answers, cta text), write one or two plain sentences that use the values from Global Constraints.
- `price` stays in vi as "Từ 5 triệu". In en it reads "From 5M VND".
- en is a faithful translation of the vi copy.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
const load = (l: string) => JSON.parse(readFileSync(`src/i18n/translations/${l}.json`, 'utf8'));
// Paths of every key; array items are compared position by position.
function keyPaths(o: any, p = ''): string[] { /* recursive: objects → keys, arrays → indexes, leaves → p */ }

test.describe('translations', () => {
  test('services keys match between vi and en', () => {
    const vi = load('vi'), en = load('en');
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
```

Run it under one project only: `test.skip(testInfo.project.name !== 'desktop')`.

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g translations --project=desktop`. Expected: FAIL, `vi.services` is undefined.
- [ ] **Step 3: Add the `services` content and `layout.nav.services` to both JSON files.**
- [ ] **Step 4: Run it again.** Expected: PASS. Also run `npx playwright test e2e/home.spec.ts --grep-invert visual`. It must PASS, since BaseLayout embeds the translations.
- [ ] **Step 5: Commit** `content(services): vi/en copy for the SME services page`.

---

### Task 3: `Services.astro` and the `/dich-vu/` page

**Files:**
- Create: `src/components/Services.astro`
- Create: `src/pages/dich-vu.astro`
- Test: `e2e/services.spec.ts` (describe `services page`)

**Interfaces:**
- Consumes: `CONTACT` (Task 1), the `services` shape (Task 2), `getTranslations(lang)`, and `hasProjectDetail(item)` from `@i18n/utils`.
- `Services.astro` takes props `{ services: Services; lang: 'vi' | 'en'; projectIdsWithDetail: string[] }`.
- It renders, inside `<article class="services" data-lang={lang}>`:
  - `section.svc-hero` with `h1` and two links: `a.svc-zalo` → `CONTACT.zaloHref`, and `a.svc-projects` → `/?lang=<lang>#du-an`.
  - `section.svc-list` containing three `article.svc-card[data-service-id]`. Each card shows its benefits `ul`, `.svc-price`, `.svc-duration`, and, only when `exampleProjectId` is in `projectIdsWithDetail`, `a.svc-example` → `/projects/<id>/`.
  - `section.svc-process` with an `ol` of 4 steps.
  - `section.svc-why`.
  - `section.svc-faq`, using `<details><summary>` per item.
  - `section.svc-cta` with `a.svc-zalo` and `a.svc-phone` → `CONTACT.phoneHref`.
- `dich-vu.astro`:
  - Builds `versions` for vi and en. If `t.services` is missing, it falls back to the vi `services`.
  - Wraps each version in `<div data-lang-block={lang}>`. The show/hide CSS is copied from `projects/[id].astro:142-145`.
  - Wraps the page in `<main class="services-page" data-titles=...>`. The title sync script is copied from `projects/[id].astro` (the title IIFE only).
  - Uses `BaseLayout title={vi.meta.title} description={vi.meta.description}`.
  - Has one floating link, `a.svc-zalo-float[href=zaloHref]`, outside the language blocks. Its accessible name is `data-i18n-attr="aria-label:services.labels.floatingZalo"`. It is `display:none` at ≥768px and fixed bottom-right below that.
  - Gives `.services-page` a bottom padding at least as tall as the floating button plus 16px, so the final CTA is never covered.

- [ ] **Step 1: Write the failing tests** (both projects unless noted).

```ts
test.describe('services page', () => {
  const vi = (p: Page) => p.locator('[data-lang-block="vi"]');
  test('three services with prices (vi)', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-card')).toHaveCount(3);
    await expect(vi(page).locator('.svc-price')).toHaveText(['Từ 5 triệu', 'Từ 15 triệu', 'Từ 5 triệu']);
    await expect(vi(page).locator('h1')).toBeVisible();
  });
  test('?lang=en shows English', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=en');
    await expect(page.locator('[data-lang-block="en"] h1')).toBeVisible();
    await expect(vi(page).locator('h1')).toBeHidden();
  });
  test('language switch swaps content and title', async ({ page }) => { /* load vi, click #lang-switcher (desktop) or the mobile switcher, expect en h1 visible and document.title === en services.meta.title */ });
  test('Zalo and phone links', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    for (const href of await vi(page).locator('a.svc-zalo').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))
      expect(href).toBe('https://zalo.me/84856694766');
    await expect(vi(page).locator('a.svc-zalo')).toHaveCount(2);
    await expect(vi(page).locator('a.svc-phone')).toHaveAttribute('href', 'tel:+84856694766');
    await expect(vi(page).locator('a.svc-zalo').first()).toHaveAttribute('rel', 'noopener noreferrer');
  });
  test('example link only for a project with a detail page', async ({ page }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expect(vi(page).locator('.svc-example')).toHaveCount(1);
    await expect(vi(page).locator('[data-service-id="management"] .svc-example')).toHaveAttribute('href', '/projects/solo-cafe-order/');
  });
  test('no fullpage script', async ({ page }) => {
    await gotoReady(page, '/dich-vu/');
    expect(await page.evaluate(() => typeof (window as any).VanillaFullpage)).toBe('undefined');
  });
  test('no horizontal scroll at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await gotoReady(page, '/dich-vu/?lang=vi');
    await expectNoHorizontalScroll(page);
  });
  test('floating Zalo: visible on mobile, hidden on desktop', async ({ page, isMobile }) => {
    await gotoReady(page, '/dich-vu/?lang=vi');
    const f = page.locator('a.svc-zalo-float');
    if (isMobile) await expect(f).toBeVisible(); else await expect(f).toBeHidden();
  });
  test('final CTA is clickable at page bottom on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile);
    await gotoReady(page, '/dich-vu/?lang=vi');
    const phone = vi(page).locator('.svc-cta a.svc-phone');
    await phone.scrollIntoViewIfNeeded();
    await phone.click({ trial: true }); // fails if another element (the floating button) intercepts
  });
});
```

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g "services page" --grep-invert visual`. Expected: FAIL with a 404, because `/dich-vu/` does not exist yet.
- [ ] **Step 3: Implement `Services.astro` and `dich-vu.astro`.** Follow the site's existing look: the Be Vietnam Pro font, the colours used in `ProjectDetail.astro`, and cards in a single column on mobile and three columns at ≥1024px.
- [ ] **Step 4: Run** the same command. Expected: all PASS on both projects. Then run `npx astro check`, expecting 0 errors.
- [ ] **Step 5: Commit** `feat(services): /dich-vu/ page for SME clients`.

---

### Task 4: Link the page into the site

**Files:**
- Modify: `src/layouts/BaseLayout.astro`, around 1167-1195 (sidebar `ul#sidebar`). The mobile nav is cloned from it, so check that the clone also gets the link.
- Modify: `src/components/ContactCard.astro` (one line under `.channels`)
- Modify: `src/pages/sitemap.xml.ts`
- Modify: `src/i18n/translations/{vi,en}.json` (add `contact.servicesLink`, vi "Cần làm website/phần mềm? Xem dịch vụ →", en "Need a website or software? See services →")
- Update: `e2e/home.spec.ts-snapshots/*` (regenerated in Docker only)
- Test: `e2e/services.spec.ts` (describe `site links`), `e2e/seo.spec.ts`

**Interfaces:**
- **Sidebar item.** Markup: `<li class="sidebar-link"><a href="/dich-vu/" aria-label="Dịch vụ" data-i18n-attr="aria-label:layout.nav.services"><svg class="sidebar-icon">…briefcase…</svg></a></li>`, placed after `lien-he`.
  - It has no `data-menuanchor`, so the fullpage handlers in `index.astro` (which query `li[data-menuanchor]` / `button`) ignore it.
  - Style it like the existing `.sidebar-list li button`.
- **Contact line.** `a.contact-services-link[href="/dich-vu/"][data-i18n="contact.servicesLink"]`.
- **Sitemap.** `paths` becomes `['/', '/dich-vu/', ...projects]`.

- [ ] **Step 1: Write the failing tests**

```ts
test.describe('site links', () => {
  test('sidebar Dịch vụ link opens /dich-vu/', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sidebar');
    await gotoReady(page, '/?lang=vi');
    await page.locator('#sidebar a[href="/dich-vu/"]').click();
    await expect(page).toHaveURL(/\/dich-vu\/$/);
  });
  test('Contact section links to services', async ({ page }) => {
    await gotoReady(page, '/?lang=vi');
    await expect(page.locator('#lien-he a.contact-services-link')).toHaveAttribute('href', '/dich-vu/');
  });
  test('sitemap lists /dich-vu/', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/dich-vu/</loc>');
  });
});
```

If `e2e/seo.spec.ts` asserts an exact sitemap URL list, update its expected list there instead of duplicating the check.

- [ ] **Step 2: Run** `npx playwright test e2e/services.spec.ts -g "site links" --grep-invert visual`. Expected: 3 FAIL.
- [ ] **Step 3: Implement the sidebar item, the contact line, the translation key and the sitemap path.**
- [ ] **Step 4: Run the full local suite** `npx playwright test --grep-invert visual`. Expected: all PASS. The `e2e/fullpage.spec.ts` sidebar tests must still pass, since the new `<li>` has no anchor.
- [ ] **Step 5: Regenerate the screenshot baselines in the CI image and inspect them.**

```bash
sudo dockerd >/dev/null 2>&1 &   # only if no daemon is running
docker run --rm --ipc=host -e CI=1 -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.56.1-noble \
  bash -c "npm ci && npx playwright test -g visual --update-snapshots"
git status --short e2e/   # expect only home-hero-* (sidebar icon) to change; open the PNGs and confirm the only difference is the new icon
npm ci                    # restore host node_modules
```

- [ ] **Step 6: Commit** `feat(services): link /dich-vu/ from sidebar, Contact and sitemap`, together with the updated PNGs.

---

### Task 5: Verify

- [ ] Run `npx astro check` (0 errors), `npm run test:voice` (pass) and `npx playwright test --grep-invert visual` (all pass).
- [ ] Push. CI `e2e` must be green, screenshots included.
- [ ] Manual: open the Cloudflare branch preview `/dich-vu/` on a phone. Tap Zalo: it must open the Zalo chat with 0856 694 766.
