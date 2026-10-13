# Projects filter + voice narration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One filterable, horizontally scrolling "Dự án" section for work + personal projects, plus opt-in per-section voice narration from owner-supplied mp3 files.

**Architecture:** Project data stays in `src/i18n/translations/{vi,en}.json`; a `hasProjectDetail()` helper decides which items get a modal/detail page. Client behaviour lives in two new bundled modules (`src/scripts/project-browser.ts`, `src/scripts/voice.ts`) imported from `<script>` tags, so they are minified and kept out of the 1300-line `Projects.astro` inline script. Voice detects the current section with one IntersectionObserver (works for fullpage desktop and stacked mobile).

**Tech Stack:** Astro 6 static build, vanilla TS modules, CSS grid + scroll-snap, Playwright e2e (run in `mcr.microsoft.com/playwright:v1.56.1-noble`).

**Spec:** `docs/superpowers/specs/2026-10-13-projects-filter-and-voice-design.md`

## Global Constraints

- Item `type`: `"work" | "personal"`; existing 4 items become `"work"`.
- "Has detail" = non-empty `tasks` or `gallery`; only those get Chi tiết button, modal, `/projects/<id>` page, sitemap entry.
- Card: description clamped to 2 lines, max 4 tool tags then `+N`; Demo/GitHub `target="_blank" rel="noopener noreferrer"`.
- Desktop ≥768px: 2 rows, `grid-auto-flow: column`, `scroll-snap-type: x mandatory`, ~3 columns visible at 1440px; mobile <768px single column, no horizontal scroll.
- Audio path `/audio/<section>-<lang>.mp3`, sections `home, du-an, kinh-nghiem, lien-he`, langs `vi, en`. No placeholder audio committed.
- `localStorage['voice'] = 'on' | 'off'`, default off, access wrapped in try/catch.
- Voice labels: vi "Bật giọng đọc" / "Tắt giọng đọc", en "Turn voice on" / "Turn voice off".
- Mobile section visibility threshold 0.6.
- `npx astro check` 0 errors; whole e2e suite green in the Docker image; Lighthouse mobile performance stays ≥ 90 locally.

## Review Focus

- Fast section hopping (Dự án → Kinh nghiệm within 300 ms) → only the last section's audio plays; earlier one is stopped. (Task 4 test `latest section wins`)
- Language switch while narration plays → audio stops; the next section uses the new language. (Task 4 test `language switch stops and switches files`)
- Filter active, then language switch → active chip and visible cards unchanged, counts unchanged. (Task 2 test `filter survives language switch`)
- Click / Enter on Demo or GitHub inside a card → opens link only, never the modal; card without detail never opens the modal. (Task 2 test `links do not open the modal`)
- Filter leaving fewer cards than one page → prev/next and dots hidden. (Task 3 test `nav hidden when cards fit`)

---

### Task 1: Project data model and detail-page filtering

**Files:**
- Modify: `src/i18n/utils.ts` (add helper, filter `getProjectIds`)
- Modify: `src/i18n/translations/vi.json`, `src/i18n/translations/en.json`
- Test: `e2e/seo.spec.ts`, `e2e/projects.spec.ts`

**Interfaces:**
- Produces: `hasProjectDetail(item: any): boolean` and `getProjectIds(): Promise<string[]>` (now only ids with detail) in `src/i18n/utils.ts`.
- Produces JSON fields per item: `type`, optional `links: { demo?, github? }`; new strings `projects.filters.{all,work,personal}`, `projects.badges.{work,personal}`, `projects.actions.{demo,github,prev,next}`.

- [ ] **Step 1: Write failing tests**
  - `seo.spec.ts` › `sitemap does not list personal projects without detail`: sitemap body does not contain `/projects/portfolio-site/`.
  - `projects.spec.ts` › `personal project without detail has no page`: `request.get('/projects/portfolio-site/')` status is 404.
