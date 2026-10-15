# Services page (`/dich-vu/`) — design

## Intent

- **Goal:** a page that sells freelance work to **small businesses (SMEs) in Vietnam**: shop and café owners and small companies that are not technical and care about results and cost.
- **Success:** an SME owner who opens the link (shared on Zalo or Facebook, or reached from the portfolio) understands within a minute what they can buy, roughly what it costs, and taps **Zalo** to ask.
- **Audiences:** the home page keeps speaking to recruiters (Technical Lead). This page is for clients. The two messages stay separate.

## Decisions (agreed with the owner)

| Topic | Decision |
|---|---|
| Audience | Vietnamese SMEs |
| Services | Website / landing page · Management software · Automation & AI |
| Pricing | "From …" price and usual duration per service |
| Primary CTA | Zalo chat `https://zalo.me/84856694766` (same number as the phone on the site) |
| Placement | Separate page `/dich-vu/`, normal scrolling, linked from the sidebar and the Contact section |
| Languages | vi and en, like the rest of the site. Copy is written for Vietnamese readers first; en is a translation. |

## Page content (top to bottom)

1. **Hero**
   - Title: "Website và phần mềm giúp cửa hàng, doanh nghiệp nhỏ bán được nhiều hơn, bớt việc tay".
   - Subtitle: "Làm việc trực tiếp với người làm — hơn 9 năm xây dựng hệ thống cho khu vực công và y tế."
   - Primary button: "Nhắn Zalo tư vấn miễn phí" (Zalo link).
   - Secondary button: "Xem dự án đã làm" → `/#du-an`.
2. **Three service cards.** Each card shows a title, 3–4 "Bạn nhận được" bullets, the price, the duration, and an optional example project link.

   | id | Title (vi) | Price | Duration | Example |
   |---|---|---|---|---|
   | `website` | Website / landing page | Từ 5 triệu | 1–2 tuần | none |
   | `management` | Phần mềm quản lý | Từ 15 triệu | 3–6 tuần | `solo-cafe-order` → `/projects/solo-cafe-order/` |
   | `automation` | Tự động hóa & AI | Từ 5 triệu | 1–3 tuần | none |

   Bullets:
   - **Website:**
     - giao diện đẹp trên điện thoại
     - khách tìm thấy trên Google
     - nút gọi / Zalo / bản đồ
     - tự sửa nội dung được
   - **Management:**
     - quản lý đơn, kho, khách hàng tại một chỗ
     - dùng trên điện thoại và máy tính
     - báo cáo doanh thu
     - phân quyền nhân viên
   - **Automation:**
     - chatbot trả lời khách 24/7
     - tự động hóa việc lặp lại (nhập liệu, báo cáo, nhắc việc)
     - kết nối các công cụ đang dùng

3. **Process (4 steps):**
   1. Trao đổi miễn phí
   2. Báo giá & đề xuất rõ ràng
   3. Làm & cập nhật tiến độ hằng tuần
   4. Bàn giao, hướng dẫn sử dụng, bảo hành
4. **Why me (4 points):**
   - 9+ năm, hệ thống lớn cho khu vực công & y tế
   - Làm việc trực tiếp, không qua trung gian
   - Giá rõ ràng trước khi bắt đầu
   - Hỗ trợ sau bàn giao
5. **FAQ (5 items):**
   - Tôi không rành kỹ thuật có sao không?
   - Chi phí gồm những gì?
   - Bao lâu thì xong?
   - Sau bàn giao ai sửa lỗi?
   - Thanh toán thế nào?

   Answers are short. Payment: chia đợt theo tiến độ. Warranty period: 3 tháng.
6. **Final CTA:** the Zalo button and the phone number (`tel:`). On mobile (<768px) a floating Zalo button stays fixed bottom-right and does not cover the final CTA.

Prices, durations and all text live in the translation JSON, so the owner can edit them without touching code.

## Architecture

- **`src/config/contact.ts`** exports `CONTACT = { email, phone, phoneHref, telegram, telegramHref, zaloHref }`.
  - `ContactCard.astro` reads its hard-coded values from here.
  - The services page reads it too.
  - There is a single source for every number.
- **`src/i18n/translations/{vi,en}.json`** gets a new top-level `services` key:
  - `meta { title, description }`
  - `hero { title, subtitle, primaryCta, secondaryCta }`
  - `labels { benefits, duration, example, floatingZalo }`
  - `items[] { id, title, benefits[], price, duration, exampleProjectId? }`
  - `process { title, steps[] }`
  - `whyMe { title, points[] }`
  - `faq { title, items[] { q, a } }`
  - `cta { title, text, zalo, phone }`
- **`src/components/Services.astro`** takes `{ services, lang }` and renders sections 1–6. It is presentational only and has no client script except the floating button.
- **`src/pages/dich-vu.astro`**
  - Renders both languages in `data-lang-block` wrappers, following the `projects/[id].astro` pattern.
  - Keeps per-language `<title>` through `data-titles`.
  - Server-renders the vi meta description.
  - Uses `BaseLayout`.
  - Normal page scroll. Does not load `vanilla-fullpage.js`.
- **Site links:**
  - Add a "Dịch vụ" sidebar item in `BaseLayout.astro`. It is a real `<a href="/dich-vu/">`, not a section button, and is labelled per language.
  - Add a line under the home Contact section: "Cần làm website/phần mềm? Xem dịch vụ →".
  - Add `/dich-vu/` to `src/pages/sitemap.xml.ts`.
- **External links** use `target="_blank" rel="noopener noreferrer"`. `tel:` links don't.

## Error handling

- If an item's `exampleProjectId` has no project detail page (`hasProjectDetail` is false or the id is missing), no example link is rendered.
- If `services` is missing from a translation file, the page falls back to the vi content and the build does not fail.

## Testing (`e2e/services.spec.ts`)

1. `/dich-vu/` shows 3 service cards with their "Từ … triệu" prices (vi). With `?lang=en`, the English content shows instead.
2. Every Zalo link points to `https://zalo.me/84856694766`. The phone link is `tel:+84856694766`.
3. Mobile has no horizontal scroll. The floating Zalo button is visible on mobile and hidden on desktop.
4. The sidebar "Dịch vụ" link from the home page opens `/dich-vu/`. The Contact line links there too.
5. `/sitemap.xml` contains `/dich-vu/`.
6. The `services` keys are identical in vi.json and en.json, checked with a recursive key comparison.
7. Existing non-visual suites stay green. The new sidebar item changes the home screenshots, so their baselines are regenerated in the CI Docker image (`mcr.microsoft.com/playwright:v1.56.1-noble`) and the diff is reviewed.

## Out of scope

Contact form or backend, online payment, a blog or case studies, analytics events beyond the existing GA page view, and new images (the OG image reuses `og-image.png`).
