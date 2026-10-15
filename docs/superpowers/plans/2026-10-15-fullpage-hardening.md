# Fullpage hardening + dependency upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed desktop fullpage bugs (modal keys, leaked instances, history spam, reduced motion) and clear the critical Astro advisory.

**Architecture:** `VanillaFullpage` (`public/js/vanilla-fullpage.js`) gets one `AbortController` that owns every listener it adds, a `destroy()` and a `setAllowScrolling()` input lock. `index.astro` keeps one module-level `teardownFullpage()` that undoes everything `initFullpage()` adds. Desktop behaviour is pinned by a new desktop-only Playwright file.

**Tech Stack:** Astro 6 static build, vanilla JS (`is:inline`), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-10-15-fullpage-hardening-design.md`

## Global Constraints

- Mobile breakpoint stays `window.innerWidth < 768`; mobile layout behaviour is unchanged.
- Fullpage options in `src/pages/index.astro` stay `anchors: ['home','du-an','kinh-nghiem','lien-he']`, `scrollingSpeed: 800`, `loopBottom: true`.
- Long-section behaviour pinned by `e2e/scroll.spec.ts` (`EDGE_PAUSE = 800`, `GESTURE_GAP = 250`) must keep passing unchanged.
- Do not bump `@playwright/test` or the CI Docker image tag (`v1.56.1-noble`). Screenshot baselines must not need updating.
- `npx astro check` reports 0 errors; `npm run test:voice` passes.
- Screenshot tests are only authoritative in the CI Docker image. Locally, run the non-screenshot specs listed in each task.

## Review Focus

- Escape closes the modal and keys move sections again → Task 2 test `keys move sections again after the modal closes`.
- A breakpoint crossing while the modal is open: closing it must not throw on a destroyed or null instance, and a fresh instance created meanwhile must start locked → Task 3: `initFullpage` calls `setAllowScrolling(false)` on the new instance when `#project-modal.active` exists; test `modal stays locked across a breakpoint crossing` (open igate modal, `crossBreakpoint`, press End, `#du-an` still active).
- Mobile → desktop: a sidebar click must not also run the mobile `scrollIntoView` + `pushState` handler → Task 3 test `sidebar click after resize changes history once`.
- Deep link `/?lang=vi#lien-he` on desktop must open Liên hệ, not be overwritten by `#home` → Task 4 test `deep link opens its section`.
- Reduced motion with a long section (Kinh nghiệm): the edge-hold logic still applies, only animation is removed → run `e2e/scroll.spec.ts` with reduced motion once in Task 5 (manual step).

---

### Task 1: Upgrade Astro and drop unused dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:** none.

- [ ] **Step 1: Record the baseline**

Run: `npm audit --omit=dev`
Expected: lists the critical "Astro: XSS in define:vars" advisory.

- [ ] **Step 2: Upgrade and remove**

Run: `npm uninstall fullpage.js tslib && npm install astro@^6 @astrojs/check@^0.9 --save-exact=false`
Expected: `package.json` has no `fullpage.js` or `tslib`; `astro` resolves to the newest 6.x in the lockfile (≥ 6.4.8). `@playwright/test` is unchanged.

- [ ] **Step 3: Verify**

Run: `npm audit --omit=dev` → no critical. Run: `npx astro check && npm run build && npm run test:voice` → 0 errors, build succeeds, tests pass.
Run: `npx playwright test e2e/scroll.spec.ts e2e/seo.spec.ts e2e/voice.spec.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade astro 6.x for define:vars advisory, drop unused fullpage.js and tslib"
```

---

### Task 2: Lock all input while the project modal is open

**Files:**
- Modify: `public/js/vanilla-fullpage.js` (constructor state, `setWheelEnabled` at :60, `setupKeyboard` :175, `setupWheel` :233, `setupTouch` :293)
- Modify: `src/components/Projects.astro:672-679` and `:714-721`
- Create: `e2e/fullpage.spec.ts`

