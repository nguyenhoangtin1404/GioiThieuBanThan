# Services page polish (phase 1) — design

**Builds on:** `docs/superpowers/specs/2026-10-15-services-page-design.md`.

**Source:** a UI/UX review of `/dich-vu/` on 2026-10-15. The owner approved phase 1. Phase 1 needs no new content from the owner: it reuses photos, project data and numbers already on the site.

## Intent

The page should look as professional as the home page and earn an SME owner's trust within the first screen. It does that by showing the person, real results and real past work. Asking for a quote on a phone should take one tap.

## Review findings this phase fixes

1. No proof of trust: the page has 0 images, no photo of the owner, no numbers and no past work.
2. The page is all text. The real project screenshots already in the repo are not used.
3. On a 375×812 phone the first screen shows no price.
4. The hero title runs to three lines and the right half of the hero is empty on desktop. The home hero uses two columns with a photo.
5. The service cards are generic: they don't say who each service suits and have no per-card call to action.
6. The focus ring is the browser's thin default. The back link's tap target is 26px tall. Hover lifts still run under `prefers-reduced-motion`.
7. The FAQ uses the browser's default disclosure triangle.
8. The floating Zalo bubble uses a generic chat icon.

## Design

### 1. Hero: two columns, like the home Hero

- **Left column:** badge, title, subtitle and both buttons, as today. Desktop `h1` is capped at `clamp(2rem, 4.2vw, 3rem)` with `max-width: 22ch`, so it fits on two lines at 1440px.
- **Right column:** the owner's photo.
  - Source: `/contact-720.webp`, with `/contact-360.webp` in the `srcset` and `/contact-768.jpg` as the fallback. These are the same files the home Contact section uses.
  - Shape: rounded (`--radius-lg`), with the home Hero's gradient ring.
  - Attributes: `width`/`height` set, `fetchpriority="high"`. Alt text is "Nguyễn Hoàng Tín" in both languages.
- **Mobile (<768px):** single column. The photo is a 96px round avatar next to the badge, not a large image, so the first screen still reaches the prices (see 4).
- **Trust row** under the buttons: three stats, each a bold value with a muted label.

  | vi value | vi label | en value | en label |
  |---|---|---|---|
  | 9+ năm | xây dựng hệ thống | 9+ years | building systems |
  | 10.000+ | cán bộ dùng iOffice | 10,000+ | officials use iOffice |
  | 3 phút → 60 giây | thời gian báo cáo iGate | 3 min → 60 s | iGate report time |

  The values come from the existing project highlights (`ioffice`, `igate`) and the hero summary. They live in `services.trust[]`.

### 2. "Dự án tiêu biểu" (Featured work), between the service cards and the process

- **Cards:** four image cards in a grid, 2 columns on desktop and 1 on mobile.
- **Data:** each card reuses the project's existing data in `projects.items` (`name`, `highlight`, `cardBackground`).
- **Links:** a card links to `/projects/<id>/` when the project has a detail page. Otherwise it links to the project's `links.demo`, opened in a new tab with `rel="noopener noreferrer"`.
- **Service chip:** each card shows a small chip naming the service it illustrates.
- **Config:** `services.featured[] { projectId, serviceId }`.

| projectId | serviceId | link |
|---|---|---|
| `to-lua-eakar` | website | demo `https://totam.up.railway.app/` |
| `solo-cafe-order` | management | `/projects/solo-cafe-order/` |
| `dsf-hospital-suite` | management | `/projects/dsf-hospital-suite/` |
| `igate` | automation | `/projects/igate/` |

- **Images:** `loading="lazy"`, with an explicit `aspect-ratio: 16/10` box so the layout does not shift. `alt` is the project name. A dark bottom gradient keeps the text readable, the same treatment as the home project cards.
- **Title:** "Dự án tiêu biểu" / "Featured work", with the standard title bar.
- **Fallback:** a card whose `projectId` is missing from `projects.items` is skipped. The section is hidden if no card remains.

### 3. Service cards