- [ ] **Step 2: Run** `npx playwright test e2e/seo.spec.ts e2e/projects.spec.ts --project=desktop` → the 404 test fails only after Step 3 adds the item; before that both pass trivially, so run again after Step 4.
- [ ] **Step 3: Data**
  - Add `"type": "work"` to the 4 existing items in both files.
  - Append one real personal item (this site) to both files: `id: "portfolio-site"`, `type: "personal"`, name vi "Portfolio cá nhân" / en "Personal portfolio", one-sentence description, `tools: ["Astro", "TypeScript", "Playwright", "Cloudflare Workers"]`, `cardBackground: "/og-image.png"`, `links: { "demo": "https://www.nguyenhoangtin.com", "github": "https://github.com/nguyenhoangtin1404/GioiThieuBanThan" }`, no `tasks`/`gallery`.
  - Add strings — vi: filters `Tất cả / Công ty / Cá nhân`, badges `Công ty / Cá nhân`, actions demo `Demo`, github `GitHub`, prev `Trước`, next `Sau`; en: `All / Work / Personal`, `Work / Personal`, `Demo`, `GitHub`, `Previous`, `Next`.
- [ ] **Step 4: Implement** `hasProjectDetail` (true when `tasks` or `gallery` is a non-empty array) and make `getProjectIds` keep only ids whose vi or en item has detail.
- [ ] **Step 5: Verify** `npx astro check` 0 errors; `npm run build` lists 4 project pages (no `portfolio-site`); tests from Step 1 pass.
- [ ] **Step 6: Commit** `feat(projects): add project type, links and detail filtering`

### Task 2: Unified cards and filter chips

**Files:**
- Modify: `src/components/Projects.astro` (markup, CSS; card click guard in the existing inline script)
- Create: `src/scripts/project-browser.ts`
- Test: `e2e/projects.spec.ts`

**Interfaces:**
- Consumes: `hasProjectDetail` (Task 1).
- Produces DOM contract used by Task 3 and tests:
  - `.projects-filters` with `button.project-filter[data-filter="all|work|personal"][aria-pressed]`, each containing `.count`.
  - `.projects-grid` children `.project-card[data-type][data-has-detail="true|false"]`; cards with detail keep `role="button" tabindex="0"`; others have neither.
  - Inside card: `.project-badge`, `p.description`, `.tools .tool-tag` (≤4) and `.tool-more` (`+N`), `.project-actions` with `button.project-detail-btn` (detail only), `a.project-link[data-link="demo|github"]`.
  - `initProjectBrowser(root: HTMLElement): void` exported from `src/scripts/project-browser.ts`; dispatches `CustomEvent('projectfilterchange', { detail: { filter } })` on `root`.

- [ ] **Step 1: Write failing tests** in `e2e/projects.spec.ts` (home page, `/?lang=vi`; desktop navigate via `#sidebar li[data-menuanchor="du-an"] button`, mobile scroll the section into view):
  - `filter chips show counts`: chip texts contain `5`, `4`, `1` for all/work/personal.
  - `filtering shows only matching cards`: click personal → visible `.project-card` count 1 with `data-type="personal"`, chip `aria-pressed="true"`; click all → 5 visible.
  - `links do not open the modal`: on the personal card, `a.project-link[data-link="github"]` has `href` `https://github.com/nguyenhoangtin1404/GioiThieuBanThan`, `target="_blank"`, `rel` contains `noopener`; clicking it (popup captured via `context.waitForEvent('page')`) leaves `#project-modal` hidden; clicking the personal card body leaves the modal hidden; the personal card has no `.project-detail-btn`.
  - `work card opens modal`: clicking igate card shows `#project-modal` with title text of igate.
  - `filter survives language switch`: select personal, switch to EN via the lang option → personal chip still pressed, 1 visible card, chip label `Personal`.