**Interfaces:**
- Produces: `VanillaFullpage#setAllowScrolling(enabled: boolean): void`. When false, the keydown, wheel and touchend handlers return before doing anything, including `preventDefault`. `setWheelEnabled` stays as an alias that calls `setAllowScrolling`. The `wheelEnabled` field is renamed `inputEnabled`.
- Produces: `e2e/fullpage.spec.ts` with a `test.describe('desktop fullpage')` block. `test.use({ viewport: { width: 1440, height: 900 } })` and `beforeEach` skip unless `testInfo.project.name === 'desktop'`. Helper `goToSection(page, anchor)` clicks `#sidebar li[data-menuanchor="<anchor>"] button`, waits for `#<anchor>.active`, then `waitForTimeout(1000)`. Later tasks add tests to this file.

- [ ] **Step 1: Write the failing tests**

```ts
test('keys do not change the section while the modal is open', async ({ page }) => {
  await gotoReady(page, '/?lang=vi');
  await goToSection(page, 'du-an');
  await page.locator('.project-card[data-project-id="igate"] h3').click();
  await expect(page.locator('#project-modal')).toHaveClass(/active/);
  // Record whether fullpage swallowed the key (it must not, so the modal can scroll).
  await page.evaluate(() => window.addEventListener('keydown', (e) => { (window as any).__prevented = e.defaultPrevented; }));
  for (const key of ['End', 'PageDown', 'ArrowDown', 'Home']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__prevented), key).toBe(false);
  }
  await expect(page.locator('#du-an')).toHaveClass(/active/);
});

test('keys move sections again after the modal closes', async ({ page }) => {
  // same setup as above, then:
  await page.keyboard.press('Escape');
  await expect(page.locator('#project-modal')).not.toHaveClass(/active/);
  await page.waitForTimeout(300);
  await page.keyboard.press('PageDown');
  await expect(page.locator('#kinh-nghiem')).toHaveClass(/active/);
});
```

Escape already closes the modal (`Projects.astro:621`).

- [ ] **Step 2: Run to verify the first test fails**

Run: `npx playwright test e2e/fullpage.spec.ts --project=desktop`
Expected: FAIL. `#du-an` loses `active`, or `__prevented` is `true`.

- [ ] **Step 3: Implement `setAllowScrolling` and gate the three handlers**

In `Projects.astro`, replace each two-call block with a single `window.vanillaFullpage.setAllowScrolling(false|true)`, guarded by `typeof ... === 'function'`.

- [ ] **Step 4: Run the tests**

Run: `npx playwright test e2e/fullpage.spec.ts e2e/scroll.spec.ts e2e/projects.spec.ts --project=desktop --grep-invert screenshot`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/vanilla-fullpage.js src/components/Projects.astro e2e/fullpage.spec.ts
git commit -m "fix(fullpage): block keys and swipes behind the project modal"
```

---

### Task 3: `destroy()` and a single live instance across breakpoint crossings

**Files:**
- Modify: `public/js/vanilla-fullpage.js` (constructor, `init` :69-85, all `addEventListener` calls, `goToSection` timers :462-489; delete the `.fp-nav` code)
- Modify: `src/pages/index.astro` (`setupMobileLayout` :76-85, mobile link/sidebar handlers :100-145, `initFullpage` :339-~580, `handleResize` :812-833)
- Test: `e2e/fullpage.spec.ts`

**Interfaces:**
- Consumes: `setAllowScrolling` from Task 2.
- Produces: `VanillaFullpage#destroy(): void`.
  - Every listener added by the class passes `{ signal: this.abort.signal }`, where `this.abort = new AbortController()` is created in the constructor. That covers document keydown/wheel/touchstart/touchend, window load/resize, and the per-section `scroll` listeners.
  - `destroy()` calls `this.abort.abort()`, clears `hideTimeout` and the `isScrolling` reset timeout (store it as `this.scrollTimeout`), and removes `fp-vertical` and `fp-overflow`.
  - It does not reset section inline styles; `setupMobileLayout` already overwrites them.
