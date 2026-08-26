import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\//, "");
const { onRequestGet } = await import(
  pathToFileURL(`${projectRoot.replaceAll("/", "\\")}functions\\news\\[slug].js`).href
);

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-key",
  SITE_URL: "https://boxsoku.com"
};
const eventId = "11111111-1111-4111-8111-111111111111";
const article = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "phoenix-battle-160",
  title: "Phoenix Battle 160の試合予定",
  summary: "2026年9月8日に後楽園ホールで開催される興行の情報です。",
  body: "Phoenix Battle 160の試合予定\n\n開催日：2026年9月8日\n会場：後楽園ホール",
  image_url: "/assets/boxing-arena.png",
  boxrec_url: "",
  boxing_event_id: eventId,
  accent: "red",
  is_advertorial: false,
  affiliate_disclosure: "",
  affiliate_links: [],
  tweets: [],
  youtube_urls: [],
  instagram_urls: [],
  published_at: "2026-08-26T00:00:00.000Z",
  updated_at: "2026-08-26T00:00:00.000Z"
};

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.includes("articles?") && value.includes("slug=eq.")) return new Response(JSON.stringify([article]));
    if (value.includes("articles?") && value.includes("order=published_at")) return new Response(JSON.stringify([article]));
    if (value.includes("articles?") && value.includes("order=view_count")) return new Response(JSON.stringify([article]));
    if (value.includes("boxing_events?")) return new Response(JSON.stringify([{
      event_id: eventId,
      event_name: "Phoenix Battle 160",
      event_date: "2026-09-08",
      venue: "後楽園ホール",
      location: null,
      start_time: "17:30:00",
      broadcast_start_time: null,
      distribution_services: ["Lemino"],
      source_name: "Lemino BOXING公式",
      source_url: "https://lemino.docomo.ne.jp/ft/0000002/pxb/"
    }]));
    if (value.includes("boxing_event_bouts?")) {
      assert.match(value, /status=eq\.active/);
      return new Response(JSON.stringify([{
        bout_id: "33333333-3333-4333-8333-333333333333",
        bout_number: 1,
        weight_class: "ライト級",
        fighter_a_name: "選手A",
        fighter_b_name: "選手B",
        status: "active"
      }, {
        bout_id: "44444444-4444-4444-8444-444444444444",
        bout_number: 2,
        weight_class: "フェザー級",
        fighter_a_name: "削除済み選手C",
        fighter_b_name: "削除済み選手D",
        status: "removed"
      }]));
    }
    throw new Error(`unexpected URL: ${value}`);
  };
  const request = new Request("https://boxsoku.com/news/phoenix-battle-160", {
    headers: { "User-Agent": "Googlebot" }
  });
  const response = await onRequestGet({
    env,
    request,
    params: { slug: "phoenix-battle-160" },
    waitUntil(promise) { promise.catch(() => {}); }
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /VERIFIED EVENT DATA/);
 assert.match(html, /Phoenix Battle 160/);
 assert.match(html, /選手A/);
  assert.doesNotMatch(html, /削除済み選手C|削除済み選手D/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Public event render checks passed");
