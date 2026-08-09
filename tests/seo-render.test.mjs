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

const listingSource = fs.readFileSync(
  path.join(projectRoot, "functions", "_shared", "listing-page.js"),
  "utf8"
);
const temporaryListingModule = path.join(
  os.tmpdir(),
  `boxsoku-listing-function-${Date.now()}.mjs`
);
fs.writeFileSync(temporaryListingModule, listingSource, "utf8");
const { renderListingPage } = await import(temporaryListingModule);
fs.unlinkSync(temporaryListingModule);

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
      url: "https://lemino.docomo.ne.jp/"
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
const relatedListArticle = {
  slug: "related-schedule",
  title: "8月19日のボクシング試合予定",
  image_url: "https://example.com/related.jpg",
  accent: "gold",
  published_at: "2026-08-04T00:00:00.000Z"
};

const requestedUrls = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  requestedUrls.push(url);
  if (url.includes("slug=eq.seo-test")) {
    return Response.json([article]);
  }
  if (url.includes("/rest/v1/articles?")) {
    return Response.json([listArticle, relatedListArticle]);
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
assert.match(html, /"@type":"BreadcrumbList"/);
assert.match(html, /"@type":"SportsEvent"/);
assert.match(html, /"startDate":"2026-09-02"/);
assert.match(html, /"@type":"Organization"/);
assert.match(html, /class="public-breadcrumb"/);
assert.match(html, /編集・確認：ボクシング速報編集部/);
assert.ok(
  html.includes("https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2")
);
assert.ok(!html.includes('href="https://lemino.docomo.ne.jp/"'));
assert.ok(!html.includes("a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"));

const wowowArticle = {
  ...article,
  id: "wowow-article-1",
  slug: "wowow-seo-test",
  title: "8月22日のWOWOWエキサイトマッチ",
  body: "放送日時：8月22日（土）午前5時40分\n\n番組：エキサイトマッチ～世界プロボクシング #19",
  affiliate_links: []
};
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("slug=eq.wowow-seo-test")) return Response.json([wowowArticle]);
  if (url.includes("/rest/v1/articles?")) return Response.json([wowowArticle, listArticle]);
  return new Response(null, { status: 204 });
};
const wowowContext = makeContext("GET");
wowowContext.params = { slug: wowowArticle.slug };
wowowContext.request = new Request(
  `https://boxsoku.com/news/${wowowArticle.slug}?boxsoku_verify=1`
);
const wowowResponse = await onRequestGet(wowowContext);
assert.equal(wowowResponse.status, 200);
const wowowHtml = await wowowResponse.text();
assert.match(wowowHtml, /class="wowow-affiliate-banner"/);
assert.match(wowowHtml, /class="affiliate-teaser"/);
assert.ok(
  wowowHtml.includes(
    "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM"
  )
);
assert.ok(
  wowowHtml.includes(
    "【映画・スポーツ・海外ドラマみるなら】WOWOWオンデマンド"
  )
);
assert.ok(
  wowowHtml.includes(
    "https://www13.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM"
  )
);
assert.ok(
  wowowHtml.includes(
    "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"
  )
);
assert.ok(
  wowowHtml.includes(
    "https://www24.a8.net/svt/bgt?aid=260804209964&wid=002&eno=01&mid=s00000025070001003000&mc=1"
  )
);
assert.ok(
  wowowHtml.includes(
    "https://www14.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"
  )
);
assert.ok(!wowowHtml.includes("https://www22.a8.net/svt/bgt"));
assert.match(wowowHtml, /rel="sponsored nofollow noopener noreferrer"/);
assert.match(wowowHtml, /data-affiliate-service="wowow" data-affiliate-placement="article-top-text"/);
assert.match(wowowHtml, /data-affiliate-service="wowow" data-affiliate-placement="article-bottom-banner"/);
assert.match(wowowHtml, /class="affiliate-disclosure"/);
assert.ok(
  wowowHtml.indexOf('class="affiliate-teaser"') <
    wowowHtml.indexOf('<div class="retro-detail-body">')
);