- Produces (index.astro script scope): `function teardownFullpage(): void`. It calls `window.vanillaFullpage?.destroy()`, sets `window.vanillaFullpage = null`, aborts an `AbortController` that `initFullpage` passes as `signal` to every CTA/sidebar listener it adds, and disconnects the `MutationObserver` that `initFullpage` creates. Both existing destroy call sites (`setupMobileLayout` and `handleResize`) call it instead of their inline code.
- Remove `setInterval(checkActiveSection, 500)`; the MutationObserver is the only update path.
- The `.fp-nav` code goes: the `navigation` option, `setupNavigation`, `updateNavigation`, `showNavigation`, `ensureNavigationHidden`, `hideNavigation`, `navHideTimeout` and their call sites. No `.fp-nav` markup exists (only CSS at `BaseLayout.astro:1022,1070`, which you can also delete).
- `initFullpage` calls `window.vanillaFullpage.setAllowScrolling(false)` right after construction if `document.querySelector('#project-modal.active')` exists.
- Add the test `modal stays locked across a breakpoint crossing` from Review Focus to Step 1.
- The mobile CTA and sidebar click handlers (index.astro :100-145) start with `if (!document.body.classList.contains('mobile-layout')) return;` so they do nothing on desktop.

- [ ] **Step 1: Write the failing tests**

```ts
async function crossBreakpoint(page: Page) {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
}

test('one instance after crossing the breakpoint', async ({ page }) => {
  await gotoReady(page, '/?lang=vi');
  await crossBreakpoint(page);
  await page.evaluate(() => {
    (window as any).__moves = 0;
    const orig = (window as any).VanillaFullpage.prototype.goToSection;
    (window as any).VanillaFullpage.prototype.goToSection = function (i: number) { (window as any).__moves++; return orig.call(this, i); };
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
  expect(await page.evaluate(() => history.length) - before).toBeLessThanOrEqual(1);
});
```

