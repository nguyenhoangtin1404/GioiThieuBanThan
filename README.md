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

## CI/CD với GitHub Actions và FTP

Dự án đã được cấu hình để tự động build và deploy lên hosting qua FTP mỗi khi push code lên nhánh `main`.

### Cách hoạt động

1. **Build trên GitHub Actions**: Khi bạn push code lên nhánh `main`, GitHub Actions sẽ tự động:
   - Checkout source code
   - Cài đặt Node.js và dependencies
   - Build dự án Astro (`npm run build`)
   - Upload files đã build từ thư mục `dist/` lên FTP server

2. **Hosting chỉ nhận static files**: Hosting của bạn chỉ cần phục vụ static files (HTML, CSS, JS đã được build sẵn), không cần Node.js.

### Cấu hình GitHub Secrets

Để sử dụng CI/CD, bạn cần cấu hình các secrets sau trong GitHub repository:

1. Vào repository trên GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** và thêm các secrets sau:

   - `FTP_SERVER`: Địa chỉ FTP server (ví dụ: `ftp.example.com` hoặc `123.456.789.0`)
   - `FTP_USERNAME`: Tên đăng nhập FTP
   - `FTP_PASSWORD`: Mật khẩu FTP
   - `FTP_REMOTE_PATH`: Đường dẫn trên server (ví dụ: `/public_html` hoặc `/htdocs` hoặc `/www`)

### Kiểm tra deployment

Sau khi push code lên nhánh `main`:

1. Vào tab **Actions** trên GitHub để xem workflow đang chạy
2. Click vào workflow run để xem chi tiết logs
3. Kiểm tra website của bạn để verify files đã được upload thành công

### Lưu ý

- Đảm bảo FTP server cho phép kết nối từ GitHub Actions IPs (hầu hết các hosting đều cho phép)
- Nếu deployment thất bại, kiểm tra logs trong tab Actions để xem lỗi cụ thể
- Workflow file nằm tại `.github/workflows/deploy-ftp.yml` nếu bạn cần chỉnh sửa

## Trang Test Full Page Scrolling

Giải pháp full page scrolling:

### Trang Test
- **URL**: `http://localhost:4321/vanilla-fullpage-test`
- **File**: `src/pages/vanilla-fullpage-test.astro`

### Module VanillaFullpage
- **Location**: `public/js/vanilla-fullpage.js`
- **Mô tả**: Thư viện full page scrolling tự code, không phụ thuộc thư viện bên ngoài
- **Tính năng**:
  - ✅ Full page scrolling với smooth animation
  - ✅ Hỗ trợ scroll dọc (vertical) và ngang (horizontal)
  - ✅ Navigation dots (các chấm bên phải màn hình)
  - ✅ Keyboard navigation (Arrow keys, Page Up/Down, Home, End)
  - ✅ Mouse wheel scrolling (tự động phát hiện hướng)
  - ✅ Touch/Swipe support cho mobile (hỗ trợ cả dọc và ngang)
  - ✅ URL hash anchors (ví dụ: `#contact`)
  - ✅ Loop bottom (quay về đầu từ section cuối)
  - ✅ Hoàn toàn miễn phí, không watermark

### Cách sử dụng

```javascript
// Load script
<script src="/js/vanilla-fullpage.js"></script>

// Khởi tạo với scroll dọc (mặc định)
const fullpage = new VanillaFullpage('#fullpage', {
  anchors: ['home', 'about-us', 'contact', 'footer'],
  navigation: true,        // Bật navigation dots
  scrollingSpeed: 1000,     // Tốc độ scroll (ms)
  loopBottom: true,         // Cho phép loop từ cuối về đầu
  direction: 'vertical'     // 'vertical' (dọc) hoặc 'horizontal' (ngang)
});

// Hoặc cho phép cả cuộn dọc và ngang
const fullpageHorizontalBoth = new VanillaFullpage('#fullpage', {
  anchors: ['home', 'about-us', 'contact', 'footer'],
  navigation: true,
  scrollingSpeed: 1000,
  loopBottom: true,
  direction: 'horizontal',
  allowVerticalScrollInHorizontal: true        // Bật tính năng scroll bằng cả cuộn dọc và ngang
});
```

### Cấu trúc HTML cần thiết

```html
<div id="fullpage">
  <div class="section" data-anchor="home">Section 1</div>
  <div class="section" data-anchor="about">Section 2</div>
  <div class="section" data-anchor="contact">Section 3</div>
</div>

<!-- Navigation dots (optional) -->
<ul class="fp-nav">
  <li><a href="#home" data-index="0"></a></li>
  <li><a href="#about" data-index="1"></a></li>
  <li><a href="#contact" data-index="2"></a></li>
</ul>
```

### Tài liệu API

Xem JSDoc comments trong file `public/js/vanilla-fullpage.js` để biết chi tiết về các methods và options.

### Options

| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| `anchors` | `string[]` | `[]` | Mảng anchors cho URL hash |
| `navigation` | `boolean` | `true` | Bật/tắt navigation dots |
| `scrollingSpeed` | `number` | `1000` | Tốc độ scroll animation (milliseconds) |
| `loopBottom` | `boolean` | `false` | Cho phép loop từ section cuối về đầu |
| `direction` | `'vertical' \| 'horizontal'` | `'vertical'` | Hướng scroll: dọc hoặc ngang |
| `allowVerticalScrollInHorizontal` | `boolean` | `false` | Khi `direction='horizontal'`, cho phép scroll bằng cả cuộn dọc (deltaY) và cuộn ngang (deltaX). Mặc định `false` (chỉ hỗ trợ cuộn ngang). Đặt `true` để bật tính năng này |

### Lưu ý

- Module được expose ra `window.VanillaFullpage` sau khi script load
- Cần đợi script load xong trước khi khởi tạo (xem ví dụ trong `vanilla-fullpage-test.astro`)
- Trong Astro, script tags cần có `is:inline` để tránh lỗi 500
- Khi sử dụng `direction: 'horizontal'`, CSS sẽ tự động được áp dụng để hỗ trợ scroll ngang
