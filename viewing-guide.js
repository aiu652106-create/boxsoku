// Shared by server rendering and the browser so the same facts appear in both.
export const streamingLinks = Object.freeze({
  lemino: "https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2",
  amazon: "https://amzn.to/4qhu5Mj",
  wowow: "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM"
});

const escape = (value = "") => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const digits = (value) => String(value || "").replace(/[０-９]/g, (char) =>
  String.fromCharCode(char.charCodeAt(0) - 0xfee0));
const list = (value) => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};

export function isNews(article) {
  return article?.category === "news" || /NEWS|ニュース/i.test(`${article?.title || ""}\n${article?.summary || ""}`);
}

export function japanDay(now = new Date()) {
  return new Date(new Date(now).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

function validDay(year, month, day) {
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

function plain(value) {
  return String(value || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").trim();
}

function field(body, labels) {
  const match = body.match(new RegExp(`^\\s*(?:[-*]\\s*)?(?:${labels})\\s*[:：]\\s*(.+)$`, "m"));
  return match ? plain(match[1]).slice(0, 180) : "";
}

export function viewingFacts(article, event = null) {
  const body = digits(article?.body).replace(/\r\n?/g, "\n");
  const dateText = field(body, "開催日|日程|放送日|配信日|放送日時");
  const match = dateText.match(/^(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  const storedDate = String(event?.event_date || "");
  const slugDate = String(article?.slug || "").match(/-(20\d{2})-(\d{2})-(\d{2})$/);
  const broadcastDate = dateText.match(/^(\d{1,2})月\s*(\d{1,2})日/);
  const verifiedBroadcastDate = /WOWOW|エキサイトマッチ/i.test(article?.title || "") && slugDate && broadcastDate &&
    Number(slugDate[2]) === Number(broadcastDate[1]) && Number(slugDate[3]) === Number(broadcastDate[2])
      ? validDay(...slugDate.slice(1).map(Number)) : "";
  const date = /^20\d{2}-\d{2}-\d{2}$/.test(storedDate)
    ? validDay(...storedDate.split("-").map(Number))
    : match ? validDay(...match.slice(1).map(Number)) : verifiedBroadcastDate;
  const distribution = field(body, "配信|放送|ネット配信|放送・配信");
  const serviceSource = `${distribution}\n${list(event?.distribution_services).join(" ")}\n${/WOWOW|エキサイトマッチ/i.test(article?.title || "") ? "WOWOW" : ""}`;
  const services = [];
  for (const [key, pattern, name] of [
    ["lemino", /Lemino/i, "Lemino"], ["amazon", /Prime Video|Amazon/i, "Prime Video"],
    ["wowow", /WOWOW|エキサイトマッチ/i, "WOWOW"], ["unext", /U-NEXT/i, "U-NEXT"],
    ["abema", /ABEMA/i, "ABEMA"], ["youtube", /YouTube/i, "YouTube"]
  ]) if (pattern.test(serviceSource)) services.push({ key, name });
  const terms = field(body, "視聴条件|配信料金|視聴料金|料金");
  // An introductory free trial is not evidence that an event is a free stream.
  const free = /無料(?:生)?配信|無料(?:生)?放送/.test(`${distribution}\n${terms}`) || /^無料(?:です)?[。\s]*$/.test(terms);
  return {
    date, distribution, services, terms, free,
    start: field(body, "試合開始|興行開始|開始|開演") || String(event?.start_time || "").slice(0, 5),
    broadcastStart: field(body, "配信開始|放送開始") || distribution.match(/(\d{1,2}:\d{2})\s*(?:配信|放送)開始/)?.[1] || String(event?.broadcast_start_time || "").slice(0, 5),
    venue: field(body, "会場|場所") || event?.venue || event?.location || "",
    cancelled: /延期|中止/.test(article?.title || "")
  };
}

export function scheduleGroups(articles, now = new Date()) {
  const groups = { upcoming: [], past: [], undated: [] };
  const today = japanDay(now);
  for (const article of articles) {
    const facts = viewingFacts(article);
    if (!facts.date) groups.undated.push(article);
    else if (facts.date < today || facts.cancelled) groups.past.push(article);
    else groups.upcoming.push(article);
  }
  return groups;
}

export function streamingAffiliate(article, service) {
  if (!streamingLinks[service]) return "";
  const items = list(article?.affiliate_links || article?.affiliateLinks);
  const patterns = { lemino: /Lemino|affiliate-sp\.docomo\.ne\.jp/i, amazon: /Prime Video|Amazon|amzn\.to/i, wowow: /WOWOW|エキサイトマッチ/i };
  return items.some((item) => item?.label && item?.url && patterns[service].test(`${item.label}\n${item.url}`))
    ? streamingLinks[service] : "";
}

export function viewingGuideHtml(article, event = null, now = new Date()) {
  if (isNews(article)) return "";
  const facts = viewingFacts(article, event);
  if (!facts.date) return "";
  const past = facts.date < japanDay(now) || facts.cancelled;
  const rows = [
    ["開催・放送日", facts.date.replaceAll("-", "/")],
    ["興行開始", facts.start], ["放送・配信開始", facts.broadcastStart],
    ["会場", facts.venue], ["放送・配信", facts.distribution || facts.services.map((service) => service.name).join("・")],
    ["視聴条件", facts.terms || (facts.free ? "無料配信" : "最新の料金・対象プランは公式ページで確認")]
  ].filter(([, value]) => value);
  const links = past || facts.free ? [] : facts.services.map((service) => ({
    ...service, url: streamingAffiliate(article, service.key)
  })).filter((service) => service.url);
  return `<section class="watch-guide" aria-label="観戦・視聴ガイド">
    <h2>観戦・視聴ガイド</h2>
    ${past ? '<p class="watch-notice">開催・放送予定日を過ぎた記事です。見逃し配信の有無は公式情報をご確認ください。</p>' : ""}
    <dl class="watch-facts">${rows.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>
    ${links.length ? `<p class="watch-pr">PR：以下はアフィリエイトリンクです。</p><div class="watch-actions">${links.map((service) => `<a class="watch-button" href="${escape(service.url)}" rel="sponsored nofollow noopener noreferrer" data-boxsoku-affiliate-service="${service.key}" data-boxsoku-affiliate-placement="article-viewing-guide">${escape(service.name)}の視聴条件を確認</a>`).join("")}</div>` : ""}
    <p class="watch-note">配信開始とメインの試合開始は異なる場合があります。既に契約している方は、対象プラン・追加料金の有無をご確認ください。</p>
    <a class="watch-text-link" href="/watch">配信サービスの選び方を見る</a>
    <a class="watch-text-link" href="/boxing-broadcast">これからの放送・配信予定</a>
  </section>`;
}

// Small, dated official-source announcement. It expires automatically in JST.
// No bout order, imagery or unverified card data is inferred from this entry.
const verifiedAnnouncements = [{
  id: "lemino-20261126", date: "2026-11-26", service: "lemino", name: "Lemino BOXING ダブル世界タイトルマッチ",
  venue: "EBARA WAVE アリーナおおた（大田区総合体育館）", start: "15:30（予定）",
  terms: "Leminoプレミアムで生配信。対象プラン・追加料金の有無は公式ページをご確認ください。",
  source: "https://lemino.docomo.ne.jp/ft/0000002/", checked: "2026-11-15"
}];

export function officialAnnouncementsHtml(now = new Date(), service = "") {
  return verifiedAnnouncements.filter((item) => item.date >= japanDay(now) && (!service || item.service === service)).map((item) =>
    `<article class="watch-announcement" id="${item.id}"><p class="watch-eyebrow">公式発表済みの配信</p><h3>${escape(item.name)}</h3>
    <p><time datetime="${item.date}">${item.date.replaceAll("-", "/")}</time>／開演 ${escape(item.start)}</p>
    <p>${escape(item.venue)}</p><p>${escape(item.terms)}</p>
    <div class="watch-actions"><a class="watch-button" href="${streamingLinks[item.service]}" rel="sponsored nofollow noopener noreferrer" data-boxsoku-affiliate-service="${item.service}" data-boxsoku-affiliate-placement="official-viewing-guide">Leminoの視聴条件を確認（PR）</a>
    <a href="${item.source}" rel="noopener noreferrer" class="watch-text-link">公式の大会情報</a></div>
    <p class="watch-note">開演はメインの開始時刻ではありません。配信開始・見逃し期間・変更情報は公式発表をご確認ください。</p>
    <p class="watch-note">情報確認：${item.checked.replaceAll("-", "/")}。最新の対象プラン・配信状況は公式ページでご確認ください。</p></article>`
  ).join("");
}

export function watchHubHtml(articles, now = new Date(), service = "") {
  const announcements = officialAnnouncementsHtml(now, service);
  const upcoming = scheduleGroups(articles.filter((article) => !isNews(article)), now).upcoming
    .sort((a, b) => viewingFacts(a).date.localeCompare(viewingFacts(b).date)).slice(0, 4);
  return `<section class="watch-hub" aria-label="これからの観戦案内"><h2>これからの観戦案内</h2>
    <p>興行ごとの開始時間・対戦カード・配信情報を確認できます。</p>
    ${upcoming.length ? `<ul class="watch-upcoming">${upcoming.map((article) => {
      const facts = viewingFacts(article);
      return `<li><time datetime="${facts.date}">${facts.date.slice(5).replace("-", "/")}</time><a href="/news/${encodeURIComponent(article.slug)}">${escape(article.title)}</a><small>${escape(facts.distribution || "配信情報は記事で確認")}</small></li>`;
    }).join("")}</ul>` : announcements ? "" : '<p class="watch-note">今後の予定は確認できた情報から順次掲載します。</p>'}
    ${announcements}
    <nav class="watch-links" aria-label="観戦情報を探す"><a href="/schedule">興行日程</a><a href="/boxing-broadcast">放送・配信</a><a href="/watch">視聴方法ガイド</a></nav></section>`;
}

export function groupedScheduleHtml(articles, renderCard, now = new Date()) {
  const groups = scheduleGroups(articles, now);
  return `${groups.upcoming.length ? `<section class="watch-list-section"><h2>今後の開催・放送</h2>${groups.upcoming.map(renderCard).join("")}</section>` : ""}
    ${groups.undated.length ? `<section class="watch-list-section"><h2>日程の詳細は記事で確認</h2>${groups.undated.map(renderCard).join("")}</section>` : ""}
    ${groups.past.length ? `<details class="watch-archive"><summary>過去の興行・放送の記事（${groups.past.length}件）</summary>${groups.past.map(renderCard).join("")}</details>` : ""}`;
}
