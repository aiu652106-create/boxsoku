const escapeXml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export async function onRequestGet({ env, request }) {
  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const staticPages = ["", "/about.html", "/privacy.html", "/disclaimer.html", "/contact.html"];
  let articles = [];

  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/articles?select=slug,updated_at&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&order=published_at.desc`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
        }
      }
    );
    if (response.ok) articles = await response.json();
  }

  const urls = [
    ...staticPages.map(
      (path) => `<url><loc>${escapeXml(siteUrl + path)}</loc></url>`
    ),
    ...articles.map(
      (article) =>
        `<url><loc>${escapeXml(
          `${siteUrl}/news/${encodeURIComponent(article.slug)}`
        )}</loc><lastmod>${escapeXml(
          new Date(article.updated_at).toISOString()
        )}</lastmod></url>`
    )
  ].join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=UTF-8" } }
  );
}

