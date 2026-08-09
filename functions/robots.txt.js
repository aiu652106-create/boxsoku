export function onRequestGet({ env, request }) {
  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const body = `User-agent: OAI-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /editor.html

Sitemap: ${siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=UTF-8" }
  });
}

