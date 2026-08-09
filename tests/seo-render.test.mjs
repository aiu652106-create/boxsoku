import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const functionSource = fs.readFileSync(
  path.join(projectRoot, "functions", "news", "[slug].js"),
  "utf8"
);
const temporaryModule = path.join(
  os.tmpdir(),
  `boxsoku-seo-function-${Date.now()}.mjs`
);
fs.writeFileSync(temporaryModule, functionSource, "utf8");
const { onRequestGet, onRequestHead } = await import(temporaryModule);
fs.unlinkSync(temporaryModule);

const article = {
  id: "article-1",
  slug: "seo-test",
  title: "9月2日のボクシング試合予定",
  summary: "",
  body: [
    "## 大会概要",
    "2026年9月2日、横浜BUNTAIでボクシング興行が開催されます。",
    "- 開催日：2026年9月2日\n- 会場：横浜BUNTAI",
    "## 配信情報",
    "配信：Lemino"
  ].join("\n\n"),
  image_url: "https://example.com/event.jpg",
  boxrec_url: "",
  accent: "red",
  is_advertorial: true,
  affiliate_disclosure: "この記事にはアフィリエイトリンクが含まれています。",
  affiliate_links: [
    {
      label: "Leminoプレミアムでライブ配信",
      url: "https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2"
    },
    {
      type: "fight_cards",
      cards: [
        {
          bout: "メイン",
          weight: "世界タイトルマッチ12回戦",
          left: { name: "選手A", ranking: "WBA1位", profile: "", image: "" },
          right: { name: "選手B", ranking: "WBA2位", profile: "", image: "" }
        }
      ]
    }
  ],
  tweets: [],
  youtube_urls: [],
  instagram_urls: [],
  published_at: "2026-08-05T00:00:00.000Z",
  updated_at: "2026-08-09T00:00:00.000Z"
};

const listArticle = {
  slug: article.slug,
  title: article.title,
  image_url: article.image_url,
  accent: article.accent,
  published_at: article.published_at
};

const requestedUrls = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  requestedUrls.push(url);
  if (url.includes("slug=eq.seo-test")) {
    return Response.json([article]);
  }
  if (url.includes("/rest/v1/articles?")) {
    return Response.json([listArticle]);
  }
  return new Response(null, { status: 204 });
};

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-test-key",
  SITE_URL: "https://boxsoku.com",
  SITE_NAME: "ボクシング速報",
  VISITOR_ID_SALT: "test-salt"
};

const makeContext = (method, userAgent = "") => ({
  env,
  params: { slug: article.slug },
  request: new Request(
    `https://boxsoku.com/news/${article.slug}?boxsoku_verify=1`,
    { method, headers: userAgent ? { "User-Agent": userAgent } : {} }
  ),
  waitUntil(promise) {
    return promise;
  }
});

const response = await onRequestGet(makeContext("GET"));
assert.equal(response.status, 200);
const html = await response.text();

const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
assert.ok(description?.startsWith("2026年9月2日"));
assert.ok(!description.includes("##"));
assert.match(html, /<h2>大会概要<\/h2>/);
assert.match(html, /<ul><li>開催日：2026年9月2日<\/li>/);
assert.match(html, /"@type":"Article"/);

const bodyIndex = html.indexOf('<div class="retro-detail-body">');
const streamingIndex = html.indexOf('<aside class="affiliate-links">');
const fightCardsIndex = html.indexOf('<section class="retro-fight-cards"');
const productsIndex = html.indexOf('<section class="affiliate-products"');
assert.ok(bodyIndex >= 0 && bodyIndex < streamingIndex);
assert.ok(streamingIndex < fightCardsIndex);
assert.ok(fightCardsIndex < productsIndex);

requestedUrls.length = 0;
const headResponse = await onRequestHead(makeContext("HEAD"));
assert.equal(headResponse.status, 200);
assert.equal(await headResponse.text(), "");
assert.ok(!requestedUrls.some((url) => url.includes("/rpc/")));
assert.equal(headResponse.headers.get("Set-Cookie"), null);

requestedUrls.length = 0;
const botContext = makeContext("GET", "OAI-SearchBot");
botContext.request = new Request(`https://boxsoku.com/news/${article.slug}`, {
  headers: { "User-Agent": "OAI-SearchBot" }
});
const botResponse = await onRequestGet(botContext);
assert.equal(botResponse.status, 200);
assert.equal(botResponse.headers.get("Set-Cookie"), null);
assert.match(botResponse.headers.get("Cache-Control") || "", /^public/);
assert.ok(!requestedUrls.some((url) => url.includes("/rpc/")));

const robotsSource = fs.readFileSync(
  path.join(projectRoot, "functions", "robots.txt.js"),
  "utf8"
);
assert.match(robotsSource, /User-agent: OAI-SearchBot\nAllow: \//);
assert.match(robotsSource, /User-agent: Googlebot\nAllow: \//);

const sitemapSource = fs.readFileSync(
  path.join(projectRoot, "functions", "sitemap.xml.js"),
  "utf8"
);
assert.match(
  sitemapSource,
  /const staticPages = \["", "\/about", "\/privacy", "\/disclaimer", "\/contact"\]/
);
assert.ok(!sitemapSource.includes("/about.html"));

const staticCanonicalPages = new Map([
  ["index.html", "https://boxsoku.com/"],
  ["about.html", "https://boxsoku.com/about"],
  ["privacy.html", "https://boxsoku.com/privacy"],
  ["disclaimer.html", "https://boxsoku.com/disclaimer"],
  ["contact.html", "https://boxsoku.com/contact"]
]);
for (const [fileName, canonicalUrl] of staticCanonicalPages) {
  const pageSource = fs.readFileSync(path.join(projectRoot, fileName), "utf8");
  assert.ok(pageSource.includes(`<link rel="canonical" href="${canonicalUrl}"`));
  assert.ok(pageSource.includes(`<meta property="og:url" content="${canonicalUrl}"`));
  assert.ok(!/href="(?:index|about|privacy|disclaimer|contact)\.html"/.test(pageSource));
}

console.log("SEO render checks passed");
