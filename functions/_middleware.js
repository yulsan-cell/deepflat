// Cloudflare Pages Functions middleware (2026-11-25). The old address deepflat.pages.dev answers with a 301 to the
// main address https://deepflat.kr, keeping the path and the query string, so visitors, links and search engines
// all land on one address (owner 2026-11-25: "올려줘" for the new address and the old address's redirect).
// Why here: the account-level Bulk Redirect for pages.dev (list pagesdev_to_deepflat_kr, rule "pages.dev to
// deepflat.kr") was set up as Cloudflare's guide says but never took effect (still 200 after 45 minutes).
// Only the exact host deepflat.pages.dev is redirected: https://deepflat.kr itself and preview deployments
// (<hash>.deepflat.pages.dev) pass through to the static files. Copied to the repository's functions/ folder by
// drafts/tools/sync-deepflat-site.mjs. site-root/_routes.json keeps images and icons out of this Function.
// Also (2026-11-25 SEO/GEO/AEO review wf_31cb2c66-10a): the old comparison address /mixed (mixed.html, 2026-10-30)
// answers with one real 301 to the main page, and preview deployments carry X-Robots-Tag: noindex.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'deepflat.pages.dev') {
    url.protocol = 'https:';
    url.hostname = 'deepflat.kr';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === '/mixed' || url.pathname === '/mixed.html') return Response.redirect('https://deepflat.kr/', 301);
  const res = await context.next();
  if (url.hostname.endsWith('.deepflat.pages.dev')) {
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  }
  return res;
}