- **Benefits:** shown with a ✓ glyph (the small sky check already used in "Vì sao chọn mình") instead of bullet points.
- **New line under the title:** "Phù hợp với: …" (`items[].fit`).
  - website: "cửa hàng, quán, doanh nghiệp cần có mặt trên Google"
  - management: "quán cà phê, cửa hàng, cơ sở dịch vụ có đơn hàng mỗi ngày"
  - automation: "đội ngũ đang mất thời gian cho việc lặp lại"
  - en translations follow the same meaning.
- **Per-card call to action:** a full-width secondary button "Hỏi giá gói này qua Zalo" / "Ask about this on Zalo", linking to Zalo.
- **Highlighted card:** `management` gets a 2px gradient border (the home avatar ring technique) and a "Phổ biến" / "Popular" chip. The highlight is set by `items[].featured: true`.

### 4. Mobile layout and contact bar

- **Contact bar:** below 768px, the floating Zalo bubble is replaced by a fixed bottom bar with two equal buttons: "Zalo" (gradient) and "Gọi" (ghost, `tel:`).
  - Bar height is 64px plus `env(safe-area-inset-bottom)`, on a white background with a top shadow.
  - The page gets matching bottom padding so the final call to action is never covered.
- **First screen shows a price:** on a 375×812 viewport, the first service card's price must be visible without scrolling. The hero is compacted (avatar instead of the big photo, smaller title, trust row as one scrollable line) and the cards move up.

### 5. Accessibility and interaction

- **Focus ring:** every link, button and `summary` on the page gets `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }`.
- **Tap targets:** the back link and every interactive element are at least 44px tall.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, there is no hover lift (`transform`) and no transitions on the page.

### 6. FAQ accordion

- Hide the native marker.
- Add a chevron (stroke SVG) on the right that rotates 180° when the item is open. The rotation is instant under reduced motion.
- The whole `summary` row is the tap target, at least 48px tall.
- Native `<details>` behaviour is kept, so no JavaScript is needed.

### 7. Zalo recognisability

The Zalo buttons and the mobile bar show the word "Zalo" in their label. The generic chat icon is not used on its own anywhere.

## Content model changes (`services` in vi.json / en.json)

- `trust[] { value, label }`: exactly 3 items.
- `featured[] { projectId, serviceId }`: language-neutral, same in vi and en.
- `labels.featuredTitle`, `labels.fit`, `labels.askCard`, `labels.popular`, `labels.call`.
- `items[].fit` (string). `items[].featured` (boolean) on `management` only.
- vi and en keep identical key paths; the existing parity test enforces this.

## Out of scope (phase 2 and 3)

- Testimonials, a case study, and client names or logos, which need owner content.
- An OG image for the services page, JSON-LD, and GA click events.
- Changes to the home page.

## Testing

Each item gets a Playwright test that fails before the change:

1. **Hero:**
   - On desktop the photo is visible, with `width`/`height` and `fetchpriority=high`.
   - The `h1` is at most 2 lines at 1440px.
   - The trust row shows 3 items with the vi values above.
2. **Featured work:**
   - 4 cards in the order above.
   - The links resolve: the 3 detail pages, plus the demo with `target=_blank` and `rel=noopener noreferrer`.
   - Every image has `alt`, `loading=lazy` and a reserved aspect ratio, with no layout shift.
3. **Service cards:**
   - Each card shows its fit line and a Zalo "ask" button.
   - The `management` card has the Popular chip.
4. **Mobile (375×812):**
   - The first `.svc-price` is visible on load.
   - The bottom bar shows Zalo and Gọi.
   - At the page bottom, the final call-to-action buttons do not intersect the bar.
   - No horizontal scroll at 360px.
5. **Accessibility:**
   - `:focus-visible` outline width is 2px on a link, a button and a `summary`.
   - The back link is at least 44px tall.
   - Under reduced motion, card `transition-duration` is 0s.
6. **FAQ:** no native marker, and the chevron rotates when an item is open.
7. **Visual check:** screenshot comparison in the CI Docker image stays green. The home page is unchanged.