- [ ] **Step 2: Run** `npx playwright test e2e/projects.spec.ts` → new tests FAIL (no chips).
- [ ] **Step 3: Markup + CSS in `Projects.astro`**
  - Header row: title left, chips right; counts computed at build time from `projects`.
  - Card per Global Constraints; text keeps `data-i18n` paths (`projects.items.${index}.name|description`, `projects.badges.<type>`, `projects.filters.*`, `projects.actions.*`) so BaseLayout's existing language update rewrites them.
  - Remove problem/role/impact block from the card (modal unchanged). Description uses `-webkit-line-clamp: 2`.
  - In the existing inline script, `activateCard` only for cards with `data-has-detail="true"`; the detail button calls the same `openModal(id)`; card click/keydown ignores events whose target is inside `.project-actions a`.
- [ ] **Step 4: Implement `initProjectBrowser`**: chip click sets `aria-pressed`, toggles `hidden` on non-matching cards, sets `grid.scrollLeft = 0`, dispatches `projectfilterchange`. Call it from a `<script>` in `Projects.astro` (`import { initProjectBrowser } from '../scripts/project-browser'`).
- [ ] **Step 5: Verify** tests from Step 1 pass on desktop and mobile; `npx astro check` 0 errors.
- [ ] **Step 6: Commit** `feat(projects): unified cards with work/personal filter`

### Task 3: Desktop two-row carousel

**Files:**
- Modify: `src/components/Projects.astro` (grid CSS, nav markup)
- Modify: `src/scripts/project-browser.ts`
- Modify: `e2e/projects.spec.ts`, `e2e/home.spec.ts` (snapshot), snapshots dir

**Interfaces:**
- Consumes: DOM contract + `projectfilterchange` (Task 2).
- Produces: `.projects-nav` containing `button.projects-prev`, `.projects-dots > span.dot[aria-current]`, `button.projects-next`; `.projects-nav[hidden]` when everything fits.

- [ ] **Step 1: Write failing tests** (desktop only; mobile asserts the opposite):
  - `carousel scrolls by page`: set viewport 1024×768 so the 5 cards need 2 pages (at 1440px 3 columns × 2 rows fit all 6 slots; below 1200px 2 columns fit 4). Assert `.projects-nav` visible, `next` click increases `.projects-grid` `scrollLeft` > 0 and moves `aria-current` to dot 2; `prev` returns to 0.
  - `nav hidden when cards fit`: filter personal → `.projects-nav` hidden.
  - mobile `no horizontal scroll in projects`: `.projects-grid` `scrollWidth <= clientWidth + 1` and nav hidden.
  - `visual: projects section` (desktop + mobile) `toHaveScreenshot('projects-section.png')` of `#fullpage > .section[data-anchor="du-an"]` after reveal animations finish (reuse the `settle` approach from `evidence.spec.ts`).
- [ ] **Step 2: Run** → carousel tests FAIL.
- [ ] **Step 3: CSS** — desktop: `grid-template-rows: repeat(2, 1fr)`, `grid-auto-flow: column`, `grid-auto-columns: calc((100% - 2 * gap) / 3)` (2 columns below 1200px), `overflow-x: auto`, `scroll-snap-type: x mandatory`, children `scroll-snap-align: start`, hidden scrollbar; mobile keeps the single-column grid.
- [ ] **Step 4: Implement** in `project-browser.ts`: page count `ceil(scrollWidth / clientWidth)`; prev/next `scrollBy({ left: ±clientWidth, behavior: 'smooth' })`; dots rebuilt on init, `resize` and `projectfilterchange`; current dot from `scroll` (rAF-throttled); hide nav when pages ≤ 1 or below 768px.
- [ ] **Step 5: Verify** tests pass; generate snapshots in Docker: `docker run --rm --network host --ipc=host -e CI=1 -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.56.1-noble npx playwright test -g "projects section" --update-snapshots`; inspect the PNGs.
- [ ] **Step 6: Commit** `feat(projects): two-row horizontal carousel on desktop`

### Task 4: Voice narration

