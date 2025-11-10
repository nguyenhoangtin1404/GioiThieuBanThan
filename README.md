# Profilio — Astro Profile

Hồ sơ cá nhân tối giản được dựng bằng [Astro](https://astro.build/) với layout dạng một trang, phù hợp để giới thiệu bản thân, kỹ năng và dự án nổi bật.

## Yêu cầu

- Node.js >= 18.14
- pnpm / npm / yarn (ví dụ bên dưới dùng `npm`)

## Cài đặt

```bash
npm install
```

## Lệnh hữu ích

```bash
npm run dev      # Chạy dự án ở chế độ phát triển
npm run build    # Xuất ra build tĩnh trong thư mục dist
npm run preview  # Chạy bản build để kiểm tra trước khi deploy
```

## Cấu trúc chính

- `src/pages/index.astro`: trang chính với layout hồ sơ
- `src/components/*`: các section (hero, kỹ năng, dự án…)
- `src/layouts/BaseLayout.astro`: layout chung, khai báo font và CSS nền

Bạn có thể chỉnh nội dung các component để khớp với hồ sơ của riêng mình rồi deploy lên bất kỳ dịch vụ static hosting nào (Netlify, Vercel, Cloudflare Pages,…).
