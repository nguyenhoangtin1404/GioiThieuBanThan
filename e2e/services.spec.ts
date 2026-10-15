import { readFileSync } from 'node:fs';
import { test, expect, gotoReady } from './fixtures';

const load = (lang: string) => JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'));

// Every key path; array items are compared position by position.
function keyPaths(o: any, p = ''): string[] {
  if (Array.isArray(o)) return o.flatMap((v, i) => keyPaths(v, `${p}[${i}]`));
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => keyPaths(v, p ? `${p}.${k}` : k));
  return [p];
}

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

test.describe('translations', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'file check, one project is enough');
  });

  test('services keys match between vi and en', () => {
    const vi = load('vi');
    const en = load('en');
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
