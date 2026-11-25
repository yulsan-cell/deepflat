// Cloudflare Pages Functions middleware (2026-11-25). The old address deepflat.pages.dev answers with a 301 to the
// main address https://deepflat.kr, keeping the path and the query string, so visitors, links and search engines
// all land on one address (owner 2026-11-25: "올려줘" for the new address and the old address's redirect).
// Why here: the account-level Bulk Redirect for pages.dev (list pagesdev_to_deepflat_kr, rule "pages.dev to
// deepflat.kr") was set up as Cloudflare's guide says but never took effect (still 200 after 45 minutes).
// Only the exact host deepflat.pages.dev is redirected: https://deepflat.kr itself and preview deployments
// (<hash>.deepflat.pages.dev) pass straight through to the static files. Copied to the repository's functions/
// folder by drafts/tools/sync-deepflat-site.mjs.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'deepflat.pages.dev') {
    url.protocol = 'https:';
    url.hostname = 'deepflat.kr';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
