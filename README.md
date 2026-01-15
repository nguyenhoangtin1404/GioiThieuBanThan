# GioiThieuBanThan — Astro Portfolio (VI/EN)

Website portfolio/CV online dựng bằng [Astro](https://astro.build/) theo kiểu **one-page + fullpage (desktop)** và **scroll thường (mobile)**, có **i18n VI/EN** theo query `?lang=` và phần **Dự án** có **modal xem nhanh + trang chi tiết có URL**.

## Tính năng chính

- **Fullpage scrolling trên desktop** bằng thư viện tự viết `public/js/vanilla-fullpage.js` (instance: `window.vanillaFullpage`).
- **Mobile layout**: tắt fullpage, dùng scroll tự nhiên + IntersectionObserver để trigger animation khi cuộn.
- **i18n**: `vi` / `en` theo `?lang=` (ưu tiên URL → localStorage → mặc định `vi`).
- **Projects**:
  - Click card mở **modal xem nhanh**
  - Nút “Xem chi tiết” dẫn tới `/projects/<id>?lang=...`
  - Gallery dạng carousel (scroll-snap) + **GLightbox** (load từ CDN jsDelivr) để xem ảnh full.

## Yêu cầu

- Node.js **>= 18.14**
- npm (hoặc pnpm/yarn)

## Cài đặt & chạy local

```bash
npm install
npm run dev
```

Các lệnh hữu ích:

```bash
npm run dev      # dev server
npm run build    # build static ra dist/
npm run preview  # preview dist/
```

## Cấu trúc thư mục quan trọng

- `src/pages/index.astro`: trang one-page (Hero / Projects / Timeline / Contact) + logic desktop/mobile/fullpage/animations.
- `src/layouts/BaseLayout.astro`: layout chung + CSS global + lang switcher.
- `src/components/*`: các section UI (`Hero.astro`, `Projects.astro`, `Timeline.astro`, `ContactCard.astro`, `ProjectDetail.astro`).
- `src/pages/projects/[id].astro`: **trang chi tiết dự án** (static build với `getStaticPaths()`).
- `src/i18n/translations/{vi,en}.json`: dữ liệu nội dung + dự án cho từng ngôn ngữ.
- `public/js/vanilla-fullpage.js`: thư viện fullpage tự viết.

## i18n (VI/EN) hoạt động thế nào?

- Hàm xác định ngôn ngữ nằm ở `src/i18n/utils.ts`:
  - Server-side: đọc `?lang=vi|en` từ `Astro.url`
  - Client-side: đọc `?lang=` → fallback localStorage → fallback `vi`
- Dữ liệu text được map thông qua `data-i18n`, `data-i18n-attr`, `data-i18n-attr-title` (xem `src/layouts/BaseLayout.astro`).

## Dự án (Modal + Trang chi tiết)

- Modal xem nhanh nằm trong `src/components/Projects.astro`
  - Khi mở modal sẽ **disable wheel** của fullpage: `window.vanillaFullpage.setWheelEnabled(false)`; đóng modal bật lại.
  - Gallery modal render động và init GLightbox bằng CDN (jsDelivr).
- Trang chi tiết dự án: `src/pages/projects/[id].astro`
  - Static build yêu cầu `getStaticPaths()` → list `id` lấy từ `src/i18n/translations/vi.json` và `en.json`.

### Thêm/sửa dự án

Sửa trong:
- `src/i18n/translations/vi.json`
- `src/i18n/translations/en.json`

Mỗi project nên có tối thiểu:
- `id` (unique, dùng làm URL `/projects/<id>`)
- `name`, `description`, `tools`, `impact`, `gallery`

Field tuỳ chọn:
- `period`, `role`, `tasks` (trang chi tiết chỉ hiển thị “Nhiệm vụ” khi có `tasks`).

## Fullpage scrolling (VanillaFullpage)

- **Trang test**: `http://localhost:4321/vanilla-fullpage-test` (`src/pages/vanilla-fullpage-test.astro`)
- **Thư viện**: `public/js/vanilla-fullpage.js`
- Lưu ý:
  - Class global là `VanillaFullpage` (sau khi load script).
  - Project này lưu instance ở `window.vanillaFullpage`.
  - Có API `setWheelEnabled(boolean)` để khoá mở wheel khi cần (ví dụ mở modal).

## CI/CD với GitHub Actions + FTP

Repo có workflow deploy qua FTP khi push lên nhánh `main`:
- Workflow: `.github/workflows/deploy-ftp.yml`
- Output build: `dist/`

### Secrets cần cấu hình

- `FTP_HOST`
- `FTP_USER`
- `FTP_PASS`

### Troubleshooting deploy

- **Lỗi DNS/ENOTFOUND**: ưu tiên dùng **IP** thay cho hostname trong `FTP_HOST`.

## Troubleshooting dev

- Nếu gặp lỗi kiểu “Outdated Optimize Dep” / load module fail khi dev, thử restart dev server với:

```bash
npm run dev -- --force
```
