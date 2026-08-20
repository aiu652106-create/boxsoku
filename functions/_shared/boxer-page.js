import { securityHeaders } from "./security.js";

const BOXER_SELECT = [
  "internal_id",
  "slug",
  "name_ja",
  "name_kana",
  "name_en",
  "ring_name",
  "boxrec_id",
  "boxrec_url",
  "sex",
  "nationality",
  "nationality_code",
  "birth_date",
  "birthplace",
  "career_status",
  "gym",
  "trainer",
  "promoter",
  "manager",
  "training_base",
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
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "不明";
  const [, year, month, day] = match;
  return `${year}/${Number(month)}/${Number(day)}`;
}

function formatCheckedAt(value) {
  if (!value) return "不明";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "不明"
    : date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
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
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "不明";
  const [, year, month, day] = match;
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now).reduce((parts, part) => {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
    return parts;
  }, {});
  let age = today.year - Number(year);
  const birthdayPassed =
    today.month > Number(month) ||
    (today.month === Number(month) && today.day >= Number(day));
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
    `${formatNumber(boxer.wins, "勝")}（${formatNumber(boxer.ko_wins, "KO")}）`,
    formatNumber(boxer.losses, "敗"),
    formatNumber(boxer.draws, "分")
  ];
  if (
    boxer.no_contests !== null &&
    boxer.no_contests !== undefined &&
    Number(boxer.no_contests) > 0
  ) {
    parts.push(`${boxer.no_contests}無効試合`);
  }
  return parts.join("");
}

function careerLabel(value) {
  if (value === "active") return "現役";
  if (value === "retired") return "引退";
  if (value === "inactive") return "活動休止";
  return "不明";
}

function sexLabel(value) {
  if (value === "male") return "男性";
  if (value === "female") return "女性";
  return "不明";
}