(Task 4 tightens the second assertion to `0`.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test e2e/fullpage.spec.ts --project=desktop`
Expected: `one instance…` FAILS with `__moves` = 2. `sidebar click…` FAILS with a history delta of 2 or more.

- [ ] **Step 3: Implement `destroy()`, `teardownFullpage()`, the mobile-handler guard, and remove the interval and the `.fp-nav` code**

- [ ] **Step 4: Run the tests**

Run: `npx playwright test e2e/fullpage.spec.ts e2e/scroll.spec.ts e2e/home.spec.ts e2e/voice.spec.ts --grep-invert screenshot`
Expected: PASS, on both the desktop and mobile projects.

- [ ] **Step 5: Commit**

```bash
git add public/js/vanilla-fullpage.js src/pages/index.astro e2e/fullpage.spec.ts
git commit -m "fix(fullpage): add destroy() so breakpoint crossings leave one live instance"
```

---

### Task 4: Replace history entries instead of pushing them; keep deep links

**Files:**
- Modify: `public/js/vanilla-fullpage.js` (`updateURL` :627-640, `init` :82)
- Modify: `src/pages/index.astro` (desktop CTA handler, if it pushes; mobile handlers at :116, :140, :179 stay `pushState`, since they are real navigation on a scrolling page)
- Test: `e2e/fullpage.spec.ts`

**Interfaces:**
- Produces: `updateURL()` uses `history.replaceState(history.state, '', '#' + anchor)`, preserving `state` so the modal's `{ projectId }` entry isn't clobbered. `init()` no longer calls `updateURL()`.

- [ ] **Step 1: Write the failing tests**

```ts
test('section changes do not add history entries', async ({ page }) => {
  await gotoReady(page, '/?lang=vi');
  const before = await page.evaluate(() => history.length);
  await page.keyboard.press('PageDown');
  await expect(page.locator('#du-an')).toHaveClass(/active/);
  await page.waitForTimeout(1000);
  await page.keyboard.press('PageDown');
  await expect(page.locator('#kinh-nghiem')).toHaveClass(/active/);
  expect(await page.evaluate(() => history.length)).toBe(before);
  await expect(page).toHaveURL(/#kinh-nghiem$/);
});

test('deep link opens its section', async ({ page }) => {
  await gotoReady(page, '/?lang=vi#lien-he');
  await expect(page.locator('#lien-he')).toHaveClass(/active/);
  await expect(page).toHaveURL(/#lien-he$/);
});
```

Also change the Task 3 `sidebar click…` assertion to `.toBe(before)`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test e2e/fullpage.spec.ts --project=desktop`
Expected: `section changes…` FAILS, because `history.length` grew by 2.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run the tests**

Run: `npx playwright test e2e/fullpage.spec.ts e2e/projects.spec.ts --project=desktop --grep-invert screenshot`
Expected: PASS. The modal's Back-to-close flow in `projects.spec.ts` still works.

- [ ] **Step 5: Commit**

```bash
git add public/js/vanilla-fullpage.js src/pages/index.astro e2e/fullpage.spec.ts
git commit -m "fix(fullpage): replace the hash instead of pushing one history entry per section"
```

---

### Task 5: Honour `prefers-reduced-motion`

**Files:**
- Modify: `public/js/vanilla-fullpage.js` (the transition string built at :93 and :408; extract `transitionFor(): string`)
- Modify: `src/layouts/BaseLayout.astro` (the reduced-motion block at :1140)
- Modify: `src/components/Hero.astro` (add a reduced-motion block after the keyframes at ~:303)
- Test: `e2e/fullpage.spec.ts`

**Interfaces:**
- Produces: `VanillaFullpage#transitionFor(): string`. It returns `'none'` when `matchMedia('(prefers-reduced-motion: reduce)').matches`, and the existing 800ms string otherwise. It is read on every `goToSection`, so a preference change takes effect without a reload. The `isScrolling` reset delay uses `0` when reduced.
- CSS: under `@media (prefers-reduced-motion: reduce)`, `.fade-in-item` gets `opacity: 1 !important; transform: none !important; transition: none !important; pointer-events: auto;`. `.chat-bubble`, `.dot` and `.online::after` get `animation: none`.

- [ ] **Step 1: Write the failing test**

```ts
test('reduced motion: no section transition, items visible, hero still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page, '/?lang=vi');
  await page.keyboard.press('PageDown');
  await expect(page.locator('#du-an')).toHaveClass(/active/);
  expect(await page.locator('#du-an').evaluate((s) => getComputedStyle(s).transitionDuration)).toBe('0s');
  const card = page.locator('.project-card.fade-in-item').first();
  expect(await card.evaluate((c) => getComputedStyle(c).opacity)).toBe('1');
  expect(await page.locator('.chat-bubble').evaluate((b) => getComputedStyle(b).animationName)).toBe('none');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/fullpage.spec.ts -g "reduced motion" --project=desktop`
Expected: FAIL with `0.8s`.

- [ ] **Step 3: Implement `transitionFor()` and the CSS blocks**

- [ ] **Step 4: Run the tests, plus the long-section suite under reduced motion once**

Run: `npx playwright test e2e/fullpage.spec.ts e2e/scroll.spec.ts e2e/home.spec.ts --grep-invert screenshot` → PASS.
Manual: temporarily add `test.use({ reducedMotion: 'reduce' })` to `e2e/scroll.spec.ts`, run it, confirm it passes, then revert. Do not commit that change.

- [ ] **Step 5: Commit**

```bash
git add public/js/vanilla-fullpage.js src/layouts/BaseLayout.astro src/components/Hero.astro e2e/fullpage.spec.ts
git commit -m "fix(a11y): honour prefers-reduced-motion in fullpage, fade-ins and hero"
```

---

### Task 6: Full verification

- [ ] `npx astro check` → 0 errors. `npm run test:voice` → pass. `npm audit --omit=dev` → no critical.
- [ ] `npm run test:e2e` → all non-screenshot tests pass locally. Push the branch and confirm the CI `e2e` job is green, including the screenshot tests run in the Docker image.
- [ ] `grep -rn "setAllowScrolling\|destroy" src/` → every call targets a method that exists.

## Out of scope (later plans)

Images and asset pipeline, cache headers, bundling the `is:inline` scripts, Astro i18n routing, SEO and JSON-LD, GA `hashchange` tracking (now a `replaceState`), GLightbox SRI and CSP, dead code beyond `.fp-nav`.