const bodyIndex = html.indexOf('<div class="retro-detail-body">');
const streamingIndex = html.indexOf('<aside class="affiliate-links">');
const fightCardsIndex = html.indexOf('<section class="retro-fight-cards"');
const relatedIndex = html.indexOf('<section class="related-section"');
const productsIndex = html.indexOf('<section class="affiliate-products"');
assert.ok(bodyIndex >= 0 && bodyIndex < streamingIndex);
assert.ok(streamingIndex < fightCardsIndex);
assert.ok(fightCardsIndex < relatedIndex);
assert.ok(productsIndex > relatedIndex);
assert.equal((html.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.ok(html.includes("hb.afl.rakuten.co.jp"));
assert.match(html, /href="\/schedule"/);
assert.ok(!html.includes('href="/about.html"'));

const inoueArticle = {
  ...article,
  id: "inoue-article-1",
  slug: "naoya-inoue-next-fight",
  title: "井上尚弥の次戦予定",
  body: "井上尚弥の次戦情報をまとめます。",
  affiliate_links: []
};
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("slug=eq.naoya-inoue-next-fight")) return Response.json([inoueArticle]);
  if (url.includes("/rest/v1/articles?")) return Response.json([inoueArticle, listArticle]);
  return new Response(null, { status: 204 });
};
const inoueContext = makeContext("GET");
inoueContext.params = { slug: inoueArticle.slug };
inoueContext.request = new Request(
  `https://boxsoku.com/news/${inoueArticle.slug}?boxsoku_verify=1`
);
const inoueResponse = await onRequestGet(inoueContext);
assert.equal(inoueResponse.status, 200);
const inoueHtml = await inoueResponse.text();
assert.equal((inoueHtml.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.match(inoueHtml, /data-affiliate-service="rakuten" data-affiliate-placement="article-product"/);

const ohashiArticle = {
  ...article,
  id: "ohashi-article-1",
  slug: "phoenix-battle",
  title: "Lemino BOXING PHOENIX BATTLE",
  body: "大橋ボクシングジム主催の興行です。",
  affiliate_links: [
    {
      type: "product_cards",
      cards: [
        {
          title: "大橋ボクシングジム コラボ HEATH Tシャツ メンズ 半袖",
          image: "https://example.com/ohashi-shirt.jpg",
          url: "https://hb.afl.rakuten.co.jp/ichiba/ohashi-owner-link/",
          price: "4,900円"
        },
        {
          title: "井上尚弥 限定 WINNER Tシャツ",
          image: "https://example.com/inoue-shirt.jpg",
          url: "https://hb.afl.rakuten.co.jp/ichiba/inoue-owner-link/",
          price: "4,400円"
        }
      ]
    }
  ]
};
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("slug=eq.phoenix-battle")) return Response.json([ohashiArticle]);
  if (url.includes("/rest/v1/articles?")) return Response.json([ohashiArticle, listArticle]);
  return new Response(null, { status: 204 });
};
const ohashiContext = makeContext("GET");
ohashiContext.params = { slug: ohashiArticle.slug };
ohashiContext.request = new Request(
  `https://boxsoku.com/news/${ohashiArticle.slug}?boxsoku_verify=1`
);
const ohashiResponse = await onRequestGet(ohashiContext);
assert.equal(ohashiResponse.status, 200);
const ohashiHtml = await ohashiResponse.text();
assert.equal((ohashiHtml.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.equal((ohashiHtml.match(/<strong>[^<]*井上尚弥[^<]*<\/strong>/g) || []).length, 2);
assert.match(ohashiHtml, /大橋ボクシングジム コラボ HEATH Tシャツ/);
assert.match(ohashiHtml, /天心語録 \[ 那須川 天心 \]/);
assert.match(ohashiHtml, /56735f5d\.198cf9f9\.56735f5e\.de85ab88/);
assert.ok(!ohashiHtml.includes("ohashi-owner-link"));
assert.ok(!ohashiHtml.includes("inoue-owner-link"));

const listingArticle = {
  ...article,
  view_count: 10
};
globalThis.fetch = async (input) => {
  const url = String(input);
  requestedUrls.push(url);
  if (url.includes("/rest/v1/articles?")) {
    return Response.json([listingArticle, { ...relatedListArticle, body: "", view_count: 3 }]);
  }
  return new Response(null, { status: 204 });
};

const listingContext = {
  env,
  request: new Request("https://boxsoku.com/schedule"),
  waitUntil() {}
};
const listingResponse = await renderListingPage(listingContext, "schedule");
assert.equal(listingResponse.status, 200);
const listingHtml = await listingResponse.text();
assert.match(listingHtml, /<title>ボクシング試合予定・今日の試合と配信情報｜ボクシング速報<\/title>/);
assert.match(listingHtml, /<h1 class="feed-heading">ボクシング試合予定<\/h1>/);
assert.match(listingHtml, /<h2><a href="\/news\/seo-test">9月2日のボクシング試合予定<\/a><\/h2>/);
assert.match(listingHtml, /"@type":"CollectionPage"/);
assert.match(listingHtml, /"@type":"ItemList"/);
assert.match(listingHtml, /"@type":"Organization"/);
assert.ok(!listingHtml.includes("記事を読み込んでいます"));

const listingHead = await renderListingPage(
  { ...listingContext, request: new Request("https://boxsoku.com/schedule", { method: "HEAD" }) },
  "schedule"
);
assert.equal(await listingHead.text(), "");

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
assert.match(robotsSource, /User-agent: OAI-SearchBot\r?\nAllow: \//);
assert.match(robotsSource, /User-agent: Googlebot\r?\nAllow: \//);

const sitemapSource = fs.readFileSync(
  path.join(projectRoot, "functions", "sitemap.xml.js"),
  "utf8"
);
assert.match(
  sitemapSource,
  /"\/schedule"[\s\S]*?"\/boxing-news"[\s\S]*?"\/wowow-excite-match"/
);
assert.ok(!sitemapSource.includes("/about.html"));
assert.match(sitemapSource, /siteUrl \+ \(path \|\| "\/"\)/);

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

const aboutSource = fs.readFileSync(path.join(projectRoot, "about.html"), "utf8");
assert.match(aboutSource, /情報の確認方法/);
assert.match(aboutSource, /未確認の情報や推測は確定情報として掲載しません/);
assert.match(aboutSource, /"@type": "Organization"/);

const affiliateConfigSource = fs.readFileSync(
  path.join(projectRoot, "config.js"),
  "utf8"
);
for (const exactOwnerUrl of [
  "https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2",
  "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM",
  "https://www13.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM",
  "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75",
  "https://www24.a8.net/svt/bgt?aid=260804209964&wid=002&eno=01&mid=s00000025070001003000&mc=1",
  "https://www14.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"
]) {
  assert.ok(affiliateConfigSource.includes(exactOwnerUrl));
}
assert.ok(!affiliateConfigSource.includes("https://www22.a8.net/svt/bgt"));

console.log("SEO render checks passed");