**Files:**
- Create: `src/scripts/voice.ts`
- Modify: `src/layouts/BaseLayout.astro` (toggle button after `#lang-switcher` in `.sidebar-nav`, CSS)
- Modify: `src/pages/index.astro` (import + `initVoice()` in a `<script>`)
- Modify: `README.md` (audio file names, 64 kbps mono)
- Test: `e2e/voice.spec.ts`

**Interfaces:**
- Produces: `initVoice(): void`; constants `VOICE_SECTIONS = ['home','du-an','kinh-nghiem','lien-he'] as const`, `voiceUrl(section, lang): string` → `/audio/${section}-${lang}.mp3`.
- DOM: `button.voice-toggle[data-voice-toggle][aria-pressed]` (cloned into the mobile nav by existing code — handle clicks by delegation on `document`), class `is-playing` while audio plays.

- [ ] **Step 1: Write failing tests** `e2e/voice.spec.ts`; `addInitScript` stubs `HTMLMediaElement.prototype.play` to push `this.src` into `window.__played` and resolve, and `pause` to push `'pause'`:
  - `off by default`: after load + one click on the page, `__played` empty, toggle `aria-pressed="false"`.
  - `toggle plays current section`: click visible toggle → `__played` last ends with `/audio/home-vi.mp3`, `aria-pressed="true"`, label `Tắt giọng đọc`.
  - `section change plays new file`: toggle on, go to Dự án → last ends with `du-an-vi.mp3`; back to home → home not replayed.
  - `latest section wins`: toggle on, go to Dự án then Kinh nghiệm within 300 ms → last played ends with `kinh-nghiem-vi.mp3` and a `pause` was recorded before it.
  - `language switch stops and switches files`: toggle on, switch to EN → `pause` recorded; go to Dự án → `du-an-en.mp3`.
  - `preference persists`: toggle on, reload, first `page.mouse.click` on body → plays `home-vi.mp3` without touching the toggle.
  - `missing file stays silent` (no stub; route `**/audio/*.mp3` → 404): toggle on, change section; no `pageerror`, toggle still pressed.
  - `tab hidden pauses`: toggle on, override `document.hidden` true + dispatch `visibilitychange` → `pause` recorded.
- [ ] **Step 2: Run** `npx playwright test e2e/voice.spec.ts` → FAIL (no toggle).
- [ ] **Step 3: Button + CSS** in `BaseLayout.astro`: speaker SVG (muted/unmuted variants via `[aria-pressed]`), same size/style as sidebar buttons, wave animation on `.is-playing`; initial label from `<html lang>`.
- [ ] **Step 4: Implement `initVoice`** per spec Playback rules: one `Audio` (`preload = 'none'`); state `enabled`, `played: Set<string>`, `current: string | null`; IntersectionObserver on `#fullpage > .section` threshold `0.6` sets current and calls `narrate(section)`; `narrate` pauses, sets `src = voiceUrl(section, lang)` and calls `play().catch(() => {})`, ignoring results for a section that is no longer current; listeners for `langchange` (pause, keep `played`), `visibilitychange`, `error`; preference read/write via try/catch; if stored `on`, arm a one-time `pointerdown`/`keydown`/`touchstart` listener that narrates the current section. Labels update on toggle and `langchange`.
- [ ] **Step 5: Verify** voice tests pass on desktop + mobile; full suite green; `astro check` 0 errors.
- [ ] **Step 6: Commit** `feat(voice): opt-in narration per section`

### Task 5: Final verification and PR

- [ ] Run whole suite in Docker (command in Task 3 Step 5 without `--update-snapshots`): all pass; every `test-results/*` dir has a PNG.
- [ ] Lighthouse mobile on `npm run build && npx astro preview` (local Lighthouse 13.5.0): performance ≥ 90, accessibility 100.
- [ ] Send evidence screenshots (projects section desktop/mobile, filtered state) to the user.
- [ ] Push branch, open PR `feat: filterable projects section and voice narration`, subscribe to PR activity.