function sourceLink(boxer) {
  const url = safeUrl(boxer.source_url);
  if (!url) return `<span>${escapeHtml(formatValue(boxer.source_name))}</span>`;
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    formatValue(boxer.source_name) || url
  )}</a>`;
}

const REPORT_FIELD_DEFINITIONS = [
  ["name_ja", "選手名（日本語）"],
  ["name_kana", "読み方"],
  ["name_en", "英語表記"],
  ["ring_name", "リングネーム"],
  ["nationality", "国籍"],
  ["birth_date", "生年月日"],
  ["birthplace", "出身地"],
  ["career_status", "現役・引退状態"],
  ["gym", "所属ジム"],
  ["trainer", "トレーナー"],
  ["promoter", "プロモーター"],
  ["manager", "マネージャー"],
  ["training_base", "トレーニング拠点"],
  ["weight_class", "階級"],
  ["stance", "構え"],
  ["height_cm", "身長"],
  ["reach_cm", "リーチ"],
  ["pro_debut_date", "プロデビュー日"],
  ["world_champion_experience", "世界王者経験"],
  ["current_titles", "現在保有タイトル"],
  ["past_major_titles", "過去の主要タイトル"],
  ["world_title_weight_classes", "世界王座獲得階級"],
  ["ranking_wba", "WBAランキング"],
  ["ranking_wbc", "WBCランキング"],
  ["ranking_ibf", "IBFランキング"],
  ["ranking_wbo", "WBOランキング"],
  ["next_fight", "次戦情報"],
  ["next_fight_date", "次戦日"],
  ["next_opponent", "次戦対戦相手"],
  ["next_venue", "次戦会場"],
  ["next_event_name", "次戦興行名"]
];

function reportCurrentValue(boxer, fieldName) {
  if (fieldName === "career_status") return careerLabel(boxer.career_status);
  if (fieldName === "world_champion_experience") {
    return boxer.world_champion_experience === true
      ? "あり"
      : boxer.world_champion_experience === false
        ? "なし"
        : "不明";
  }
  if (fieldName === "next_fight") {
    return [
      formatDate(boxer.next_fight_date),
      formatValue(boxer.next_opponent),
      formatValue(boxer.next_venue),
      formatValue(boxer.next_event_name)
    ].join(" / ");
  }
  if (fieldName.startsWith("ranking_")) {
    const value = boxer[fieldName];
    return value === null || value === undefined ? "不明" : `${value}位`;
  }
  if (fieldName === "height_cm") return formatNumber(boxer.height_cm, "cm");
  if (fieldName === "reach_cm") return formatNumber(boxer.reach_cm, "cm");
  if (fieldName === "birth_date" || fieldName === "pro_debut_date") {
    return formatDate(boxer[fieldName]);
  }
  return formatValue(boxer[fieldName]);
}

function reportFieldOptions(boxer) {
  return REPORT_FIELD_DEFINITIONS.map(
    ([value, label]) => `<option value="${value}">${label}</option>`
  ).join("");
}

function reportCurrentValues(boxer) {
  return Object.fromEntries(
    REPORT_FIELD_DEFINITIONS.map(([value]) => [value, reportCurrentValue(boxer, value)])
  );
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

async function derivedBoxerData(env, boxerRows) {
  if (!boxerRows.length) return boxerRows;
  const ids = boxerRows.map((boxer) => boxer.internal_id).filter(Boolean);
  const idFilter = ids.length === 1
    ? `&fighter_id=eq.${encodeURIComponent(ids[0])}`
    : "";
  try {
    const [titleRows, rankingRows, statusRows] = await Promise.all([
      supabaseRows(env, `current_fighter_titles?select=fighter_id,current_titles${idFilter}`),
      supabaseRows(env, `current_fighter_rankings?select=fighter_id,organization,ranking${idFilter}`),
      supabaseRows(env, `current_fighter_status?select=fighter_id,status${idFilter}`)
    ]);
    const titlesByFighter = new Map((titleRows || []).map((row) => [row.fighter_id, row.current_titles]));
    const statusByFighter = new Map((statusRows || []).map((row) => [row.fighter_id, row.status]));
    const rankingsByFighter = new Map();
    for (const row of rankingRows || []) {
      const organization = String(row.organization || "").toLowerCase();
      if (!organization) continue;
      if (!rankingsByFighter.has(row.fighter_id)) rankingsByFighter.set(row.fighter_id, {});
      rankingsByFighter.get(row.fighter_id)[`ranking_${organization}`] = row.ranking;
    }
    return boxerRows.map((boxer) => ({
      ...boxer,
      current_titles: titlesByFighter.get(boxer.internal_id) || "なし",
      career_status: statusByFighter.get(boxer.internal_id) || "unknown",
      ...(rankingsByFighter.get(boxer.internal_id) || {})
    }));
  } catch {
    // Keep the published snapshot usable while a new view is being deployed.
    return boxerRows;
  }
}

async function getBoxers(env) {
  const query = `boxers?select=${encodeURIComponent(
    BOXER_SELECT
  )}&is_published=eq.true&order=name_ja.asc&limit=1000`;
  return derivedBoxerData(env, await supabaseRows(env, query));
}

async function getBoxer(env, slug) {
  const query = `boxers?select=${encodeURIComponent(
    BOXER_SELECT
  )}&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`;
  const rows = await supabaseRows(env, query);
  return (await derivedBoxerData(env, rows))[0] || null;
}

function sharedHead({ siteUrl, siteName, title, description, canonical, structuredData }) {
  const defaultImage = `${siteUrl}/assets/boxing-arena.png`;
  const head = `<meta charset="UTF-8">
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
  <link rel="stylesheet" href="/styles.css?v=20260820-boxer-db3">
  <script src="/config.js?v=20260813-site-icon-settings1" defer></script>
  <script src="/site.js" defer></script>
  <script src="/site-icon.js?v=20260813-site-icon-settings1" defer></script>`;
  return `${head}
  <script src="/boxer-report.js?v=20260820-boxer-workflow2" defer></script>`;
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
  const detailUrl = `/boxer/${encodeURIComponent(boxer.slug)}`;
  return `<article class="boxer-card">
    <a class="boxer-card-link-overlay" href="${detailUrl}" aria-label="${escapeHtml(
    boxer.name_ja
  )}の詳細を見る"><span class="sr-only">${escapeHtml(boxer.name_ja)}の詳細を見る</span></a>
    <div class="boxer-card-heading"><span class="boxer-status boxer-status-${escapeHtml(
      boxer.career_status || "unknown"
    )}">${escapeHtml(careerLabel(boxer.career_status))}</span><h2><a href="/boxer/${encodeURIComponent(
    boxer.slug
  )}">${escapeHtml(boxer.name_ja)}</a></h2></div>
    ${boxer.name_en ? `<p class="boxer-name-en">${escapeHtml(boxer.name_en)}</p>` : ""}
    <dl class="boxer-card-facts"><div><dt>階級</dt><dd>${escapeHtml(
      formatValue(boxer.weight_class)
    )}</dd></div>${boxer.gym ? `<div><dt>所属ジム</dt><dd>${escapeHtml(
      boxer.gym
    )}</dd></div>` : ""}${boxer.promoter ? `<div><dt>プロモーター</dt><dd>${escapeHtml(
      formatValue(boxer.promoter)
    )}</dd></div>` : ""}<div><dt>戦績</dt><dd>${escapeHtml(record)}</dd></div></dl>
    <a class="boxer-card-detail" href="${detailUrl}">詳細を見る</a>
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
    "日本人選手と海外選手の戦績、身長、リーチ、階級、所属ジム、世界ランキング、次戦などを確認できる選手データベースです。";
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
  if (!rankings.length) {
    const hasCurrentWorldTitle = String(boxer.current_titles || "").includes("世界");
    return `<p class="boxer-unknown">${
      hasCurrentWorldTitle
        ? "現在世界王者のため通常ランキングは表示していません。"
        : "確認できる世界ランキングはありません。"
    }</p>`;
  }
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
  const boxrecUrl = safeUrl(boxer.boxrec_url);
  const boxrecDetails = boxrecUrl
    ? `<p>BoxRec ID：<strong>${escapeHtml(formatValue(boxer.boxrec_id))}</strong>　<a href="${escapeHtml(
        boxrecUrl
      )}" target="_blank" rel="noopener noreferrer">本人ページを確認</a></p>`
    : boxer.boxrec_id
      ? `<p>BoxRec ID：<strong>${escapeHtml(boxer.boxrec_id)}</strong></p>`
      : "<p>BoxRec：不明</p>";
  const boxrecProfile = boxrecUrl
    ? `<div class="boxer-field"><dt>BoxRec ID</dt><dd><strong>${escapeHtml(
        formatValue(boxer.boxrec_id)
      )}</strong>　<a href="${escapeHtml(boxrecUrl)}" target="_blank" rel="noopener noreferrer">本人ページを見る</a></dd></div>`
    : fieldRow("BoxRec ID", boxer.boxrec_id);
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
  )}${fieldRow("性別", sexLabel(boxer.sex))}${fieldRow("国籍", boxer.nationality)}${fieldRow(
    "国籍コード",
    boxer.nationality_code
  )}${boxrecProfile}${fieldRow("生年月日", formatDate(boxer.birth_date))}${fieldRow(
    "出身地",
    boxer.birthplace
  )}${fieldRow("階級", boxer.weight_class)}${fieldRow("身長", formatNumber(boxer.height_cm, "cm"))}${fieldRow(
    "リーチ",
    formatNumber(boxer.reach_cm, "cm")
  )}${fieldRow("構え", boxer.stance)}${boxer.gym ? fieldRow("所属ジム", boxer.gym) : ""}${fieldRow(
    "プロデビュー",
    formatDate(boxer.pro_debut_date)
  )}</dl></section>
        ${[
          ["トレーナー", boxer.trainer],
          ["プロモーター", boxer.promoter],
          ["マネージャー", boxer.manager],
          ["トレーニング拠点", boxer.training_base]
        ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "").length
          ? `<section class="boxer-profile-section" aria-labelledby="team-heading"><h2 id="team-heading">チーム情報</h2><dl class="boxer-detail-list">${[
              ["トレーナー", boxer.trainer],
              ["プロモーター", boxer.promoter],
              ["マネージャー", boxer.manager],
              ["トレーニング拠点", boxer.training_base]
            ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "").map(([label, value]) => fieldRow(label, value)).join("")}</dl></section>`
          : ""}
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
        <details class="boxer-profile-section boxer-report-section" data-boxer-report data-fighter-id="${escapeHtml(
    boxer.internal_id
  )}" data-current-values="${escapeHtml(JSON.stringify(reportCurrentValues(boxer)))}">
          <summary id="report-heading"><span>情報に誤りがありますか？</span><strong>修正を報告する</strong></summary>
          <div class="boxer-report-content">
          <p>表示内容に誤りがある場合は、項目と情報元URLを送信してください。すぐには反映されず、管理者が公式情報を確認します。</p>
          <form class="boxer-report-form">
            <label>指摘項目<select name="fieldName" required>${reportFieldOptions(boxer)}</select></label>
            <p class="boxer-report-current" data-report-current></p>
            <label>正しいと思う内容<textarea name="proposedValue" rows="3" maxlength="2000" required></textarea></label>
            <label>情報元URL<input name="evidenceUrl" type="url" maxlength="1000" placeholder="https://" required></label>
            <label>補足コメント（任意）<textarea name="comment" rows="3" maxlength="2000"></textarea></label>
            <label class="boxer-report-trap" aria-hidden="true">ウェブサイト<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
            <button type="submit">報告を送信</button>
            <p class="boxer-report-status" data-report-status role="status" aria-live="polite"></p>
          </form>
          </div>
        </details>
        <footer class="boxer-source"><h2>データ出典</h2><p>${sourceDetails}</p>${boxrecDetails}<p>確認日：${escapeHtml(
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
