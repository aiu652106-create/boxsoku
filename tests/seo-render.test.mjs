import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const functionSource = fs.readFileSync(
  path.join(projectRoot, "functions", "news", "[slug].js"),
  "utf8"
);
const temporaryModule = path.join(
  projectRoot,
  "functions",
  "news",
  `boxsoku-seo-function-${Date.now()}.mjs`
);
fs.writeFileSync(temporaryModule, functionSource, "utf8");
const { onRequestGet, onRequestHead } = await import(
  pathToFileURL(temporaryModule).href
);
fs.unlinkSync(temporaryModule);

const listingSource = fs.readFileSync(
  path.join(projectRoot, "functions", "_shared", "listing-page.js"),
  "utf8"
);
const temporaryListingModule = path.join(
  os.tmpdir(),
  `boxsoku-listing-function-${Date.now()}.mjs`
);
const temporarySecurityModule = path.join(os.tmpdir(), "security.js");
const securitySource = fs.readFileSync(
  path.join(projectRoot, "functions", "_shared", "security.js"),
  "utf8"
);
fs.writeFileSync(temporarySecurityModule, securitySource, "utf8");
fs.writeFileSync(temporaryListingModule, listingSource, "utf8");
const { renderListingPage } = await import(
  pathToFileURL(temporaryListingModule).href
);
fs.unlinkSync(temporaryListingModule);
fs.unlinkSync(temporarySecurityModule);

