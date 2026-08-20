import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const temporaryModule = path.join(os.tmpdir(), `boxer-page-${Date.now()}.mjs`);
const temporarySecurityModule = path.join(os.tmpdir(), "security.js");
fs.writeFileSync(
  temporaryModule,
  fs.readFileSync(path.join(projectRoot, "functions", "_shared", "boxer-page.js"), "utf8"),
  "utf8"
);
fs.writeFileSync(
  temporarySecurityModule,
  fs.readFileSync(path.join(projectRoot, "functions", "_shared", "security.js"), "utf8"),
  "utf8"
);
const { renderBoxerPage } = await import(pathToFileURL(temporaryModule).href);
fs.unlinkSync(temporaryModule);
fs.unlinkSync(temporarySecurityModule);

const boxer = {
  internal_id: "fighter-katie",
  slug: "katie-taylor",
  name_ja: "ケイティ・テイラー",
  name_en: "Katie Taylor",
  boxrec_id: "778185",
  boxrec_url: "https://boxrec.com/en/box-pro/778185",
  sex: "female",
  nationality: "アイルランド",
  birth_date: "1986-07-02",
  birthplace: null,
  career_status: "active",
  gym: null,
  trainer: null,
  promoter: "Matchroom Boxing",
  manager: null,
  training_base: null,
  weight_class: "女子スーパーライト級",
  stance: "オーソドックス",
  height_cm: null,
  reach_cm: null,
  pro_debut_date: null,
  total_fights: 25,
  wins: 24,
  losses: 1,
  draws: 0,
  no_contests: 0,
  ko_wins: 6,
  ko_rate: 25,
  world_champion_experience: true,
  current_titles: "IBF女子世界スーパーライト級",
  past_major_titles: null,
  world_title_weight_classes: "女子ライト級・女子スーパーライト級",
  ranking_wba: null,
  ranking_wbc: null,
  ranking_ibf: null,
  ranking_wbo: null,
  next_fight_date: "2026-09-05",
  next_opponent: "フローラ・ピリ",
  next_venue: "クローク・パーク",
  next_event_name: null,
  source_name: "BoxRec本人ページ",
  source_url: "https://boxrec.com/en/box-pro/778185",
  source_checked_at: "2026-08-20T00:00:00Z",
  field_sources: {
    profile: { name: "BoxRec本人ページ", url: "https://boxrec.com/en/box-pro/778185" },
    record: { name: "BoxRec本人ページ", url: "https://boxrec.com/en/box-pro/778185" },
    next_fight: {
      name: "Matchroom公式",
      url: "https://www.matchroomboxing.com/news/katie-taylor-lands-historic-croke-park-undisputed-world-title-farewell-in-ireland-against-flora-pili-on-saturday-september-5-live-worldwide-on-dazn/",
      source_date: "2026-06-05"
    }
  },
  updated_at: "2026-08-20T00:00:00Z"
};

const matchroomUrl = boxer.field_sources.next_fight.url;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("/rest/v1/boxers?")) return Response.json([boxer]);
  if (url.includes("/rest/v1/current_fighter_titles?")) {
    return Response.json([{ fighter_id: boxer.internal_id, current_titles: boxer.current_titles }]);
  }
  if (url.includes("/rest/v1/current_fighter_rankings?")) return Response.json([]);
  if (url.includes("/rest/v1/current_fighter_status?")) {
    return Response.json([
      {
        fighter_id: boxer.internal_id,
        status: "active",
        source_name: "Matchroom公式",
        source_url: matchroomUrl,
        source_date: "2026-06-05",
        checked_at: "2026-08-20T00:00:00Z"
      }
    ]);
  }
  if (url.includes("/rest/v1/title_reigns?")) {
    return Response.json([
      {
        fighter_id: boxer.internal_id,
        title_id: "title-1",
        status: "active",
        end_date: null,
        source_name: "Matchroom公式",
        source_url: matchroomUrl,
        source_date: "2026-06-05",
        checked_at: "2026-08-20T00:00:00Z"
      }
    ]);
  }
  throw new Error(`Unexpected request: ${url}`);
};

try {
  const response = await renderBoxerPage({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "public-test-key",
      SITE_URL: "https://boxsoku.com",
      SITE_NAME: "ボクシング速報"
    },
    request: new Request("https://boxsoku.com/boxer/katie-taylor"),
    params: { slug: "katie-taylor" }
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /データ出典/);
  assert.match(html, /BoxRec本人ページ/);
  assert.match(html, /Matchroom公式/);
  assert.match(html, /現役・引退状態/);
  assert.match(html, /現在保有タイトル/);
  assert.ok(!html.includes("WBC公式 /"));
  const sourceLinks = [...html.matchAll(/class="boxer-source-card"[\s\S]*?href="([^"]+)"/g)].map(
    (match) => match[1]
  );
  assert.equal(sourceLinks.length, 2);
  assert.equal(new Set(sourceLinks).size, sourceLinks.length);
  assert.ok(html.includes('href="https://boxrec.com/en/box-pro/778185"'));
  assert.ok(html.includes(`href="${matchroomUrl}"`));
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Boxer source render checks passed");
