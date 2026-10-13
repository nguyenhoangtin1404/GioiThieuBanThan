import type { APIRoute } from 'astro';
import { getTranslations } from '@i18n/utils';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://www.nguyenhoangtin.com');
  const vi = await getTranslations('vi');
  const en = await getTranslations('en');
  const ids = new Set<string>();
  [...(vi.projects?.items || []), ...(en.projects?.items || [])].forEach((p: any) => p?.id && ids.add(p.id));

  const paths = ['/', ...Array.from(ids).map((id) => `/projects/${id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