const article = {
  id: "article-1",
  slug: "seo-test",
  title: "9月2日のボクシング試合予定",
  summary: "",
  body: [
    "## 大会概要",
    "2026年9月2日、横浜BUNTAIでボクシング興行が開催されます。",
    "- 開催日：2026年9月2日\n- 会場：横浜BUNTAI\n- 配信：[Prime Video独占ライブ配信](https://amzn.to/4qhu5Mj)",
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

const tweetArticle = {
  ...article,
  slug: "tweet-position-test",
  title: "藤木勇我の近況",
  body: [
    "## 藤木勇我の次戦は9月2日\nLeminoで配信予定です。",
    "## 藤木勇我が次戦へ向けて近況を報告\n藤木勇我は自身のXを更新しました。",
    "https://x.com/fujikiyuga/status/2087518427124731943",
    "## 次戦情報",
    "9月2日に出場します。"
  ].join("\n\n"),
  tweets: [
    "https://twitter.com/fujikiyuga/status/2087518427124731943?s=20",
    "https://x.com/fujikiyuga/status/2087518427124731943/photo/1"
  ]
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
  VISITOR_ID_SALT: "test-salt",
  BOXSOKU_SERVER_TOKEN: "test-server-token"
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
assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(
  response.headers.get("Strict-Transport-Security"),
  "max-age=31536000; includeSubDomains"
);
assert.equal(response.headers.get("Content-Security-Policy"), "frame-ancestors 'self'");
const html = await response.text();

const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
assert.ok(description?.startsWith("2026年9月2日"));
assert.ok(!description.includes("##"));
assert.match(html, /<h2>大会概要<\/h2>/);
assert.match(html, /<ul><li>開催日：2026年9月2日<\/li>/);
assert.match(
  html,
  /<a class="affiliate-streaming-link" href="https:\/\/amzn\.to\/4qhu5Mj" target="_blank" rel="sponsored noopener noreferrer" data-boxsoku-affiliate-service="amazon" data-boxsoku-affiliate-placement="article-body">Prime Video独占ライブ配信<\/a>/
);
assert.ok(!html.includes("[Prime Video独占ライブ配信]"));
assert.match(html, /"@type":"Article"/);
assert.match(
  html,
  /<script src="\/site-events\.js\?v=20260814-site-events1" defer><\/script>/
);
assert.match(html, /"@type":"BreadcrumbList"/);
assert.match(html, /"@type":"SportsEvent"/);
assert.match(html, /"startDate":"2026-09-02"/);
assert.match(html, /"@type":"Organization"/);
assert.match(
  html,
  /<link rel="icon" data-boxsoku-site-icon="true" type="image\/png" href="\/assets\/boxsoku-icon\.png">/
);
assert.match(html, /class="public-breadcrumb"/);
assert.match(html, /編集・確認：ボクシング速報編集部/);
assert.ok(
  html.includes("https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2")
);
assert.ok(
  html.includes("https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/52")
);
assert.ok(
  html.includes("https://img.affiliate-sp.docomo.ne.jp/ad/d0000000236/52.jpg")
);
assert.match(html, /class="wowow-affiliate-banner lemino-affiliate-banner"/);
assert.match(
  html,
  /data-boxsoku-affiliate-service="lemino" data-boxsoku-affiliate-placement="article-bottom-banner"/
);
assert.ok(!html.includes('href="https://lemino.docomo.ne.jp/"'));
assert.ok(!html.includes("a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"));

globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("slug=eq.tweet-position-test")) return Response.json([tweetArticle]);
  if (url.includes("/rest/v1/articles?")) return Response.json([tweetArticle, listArticle]);
  return new Response(null, { status: 204 });
};
const tweetContext = makeContext("GET");
tweetContext.params = { slug: tweetArticle.slug };
tweetContext.request = new Request(
  `https://boxsoku.com/news/${tweetArticle.slug}?boxsoku_verify=1`
);
const tweetResponse = await onRequestGet(tweetContext);
assert.equal(tweetResponse.status, 200);
const tweetHtml = await tweetResponse.text();
const tweetBodyHtml = tweetHtml.slice(
  tweetHtml.indexOf('<div class="retro-detail-body">'),
  tweetHtml.indexOf('<aside class="ad-slot" data-ad-slot-name="articleTop"')
);
const tweetHeadingIndex = tweetBodyHtml.indexOf("藤木勇我が次戦へ向けて近況を報告");
const tweetLeadIndex = tweetBodyHtml.indexOf("藤木勇我は自身のXを更新しました。");
const tweetEmbedIndex = tweetBodyHtml.indexOf("2087518427124731943");
const tweetNextHeadingIndex = tweetBodyHtml.indexOf("次戦情報");
assert.ok(tweetHeadingIndex >= 0 && tweetHeadingIndex < tweetLeadIndex);
assert.ok(tweetLeadIndex < tweetEmbedIndex);
assert.ok(tweetEmbedIndex < tweetNextHeadingIndex);
assert.equal((tweetBodyHtml.match(/2087518427124731943/g) || []).length, 1);
assert.equal((tweetBodyHtml.match(/data-x-embed="quote"/g) || []).length, 1);
assert.equal((tweetBodyHtml.match(/data-cards="visible"/g) || []).length, 1);
assert.match(tweetBodyHtml, /X引用ツイート/);
assert.match(tweetHtml, /platform\.twitter\.com\/widgets\.js/);

const editorHtml = fs.readFileSync(
  path.join(projectRoot, "editor.html"),
  "utf8"
);
assert.match(editorHtml, /X引用ツイート/);
assert.match(editorHtml, /引用元の記事・公式発表は本文の情報源にも明記/);

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
assert.match(wowowHtml, /data-boxsoku-affiliate-service="wowow" data-boxsoku-affiliate-placement="article-top-text"/);
assert.match(wowowHtml, /data-boxsoku-affiliate-service="wowow" data-boxsoku-affiliate-placement="article-bottom-banner"/);
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
assert.ok(!html.includes("那須川天心"));
assert.ok(!html.includes("天心語録"));
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
const inoueProductsHtml =
  inoueHtml.match(/<section class="affiliate-products"[\s\S]*?<\/section>/)?.[0] || "";
assert.equal((inoueHtml.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.equal((inoueProductsHtml.match(/<strong>[^<]*井上尚弥[^<]*<\/strong>/g) || []).length, 3);
assert.ok(!inoueHtml.includes("那須川天心"));
assert.ok(!inoueHtml.includes("天心語録"));
assert.match(inoueHtml, /data-boxsoku-affiliate-service="rakuten" data-boxsoku-affiliate-placement="article-product"/);

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
const ohashiProductsHtml =
  ohashiHtml.match(/<section class="affiliate-products"[\s\S]*?<\/section>/)?.[0] || "";
assert.equal((ohashiHtml.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.equal((ohashiProductsHtml.match(/<strong>[^<]*井上尚弥[^<]*<\/strong>/g) || []).length, 2);
assert.match(ohashiHtml, /大橋ボクシングジム コラボ HEATH Tシャツ/);
assert.match(ohashiHtml, /data-boxsoku-affiliate-item="boxing-/);
assert.match(ohashiHtml, /56736(?:9|a)[0-9a-z.]*/);
assert.ok(!ohashiHtml.includes("那須川天心"));
assert.ok(!ohashiHtml.includes("天心語録"));
assert.ok(!ohashiHtml.includes("ohashi-owner-link"));
assert.ok(!ohashiHtml.includes("inoue-owner-link"));

const tenshinArticle = {
  ...article,
  id: "tenshin-article-1",
  slug: "tenshin-next-fight",
  title: "那須川天心の次戦・試合予定",
  body: "那須川天心が出場するボクシング興行です。",
  affiliate_links: []
};
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("slug=eq.tenshin-next-fight")) return Response.json([tenshinArticle]);
  if (url.includes("/rest/v1/articles?")) return Response.json([tenshinArticle, listArticle]);
  return new Response(null, { status: 204 });
};
const tenshinContext = makeContext("GET");
tenshinContext.params = { slug: tenshinArticle.slug };
tenshinContext.request = new Request(
  `https://boxsoku.com/news/${tenshinArticle.slug}?boxsoku_verify=1`
);
const tenshinResponse = await onRequestGet(tenshinContext);
assert.equal(tenshinResponse.status, 200);
const tenshinHtml = await tenshinResponse.text();
const tenshinProductsHtml =
  tenshinHtml.match(/<section class="affiliate-products"[\s\S]*?<\/section>/)?.[0] || "";
assert.equal((tenshinHtml.match(/class="affiliate-product-card"/g) || []).length, 4);
assert.equal((tenshinProductsHtml.match(/data-boxsoku-affiliate-item="tenshin-/g) || []).length, 3);
assert.equal((tenshinProductsHtml.match(/<strong>[^<]*(?:那須川天心|天心|TENSHIN)[^<]*<\/strong>/g) || []).length, 3);
assert.match(tenshinHtml, /data-boxsoku-affiliate-item="boxing-/);
assert.ok(!tenshinHtml.includes("井上尚弥"));

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
assert.equal(listingResponse.headers.get("X-Frame-Options"), "SAMEORIGIN");
assert.equal(
  listingResponse.headers.get("Content-Security-Policy"),
  "frame-ancestors 'self'"
);
const listingHtml = await listingResponse.text();
assert.ok(
  listingHtml.indexOf('data-category-filter="schedule"') <
    listingHtml.indexOf('data-category-filter="broadcast"') &&
    listingHtml.indexOf('data-category-filter="broadcast"') <
      listingHtml.indexOf('data-category-filter="news"') &&
    listingHtml.indexOf('data-category-filter="news"') <
      listingHtml.indexOf('data-category-filter="lemino"')
);
assert.match(listingHtml, /<title>ボクシング試合予定・今日の試合と配信情報｜ボクシング速報<\/title>/);
assert.match(listingHtml, /<h1 class="feed-heading">ボクシング試合予定<\/h1>/);
assert.match(listingHtml, /data-category-filter="schedule"[^>]*>興行日程<\/a>/);
assert.ok(!listingHtml.includes('data-category-filter="schedule">試合日程<'));
assert.match(listingHtml, /<h2><a href="\/news\/seo-test">9月2日のボクシング試合予定<\/a><\/h2>/);
assert.match(listingHtml, /"@type":"CollectionPage"/);
assert.match(listingHtml, /"@type":"ItemList"/);
assert.match(listingHtml, /"@type":"Organization"/);
assert.match(
  listingHtml,
  /<link rel="icon" data-boxsoku-site-icon="true" type="image\/png" href="\/assets\/boxsoku-icon\.png">/
);
assert.match(listingHtml, /Xで共有/);
assert.match(listingHtml, /utm_source%3Dx/);
assert.match(
  listingHtml,
  /href="https:\/\/tr\.affiliate-sp\.docomo\.ne\.jp\/cl\/d0000000236\/5159\/2"[^>]*data-boxsoku-affiliate-service="lemino" data-boxsoku-affiliate-placement="listing-card"/
);
assert.match(
  listingHtml,
  /<script src="\/site-events\.js\?v=20260814-site-events1" defer><\/script>/
);
assert.ok(!listingHtml.includes("記事を読み込んでいます"));

const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
assert.match(appSource, /tweet\.textContent = "Xで共有"/);
assert.match(appSource, /utm_campaign/);

const leminoListingResponse = await renderListingPage(
  {
    ...listingContext,
    request: new Request("https://boxsoku.com/lemino-boxing")
  },
  "lemino"
);
assert.equal(leminoListingResponse.status, 200);
const leminoListingHtml = await leminoListingResponse.text();
assert.match(
  leminoListingHtml,
  /<title>Leminoボクシング配信予定・対戦カード｜ボクシング速報<\/title>/
);
assert.match(leminoListingHtml, /<h1 class="feed-heading">Leminoボクシング配信予定<\/h1>/);
assert.match(leminoListingHtml, /<h2><a href="\/news\/seo-test">9月2日のボクシング試合予定<\/a><\/h2>/);
assert.match(leminoListingHtml, /<link rel="canonical" href="https:\/\/boxsoku.com\/lemino-boxing">/);

const broadcastListingResponse = await renderListingPage(
  {
    ...listingContext,
    request: new Request("https://boxsoku.com/boxing-broadcast")
  },
  "broadcast"
);
assert.equal(broadcastListingResponse.status, 200);
const broadcastListingHtml = await broadcastListingResponse.text();
assert.match(
  broadcastListingHtml,
  /<title>ボクシング放送・配信予定｜Lemino・WOWOWなど<\/title>/
);
assert.match(
  broadcastListingHtml,
  /<h1 class="feed-heading">ボクシング放送・配信予定<\/h1>/
);
assert.match(
  broadcastListingHtml,
  /<link rel="canonical" href="https:\/\/boxsoku.com\/boxing-broadcast">/
);

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
  /"\/schedule"[\s\S]*?"\/lemino-boxing"[\s\S]*?"\/boxing-broadcast"[\s\S]*?"\/boxing-news"[\s\S]*?"\/wowow-excite-match"/
);
assert.ok(!sitemapSource.includes("/about.html"));
assert.match(sitemapSource, /siteUrl \+ \(path \|\| "\/"\)/);

const headersSource = fs.readFileSync(path.join(projectRoot, "_headers"), "utf8");
assert.match(headersSource, /\/article\.html[\s\S]*?X-Robots-Tag: noindex, nofollow/);
const articleShellSource = fs.readFileSync(path.join(projectRoot, "article.html"), "utf8");
assert.match(articleShellSource, /<meta name="robots" content="noindex, nofollow"/);

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
  "https://amzn.to/4qhu5Mj",
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
