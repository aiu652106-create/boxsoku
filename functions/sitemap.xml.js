import { securityHeaders } from "./_shared/security.js";

const escapeXml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export async function onRequestGet({ env, request }) {
  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const staticPages = [
    "",
    "/schedule",
    "/lemino-boxing",
    "/boxing-broadcast",
    "/boxing-news",
    "/wowow-excite-match",
    "/about",
    "/privacy",
    "/disclaimer",
    "/contact"
  ];
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
      (path) => `<url><loc>${escapeXml(siteUrl + (path || "/"))}</loc></url>`
    ),
    ...articles.map(
      (article) => {
        const lastmod = isoDate(article.updated_at);
        return `<url><loc>${escapeXml(
          `${siteUrl}/news/${encodeURIComponent(article.slug)}`
        )}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`;
      }
    )
  ].join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: securityHeaders({
        "Content-Type": "application/xml; charset=UTF-8",
        "Cache-Control": "public, max-age=300, s-maxage=300"
      })
    }
  );
}

