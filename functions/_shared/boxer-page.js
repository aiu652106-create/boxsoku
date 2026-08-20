import { securityHeaders } from "./security.js";

const BOXER_SELECT = [
  "internal_id",
  "slug",
  "name_ja",
  "name_kana",
  "name_en",
  "ring_name",
  "boxrec_id",
  "nationality",
  "birth_date",
  "birthplace",
  "career_status",
  "gym",
  "weight_class",
  "stance",
  "height_cm",
  "reach_cm",
  "pro_debut_date",
  "total_fights",
  "wins",
  "losses",
  "draws",
  "no_contests",
  "ko_wins",
  "ko_rate",
  "world_champion_experience",
  "current_titles",
  "past_major_titles",
  "world_title_weight_classes",
  "ranking_wba",
  "ranking_wbc",
  "ranking_ibf",
  "ranking_wbo",
  "next_fight_date",
  "next_opponent",
  "next_venue",
  "next_event_name",
  "source_name",
  "source_url",
  "source_checked_at",
  "field_sources",
  "updated_at"
].join(",");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "不明";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? "不明" : date.toLocaleDateString("ja-JP");
}

function formatCheckedAt(value) {
  if (!value) return "不明";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "不明" : date.toLocaleString("ja-JP");
}

function formatValue(value) {
  return value === null || value === undefined || String(value).trim() === ""
    ? "不明"
    : String(value);
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "不明";
  const number = Number(value);
  return Number.isFinite(number) ? `${number}${suffix}` : "不明";
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "不明";
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "不明";
}

function calculateAge(value) {
  if (!value) return "不明";
  const birth = new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`);
  if (Number.isNaN(birth.getTime())) return "不明";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? `${age}歳` : "不明";
}

function hasRecordData(boxer) {
  return [
    boxer.total_fights,
    boxer.wins,
    boxer.losses,
    boxer.draws,
    boxer.no_contests,
    boxer.ko_wins
  ].some((value) => value !== null && value !== undefined && value !== "");
}

function recordText(boxer) {
  if (!hasRecordData(boxer)) return "戦績：不明";
  const parts = [
    formatNumber(boxer.total_fights, "戦"),
    formatNumber(boxer.wins, "勝"),
    formatNumber(boxer.losses, "敗"),
    formatNumber(boxer.draws, "分")
  ];
  if (boxer.no_contests !== null && boxer.no_contests !== undefined) {
    parts.push(`${boxer.no_contests}無効試合`);
  }
  if (boxer.ko_wins !== null && boxer.ko_wins !== undefined) {
    parts.push(`${boxer.ko_wins}KO`);
  }
  return parts.join(" ");
}

function careerLabel(value) {
  if (value === "active") return "現役";
  if (value === "retired") return "引退";
  return "不明";
}

function sourceLink(boxer) {
  const url = safeUrl(boxer.source_url);
  if (!url) return `<span>${escapeHtml(formatValue(boxer.source_name))}</span>`;
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    formatValue(boxer.source_name) || url
  )}</a>`;
}

async function supabaseRows(env, query) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.json();
}

async function getBoxers(env) {
  const query = `boxers?select=${encodeURIComponent(
    BOXER_SELECT
  )}&is_published=eq.true&order=name_ja.asc&limit=1000`;
  return supabaseRows(env, query);
}

async function getBoxer(env, slug) {
  const query = `boxers?select=${encodeURIComponent(
    BOXER_SELECT
  )}&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`;
  const rows = await supabaseRows(env, query);
  return rows[0] || null;
}

