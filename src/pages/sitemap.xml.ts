import type { APIRoute } from 'astro';
import { getProjectIds } from '@i18n/utils';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', ...(await getProjectIds()).map((id) => `/projects/${id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
