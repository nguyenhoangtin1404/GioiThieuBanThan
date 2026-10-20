// Renders public/og-dich-vu.png (1200x630), the link preview for /dich-vu/.
// HTML + the site font (Be Vietnam Pro) in headless Chromium, so Vietnamese
// diacritics render exactly as on the page. Run: npm run generate:og-services
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const vi = JSON.parse(readFileSync(`${root}src/i18n/translations/vi.json`, 'utf8')).services;
const font = () => `${root}node_modules/@fontsource/be-vietnam-pro/files/be-vietnam-pro`;
const face = (w) => ['vietnamese', 'latin']
  .map((s) => `@font-face{font-family:BVP;font-weight:${w};src:url(file://${font()}-${s}-${w}-normal.woff2) format('woff2')}`)
  .join('');
// Entry price: the first package (website), "Từ 5 triệu"
const minPrice = vi.items[0].price;

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
${face(500)}${face(700)}${face(800)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:BVP,sans-serif;background:#F3F9FF;color:#0F172A;
  display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:center;padding:0 80px}
.badge{display:inline-block;padding:10px 24px;border-radius:999px;background:rgba(14,165,233,.15);color:#0369a1;font-weight:700;font-size:26px}
h1{font-size:56px;line-height:1.14;font-weight:800;margin:26px 0 24px;letter-spacing:-.5px;text-wrap:balance}
.services{font-size:21px;font-weight:500;color:#475569}
.services span{white-space:nowrap}
.foot{margin-top:30px;display:flex;align-items:center;gap:18px;font-size:26px;font-weight:700}
.price{padding:10px 24px;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#010409}
.name{color:#0369a1}
.photo{width:300px;height:300px;border-radius:50%;border:8px solid transparent;
  background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#0ea5e9,#6366f1) border-box;overflow:hidden;
  box-shadow:0 18px 40px rgba(2,6,23,.15)}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body>
<div>
  <span class="badge">${vi.labels.badge}</span>
  <h1>${vi.hero.title}</h1>
  <p class="services">${vi.items.map((i) => `<span>${i.title}</span>`).join(' · ')}</p>
  <div class="foot"><span class="price">${minPrice}</span><span class="name">Nguyễn Hoàng Tín</span></div>
</div>
<div class="photo"><img src="file://${root}public/contact-768.jpg" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// A file:// page may load the local font and photo; about:blank may not
const dir = mkdtempSync(join(tmpdir(), 'og-'));
writeFileSync(join(dir, 'og.html'), html);
await page.goto(`file://${join(dir, 'og.html')}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}public/og-dich-vu.png` });
await browser.close();
rmSync(dir, { recursive: true, force: true });
console.log('✓ public/og-dich-vu.png');