function sharedHead({ siteUrl, siteName, title, description, canonical, structuredData }) {
  const defaultImage = `${siteUrl}/assets/boxing-arena.png`;
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" data-boxsoku-site-icon="true" type="image/png" href="/assets/boxsoku-icon.png">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(defaultImage)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(defaultImage)}">
  <title>${escapeHtml(title)}</title>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="/styles.css?v=20260820-boxer-db1">
  <script src="/config.js?v=20260813-site-icon-settings1" defer></script>
  <script src="/site.js" defer></script>
  <script src="/site-icon.js?v=20260813-site-icon-settings1" defer></script>`;
}

function siteHeader(siteName) {
  return `<div class="retro-top"><div><span data-site-tagline>ボクシングの試合予定と配信情報をわかりやすく紹介</span><a href="/about">運営者情報</a></div></div>
  <header class="retro-header"><a class="retro-logo" href="/"><strong data-site-name>${escapeHtml(
    siteName
  )}</strong><span>BOXING NEWS</span></a></header>`;
}

function siteFooter(siteName) {
  return `<footer class="retro-footer"><a href="/">TOP PAGEへ</a><nav><a href="/boxers">選手DB</a><a href="/about">運営者情報</a><a href="/privacy">プライバシーポリシー</a><a href="/disclaimer">免責事項</a><a href="/contact">お問い合わせ</a></nav><small>copyright &copy; <span data-current-year></span> <span data-site-name>${escapeHtml(
    siteName
  )}</span> all rights reserved.</small></footer>`;
}

function renderFailure(request, error) {
  return new Response(request.method === "HEAD" ? null : "選手DBを読み込めませんでした。", {
    status: 503,
    headers: securityHeaders({
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "no-store"
    })
  });
}

function boxerCard(boxer) {
  const record = hasRecordData(boxer) ? recordText(boxer) : "戦績：不明";
  return `<article class="boxer-card">
    <div class="boxer-card-heading"><span class="boxer-status boxer-status-${escapeHtml(
      boxer.career_status || "unknown"
    )}">${escapeHtml(careerLabel(boxer.career_status))}</span><h2><a href="/boxer/${encodeURIComponent(
    boxer.slug
  )}">${escapeHtml(boxer.name_ja)}</a></h2></div>
    ${boxer.name_en ? `<p class="boxer-name-en">${escapeHtml(boxer.name_en)}</p>` : ""}
    <dl class="boxer-card-facts"><div><dt>階級</dt><dd>${escapeHtml(
      formatValue(boxer.weight_class)
    )}</dd></div><div><dt>所属ジム</dt><dd>${escapeHtml(
      formatValue(boxer.gym)
    )}</dd></div><div><dt>戦績</dt><dd>${escapeHtml(record)}</dd></div></dl>
  </article>`;
}

export async function renderBoxersPage({ env, request }) {
  let boxers;
  try {
    boxers = await getBoxers(env);
  } catch (error) {
    return renderFailure(request, error);
  }

  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();
  const normalizedQuery = query.toLocaleLowerCase("ja-JP");
  const filtered = normalizedQuery
    ? boxers.filter((boxer) =>
        [boxer.name_ja, boxer.name_kana, boxer.name_en, boxer.ring_name]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("ja-JP").includes(normalizedQuery))
      )
    : boxers;
  const siteUrl = String(env.SITE_URL || url.origin).replace(/\/$/, "");
  const siteName = String(env.SITE_NAME || "ボクシング速報");
  const title = "選手一覧・ボクサー名鑑 | ボクシング速報";
  const description =
    "日本人ボクサーを中心に、戦績、身長、リーチ、階級、所属ジム、世界ランキング、次戦などを確認できる選手データベースです。";
  const canonical = `${siteUrl}/boxers`;
  const structuredData = escapeJson({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: canonical,
    description,
    isPartOf: { "@type": "WebSite", name: siteName, url: `${siteUrl}/` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: filtered.map((boxer, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: boxer.name_ja,
        url: `${siteUrl}/boxer/${encodeURIComponent(boxer.slug)}`
      }))
    }
  });
  const results = filtered.length
    ? filtered.map(boxerCard).join("")
    : `<p class="site-empty">${query ? "該当する選手が見つかりません。" : "登録されている選手はまだありません。"}</p>`;
  const html = `<!doctype html><html lang="ja"><head>${sharedHead({
    siteUrl,
    siteName,
    title,
    description,
    canonical,
    structuredData
  })}</head><body class="retro-blog boxer-db-page">${siteHeader(siteName)}
    <main class="boxer-page-container"><div class="boxer-page-heading"><span>BOXER DATABASE</span><h1>選手一覧</h1><p>選手名から、戦績やプロフィールを確認できます。</p></div>
      <form class="boxer-search" action="/boxers" method="get"><label for="boxer-query">選手名を検索</label><div><input id="boxer-query" name="q" value="${escapeHtml(
    query
  )}" placeholder="日本語名・読み方・英語表記" autocomplete="off"><button type="submit">検索</button></div></form>
      <p class="boxer-result-count">${query ? `「${escapeHtml(query)}」の検索結果：` : "登録選手："}${filtered.length}名</p>
      <section class="boxer-card-grid" aria-label="選手一覧">${results}</section>
    </main>${siteFooter(siteName)}</body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {
    headers: securityHeaders({
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    })
  });
}

