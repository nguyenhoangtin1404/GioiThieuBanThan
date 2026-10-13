import { test, expect } from './fixtures';

const SITE = 'https://www.nguyenhoangtin.com';

test.describe('SEO files', () => {
  // Same output on every viewport, so run once.
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('robots.txt is valid and points to the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  test('sitemap.xml lists home and project pages', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    for (const path of ['/', '/projects/igate/', '/projects/ecabinet/', '/projects/ioffice/', '/projects/other-projects/', '/projects/dsf-hospital-suite/', '/projects/solo-cafe-order/']) {
      expect(body).toContain(`<loc>${SITE}${path}</loc>`);
    }
  });

  test('sitemap does not list personal projects without detail', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text();
    expect(body).not.toContain('/projects/pyn-world/');
  });

  test('pages have a canonical URL without query string', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
    await page.goto('/projects/igate/?lang=en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/projects/igate/`);
  });
});