function fieldRow(label, value, className = "") {
  return `<div class="boxer-field ${className}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(
    formatValue(value)
  )}</dd></div>`;
}

function rankingRows(boxer) {
  const rankings = [
    ["WBA", boxer.ranking_wba],
    ["WBC", boxer.ranking_wbc],
    ["IBF", boxer.ranking_ibf],
    ["WBO", boxer.ranking_wbo]
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!rankings.length) return `<p class="boxer-unknown">確認できる世界ランキングはありません。</p>`;
  return `<dl class="boxer-ranking-list">${rankings
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(formatNumber(value, "位"))}</dd></div>`)
    .join("")}</dl>`;
}

function nextFightHtml(boxer) {
  const values = [boxer.next_fight_date, boxer.next_opponent, boxer.next_venue, boxer.next_event_name];
  if (!values.some((value) => value !== null && value !== undefined && String(value).trim() !== "")) {
    return `<p class="boxer-unknown">確認できる次戦情報はありません。</p>`;
  }
  return `<dl class="boxer-detail-list">${fieldRow("次戦日", formatDate(boxer.next_fight_date))}${fieldRow(
    "対戦相手",
    boxer.next_opponent
  )}${fieldRow("会場", boxer.next_venue)}${fieldRow("興行名", boxer.next_event_name)}</dl>`;
}

export async function renderBoxerPage({ env, request, params }) {
  const slug = String(params?.slug || "");
  let boxer;
  try {
    boxer = await getBoxer(env, slug);
  } catch (error) {
    return renderFailure(request, error);
  }
  if (!boxer) {
    return new Response("選手が見つかりません。", {
      status: 404,
      headers: securityHeaders({
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store"
      })
    });
  }

  const url = new URL(request.url);
  const siteUrl = String(env.SITE_URL || url.origin).replace(/\/$/, "");
  const siteName = String(env.SITE_NAME || "ボクシング速報");
  const title = `${boxer.name_ja}の戦績・身長・KO率・プロフィール | ${siteName}`;
  const description = `${boxer.name_ja}の戦績、身長、リーチ、年齢、階級、所属ジム、KO率、世界ランキング、次戦などを掲載しています。`;
  const canonical = `${siteUrl}/boxer/${encodeURIComponent(boxer.slug)}`;
  const person = {
    "@type": "Person",
    name: boxer.name_ja,
    url: canonical,
    ...(boxer.name_en ? { alternateName: boxer.name_en } : {}),
    ...(boxer.birth_date ? { birthDate: boxer.birth_date } : {}),
    ...(boxer.nationality ? { nationality: boxer.nationality } : {}),
    ...(boxer.height_cm
      ? { height: { "@type": "QuantitativeValue", value: Number(boxer.height_cm), unitCode: "CMT" } }
      : {})
  };
  const structuredData = escapeJson({
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: title,
    url: canonical,
    description,
    mainEntity: person
  });
  const record = recordText(boxer);
  const titleExperience = boxer.world_champion_experience === true ? "あり" : boxer.world_champion_experience === false ? "なし" : "不明";
  const sourceUrl = safeUrl(boxer.source_url);
  const sourceDetails = sourceUrl
    ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        formatValue(boxer.source_name)
      )}</a>`
    : escapeHtml(formatValue(boxer.source_name));
  const html = `<!doctype html><html lang="ja"><head>${sharedHead({
    siteUrl,
    siteName,
    title,
    description,
    canonical,
    structuredData
  })}</head><body class="retro-blog boxer-db-page">${siteHeader(siteName)}
    <main class="boxer-page-container boxer-profile-container"><nav class="boxer-breadcrumb" aria-label="パンくず"><a href="/boxers">選手一覧</a><span>›</span><span>${escapeHtml(
    boxer.name_ja
  )}</span></nav>
      <article class="boxer-profile">
        <header class="boxer-profile-heading"><div><span>BOXER PROFILE</span><h1>${escapeHtml(
    boxer.name_ja
  )}</h1>${boxer.name_en ? `<p class="boxer-name-en">${escapeHtml(boxer.name_en)}</p>` : ""}${
    boxer.ring_name ? `<p class="boxer-ring-name">${escapeHtml(boxer.ring_name)}</p>` : ""}</div><span class="boxer-status boxer-status-${escapeHtml(
    boxer.career_status || "unknown"
  )}">${escapeHtml(careerLabel(boxer.career_status))}</span></header>
        <section class="boxer-record-hero" aria-labelledby="record-heading"><div><span id="record-heading">戦績</span><strong>${escapeHtml(
    record
  )}</strong></div><div><span>KO率</span><strong>${escapeHtml(formatPercent(boxer.ko_rate))}</strong></div></section>
        <section class="boxer-profile-section" aria-labelledby="basic-heading"><h2 id="basic-heading">プロフィール</h2><dl class="boxer-detail-list">${fieldRow(
    "年齢",
    calculateAge(boxer.birth_date)
  )}${fieldRow("国籍", boxer.nationality)}${fieldRow("生年月日", formatDate(boxer.birth_date))}${fieldRow(
    "出身地",
    boxer.birthplace
  )}${fieldRow("階級", boxer.weight_class)}${fieldRow("身長", formatNumber(boxer.height_cm, "cm"))}${fieldRow(
    "リーチ",
    formatNumber(boxer.reach_cm, "cm")
  )}${fieldRow("構え", boxer.stance)}${fieldRow("所属ジム", boxer.gym)}${fieldRow(
    "プロデビュー",
    formatDate(boxer.pro_debut_date)
  )}</dl></section>
        <section class="boxer-profile-section" aria-labelledby="title-heading"><h2 id="title-heading">タイトル</h2><dl class="boxer-detail-list">${fieldRow(
    "世界王者経験",
    titleExperience
  )}${fieldRow("現在保有タイトル", boxer.current_titles)}${fieldRow("過去の主要タイトル", boxer.past_major_titles)}${fieldRow(
    "世界王座獲得階級",
    boxer.world_title_weight_classes
  )}</dl></section>
        <section class="boxer-profile-section" aria-labelledby="ranking-heading"><h2 id="ranking-heading">世界ランキング</h2>${rankingRows(
    boxer
  )}</section>
        <section class="boxer-profile-section" aria-labelledby="next-heading"><h2 id="next-heading">次戦</h2>${nextFightHtml(
    boxer
  )}</section>
        <footer class="boxer-source"><h2>データ出典</h2><p>${sourceDetails}</p><p>確認日：${escapeHtml(
    formatCheckedAt(boxer.source_checked_at)
  )}</p></footer>
      </article>
    </main>${siteFooter(siteName)}</body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {
    headers: securityHeaders({
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    })
  });
}
