const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const visitorCookieName = "boxsoku_visitor";

const readCookie = (header, name) => {
  const item = String(header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!item) return "";
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return "";
  }
};

const createVisitorToken = () => crypto.randomUUID();

const hashVisitorToken = async (token, salt) => {
  const input = new TextEncoder().encode(`${salt}:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const safeUrl = (value, defaultValue = "#") => {
  try {
    const url = new URL(String(value || ""), "https://example.invalid");
    if (url.protocol === "https:" || url.protocol === "http:") {
      if (url.origin === "https://example.invalid") {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.href;
    }
  } catch {}
  return defaultValue;
};

const fightImageUrl = (value) => {
  if (!String(value || "").trim()) return "";
  const image = safeUrl(value, "");
  try {
    const url = new URL(image);
    if (
      url.protocol === "https:" &&
      url.hostname === "boxmob.jp" &&
      url.pathname.startsWith("/sp/img/boxer/")
    ) {
      return `/image-proxy?url=${encodeURIComponent(url.href)}`;
    }
  } catch {}
  return image;
};

const safeBoxRecUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    if (
      url.protocol === "https:" &&
      /(^|\.)boxrec\.com$/i.test(url.hostname)
    ) {
      return url.href;
    }
  } catch {}
  return "";
};

const isTweetUrl = (value) =>
  /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+(?:\/photo\/\d+)?(?:\?.*)?$/i.test(
    String(value || "").trim()
  );

const tweetEmbedHtml = (url) =>
  `<div class="retro-tweet"><blockquote class="twitter-tweet" data-lang="ja" data-dnt="true"><a href="${escapeHtml(
    safeUrl(url, "#")
  )}">Xで投稿を見る</a></blockquote></div>`;

const articleBodyHtml = (body, title = "", lead = "") => {
  const paragraphs = String(body || "")
    .split(/\n\s*\n/)
    .filter(
      (paragraph, index) => {
        const text = paragraph.trim();
        if (index === 0 && text === String(title || "").trim()) {
          return false;
        }
        return !(index <= 1 && lead && text === String(lead).trim());
      }
    )
    .filter(Boolean);
  const middleAdIndex =
    paragraphs.length >= 4 ? Math.ceil(paragraphs.length / 2) - 1 : -1;
  return paragraphs
    .map((paragraph, index) => {
      const ad =
        index === middleAdIndex
          ? '<aside class="ad-slot" data-ad-slot-name="articleMiddle" aria-label="広告"></aside>'
          : "";
      const lines = paragraph.split(/\n/);
      const firstLine = String(lines[0] || "").trim();
      if (isTweetUrl(firstLine)) {
        const rest = lines.slice(1).join("\n").trim();
        return `${tweetEmbedHtml(firstLine)}${
          rest ? `<p>${escapeHtml(rest).replaceAll("\n", "<br>")}</p>` : ""
        }${ad}`;
      }
      if (isTweetUrl(paragraph.trim())) {
        return `${tweetEmbedHtml(paragraph.trim())}${ad}`;
      }
      return `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>${ad}`;
    })
    .join("");
};

const jsonArray = (value) => (Array.isArray(value) ? value : []);

const articleTagText = (article) => {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  if (/試合結果|結果速報|勝敗|判定|KO勝ち|TKO/.test(source)) {
    return "試合日程";
  }
  const hasFightCards = jsonArray(article?.affiliate_links).some(
    (item) =>
      item &&
      item.type === "fight_cards" &&
      Array.isArray(item.cards) &&
      item.cards.length
  );
  if (hasFightCards || /試合予定|試合日程|放送予定|対戦カード/.test(source)) {
    return "試合日程";
  }
  if (/選手|ボクサー|戦績|プロフィール/.test(source)) {
    return "試合日程";
  }
  return "試合日程";
};

const featuredFightCards = {
  "2026-08-16-treasure-boxing-promotion-14": [
    {
      weight: "スーパーバンタム級10回戦",
      left: {
        name: "小國 以載",
        profile: "https://boxrec.com/en/box-pro/518213",
        image: "https://boxrec.com/images/thumb/6/63/518213_2023.jpeg/200px-518213_2023.jpeg"
      },
      right: {
        name: "アレックス サンティシマ Jr.",
        profile: "https://boxrec.com/en/box-pro/895661",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "WBO-AP・OPBFスーパーウェルター級王座統一10回戦",
      left: {
        name: "豊嶋 亮太",
        profile: "https://boxrec.com/en/box-pro/704550",
        image: "https://boxrec.com/images/thumb/4/4d/704550.jpg/200px-704550.jpg"
      },
      right: {
        name: "緑川 創",
        profile: "https://boxrec.com/en/box-pro/1274846",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "WBO-AP・日本ミドル級王座決定10回戦",
      left: {
        name: "竹迫 司登",
        profile: "https://boxrec.com/en/box-pro/724918",
        image: "https://boxrec.com/images/thumb/f/f5/Kazuto_Takesako.jpeg/200px-Kazuto_Takesako.jpeg"
      },
      right: {
        name: "川渕 一統",
        profile: "https://boxrec.com/en/box-pro/1131567",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "日本ライトフライ級タイトルマッチ10回戦",
      left: {
        name: "亀山 大輝",
        profile: "https://boxrec.com/en/box-pro/749423",
        image: "https://boxrec.com/images/thumb/4/43/Daiki_Kameyama.JPG/200px-Daiki_Kameyama.JPG"
      },
      right: {
        name: "大橋 波月",
        profile: "https://boxrec.com/en/box-pro/762381",
        image: "https://boxrec.com/images/thumb/e/e7/Natsu_Ohashi.jpg/200px-Natsu_Ohashi.jpg"
      }
    },
    {
      weight: "スーパーバンタム級8回戦",
      left: {
        name: "細川 兼伸",
        profile: "https://boxrec.com/en/box-pro/1038164",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      },
      right: {
        name: "森 朝登",
        profile: "https://boxrec.com/en/box-pro/834182",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    }
  ]
};

const featuredPhotoFallbacks = [
  "https://boxmob.jp/sp/img/boxer/1709295805.jpeg",
  "https://boxmob.jp/sp/img/boxer/1783088460.jpeg",
  "https://boxmob.jp/sp/img/boxer/1781109877.jpeg",
  "https://boxmob.jp/sp/img/boxer/1638448496.jpeg",
  "https://boxmob.jp/sp/img/boxer/1601015040.jpg"
];

const featuredDefaultSlug = "2026-08-16-treasure-boxing-promotion-14";
featuredFightCards[featuredDefaultSlug].forEach((fight, fightIndex) => {
  [fight.left, fight.right].forEach((fighter) => {
    if (fighter.image.includes("v8-avatar")) {
      fighter.image = featuredPhotoFallbacks[fightIndex];
      fighter.imageSource = "Boxing Mobile";
    }
  });
});

function fightCardsHtml(article) {
  const stored = jsonArray(article?.affiliate_links).find(
    (item) => item && item.type === "fight_cards" && Array.isArray(item.cards)
  );
  const fights = stored?.cards?.length
    ? stored.cards
    : featuredFightCards[article?.slug] || [];
  if (!fights.length) return "";
  const fightSortOrder = (value) => {
    const number = Number(String(value || "").match(/\d+/)?.[0]);
    if (Number.isFinite(number)) return number;
    if (String(value || "").includes("セミファイナル")) return 1000;
    if (String(value || "").includes("メインイベント")) return 1001;
    return 999;
  };
  const orderedFights = [...fights].sort((a, b) => {
    return fightSortOrder(a.bout) - fightSortOrder(b.bout);
  });
  const fighterHtml = (fighter, side) => {
    const profile = safeBoxRecUrl(fighter.profile);
    const image = fightImageUrl(fighter.image);
    const imageHtml = image
      ? `<${profile ? `a class="retro-fighter-photo retro-fighter-photo-${side}" href="${escapeHtml(
          profile
        )}" target="_blank" rel="noopener noreferrer"` : `div class="retro-fighter-photo retro-fighter-photo-${side}"`} aria-label="${escapeHtml(
          fighter.name
        )}のプロフィール画像"><img src="${escapeHtml(
          image
        )}" alt="${escapeHtml(fighter.name)}のプロフィール画像" loading="lazy" referrerpolicy="no-referrer"></${profile ? "a" : "div"}>`
      : "";
    const rankingHtml = fighter.ranking
      ? `<p class="retro-fighter-ranking">${escapeHtml(fighter.ranking)}</p>`
      : "";
    const nameHtml = profile
      ? `<a class="retro-fighter-name retro-fighter-name-${side}" href="${escapeHtml(
          profile
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          fighter.name
        )}</a>`
      : `<span class="retro-fighter-name retro-fighter-name-${side}">${escapeHtml(
          fighter.name
        )}</span>`;
    const linkHint = profile
      ? `<small class="retro-fighter-link-note">&#12463;&#12522;&#12483;&#12463;&#12391;BoxRec&#12503;&#12525;&#12501;&#12449;&#12452;&#12523;&#12434;&#38283;&#12367;</small>`
      : "";
    return `<div class="retro-fighter-card">${imageHtml}${rankingHtml}${nameHtml}${linkHint}</div>`;
  };
  return `<section class="retro-fight-cards" aria-labelledby="fight-card-heading"><div class="retro-fight-cards-heading"><span>FIGHT CARD</span><h2 id="fight-card-heading">対戦カード</h2></div>${orderedFights
    .map(
      (fight) => `<article class="retro-fight-card"><p class="retro-fight-number">${escapeHtml(
        fight.bout || ""
      )}</p><p class="retro-fight-weight">${escapeHtml(
        fight.weight
      )}</p><div class="retro-fight-card-grid">${fighterHtml(
        fight.left,
        "left"
      )}<span class="retro-fight-vs" aria-hidden="true">VS</span>${fighterHtml(
        fight.right,
        "right"
      )}</div></article>`
    )
    .join("")}</section>`;
}

function articleSummary(article) {
  const title = String(article?.title || "").trim();
  const rawSummary = String(article?.summary || "").trim();
  const body = String(article?.body || "").trim();
  let source = rawSummary || body;
  if (
    body &&
    (source.length > 220 ||
      /大会概要|全対戦カード|視聴方法|情報源と確認日/.test(source))
  ) {
    source = body;
  }
  let text = source.replace(/\r\n?/g, "\n").trim();
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).replace(/^[\s|｜:：\-–—]+/, "").trim();
  } else if (title) {
    let common = 0;
    while (common < title.length && common < text.length && title[common] === text[common]) {
      common += 1;
    }
    if (common >= 16 && common >= title.length * 0.45) {
      text = text.slice(common).replace(/^[\s|｜:：\-–—]+/, "").trim();
    }
  }
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  text = paragraphs[0] || text.replace(/\s+/g, " ").trim();
  if (text.length < 70 && paragraphs[1]) {
    text = text + " " + paragraphs[1];
  }
  const maxLength = 500;
  if (text.length > maxLength) {
    const sentenceEnd = text.lastIndexOf("。", maxLength);
    text =
      sentenceEnd >= 80
        ? text.slice(0, sentenceEnd + 1)
        : text.slice(0, maxLength);
  }
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/(?:公式情報|U-NEXT BOXING)\s*[:：]\s*/gi, " ")
   .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function youtubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  } catch {}
  return "";
}

function embedsHtml(article) {
  const tweets = jsonArray(article.tweets)
    .map((url) => tweetEmbedHtml(url))
    .join("");

  const videos = jsonArray(article.youtube_urls)
    .map((url) => youtubeId(url))
    .filter(Boolean)
    .map(
      (id) =>
        `<div class="retro-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(
          id
        )}" title="YouTube動画" loading="lazy" allowfullscreen></iframe></div>`
    )
    .join("");

  const instagram = jsonArray(article.instagram_urls)
    .map(
      (url) =>
        `<div class="retro-instagram"><blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(
          safeUrl(url, "#")
        )}" data-instgrm-version="14"><a href="${escapeHtml(
          safeUrl(url, "#")
        )}">Instagramで投稿を見る</a></blockquote></div>`
    )
    .join("");

  return tweets + instagram;
}

function videosHtml(article) {
  const videos = jsonArray(article.youtube_urls)
    .map((url) => youtubeId(url))
    .filter(Boolean)
    .map(
      (id) =>
        `<div class="retro-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(
          id
        )}" title="YouTube&#21205;&#30011;" loading="lazy" allowfullscreen></iframe></div>`
    )
    .join("");
  return videos ? `<div class="retro-article-videos">${videos}</div>` : "";
}

function affiliateLinksHtml(article) {
  const links = jsonArray(article.affiliate_links)
    .filter((item) => item && item.label && item.url)
    .map((item) => {
      const url = safeUrl(item.url, "#");
      if (url === "#" || !url.startsWith("https://")) return "";
      return `<a href="${escapeHtml(
        url
      )}" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(
        item.label
      )}</a>`;
    })
    .join("");
  return links
    ? `<aside class="affiliate-links"><strong>この試合を配信サイトで見る</strong>${links}<p class="affiliate-links-note">料金・配信内容・視聴条件はリンク先の公式ページでご確認ください。</p></aside>`
    : "";
}

function sidebarHtml(articles, ranked = false) {
  return articles
    .map(
      (article, index) => `<li>
        <a class="${article.image_url ? "" : "is-text-only"}" href="/news/${encodeURIComponent(article.slug)}">
          ${ranked ? `<span class="retro-sidebar-rank">${index + 1}</span>` : ""}
          ${
            article.image_url
              ? `<span class="retro-sidebar-thumbnail"><img src="${escapeHtml(
                  article.image_url
                )}" alt="${escapeHtml(article.title)}のアイキャッチ画像" loading="lazy"></span>`
              : ""
          }
          <span class="retro-sidebar-text">
            <strong>${escapeHtml(article.title)}</strong>
            <time>${escapeHtml(
              new Date(article.published_at).toLocaleDateString("ja-JP")
            )}</time>
          </span>
        </a>
      </li>`
    )
    .join("");
}

async function supabaseRows(env, query) {
  let response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
  if (!response.ok && query.includes("boxrec_url")) {
    const legacyQuery = query.replace(/(?:%2C|,)boxrec_url/i, "");
    response = await fetch(`${env.SUPABASE_URL}/rest/v1/${legacyQuery}`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
      }
    });
  }
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.json();
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Supabase environment variables are not configured.", {
      status: 503
    });
  }

  const slug = String(params.slug || "");
  const isVerificationRequest =
    new URL(request.url).searchParams.get("boxsoku_verify") === "1";
  const existingVisitorToken = readCookie(
    request.headers.get("Cookie"),
    visitorCookieName
  );
  const visitorToken = existingVisitorToken || createVisitorToken();
  const visitorHash = await hashVisitorToken(
    visitorToken,
    String(env.VISITOR_ID_SALT || env.COMMENT_ID_SALT || env.SITE_URL || "boxsoku")
  );
  const select = encodeURIComponent(
    "id,slug,title,summary,body,image_url,boxrec_url,accent,is_advertorial,affiliate_disclosure,affiliate_links,tweets,youtube_urls,instagram_urls,published_at,updated_at"
  );
  const [articles, latest, popular] = await Promise.all([
    supabaseRows(
      env,
      `articles?select=${select}&slug=eq.${encodeURIComponent(
        slug
      )}&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&limit=1`
    ),
    supabaseRows(
      env,
      `articles?select=slug,title,image_url,accent,published_at&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&order=published_at.desc&limit=8`
    ),
    supabaseRows(
      env,
      `articles?select=slug,title,image_url,accent,published_at&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&order=view_count.desc,published_at.desc&limit=5`
    )
  ]);

  const article = articles[0];
  if (!article) {
    return new Response("記事が見つかりません。", { status: 404 });
  }

  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const siteName = String(env.SITE_NAME || "ボクシング速報");
  const canonical = `${siteUrl}/news/${encodeURIComponent(article.slug)}`;
 const image = String(article.image_url || siteUrl + "/assets/boxing-arena.png");
 const legacyBoxRecUrl = jsonArray(article.affiliate_links).find(
   (item) => item && item.type === "boxrec_image" && item.url
 )?.url;
 const boxrecUrl = safeBoxRecUrl(article.boxrec_url || legacyBoxRecUrl);
 const summary = articleSummary(article);
  const metaDescription = summary.slice(0, 160);
  const hasAffiliateLinks = jsonArray(article.affiliate_links).some(
    (item) => item && item.label && item.url
  );
  const disclosure = article.is_advertorial || hasAffiliateLinks
    ? `<aside class="affiliate-disclosure"><span class="affiliate-disclosure-badge">PR</span><span>${escapeHtml(
        article.affiliate_disclosure ||
          "この記事には配信サービスのアフィリエイトリンクが含まれています。"
      )}</span></aside>`
    : "";
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: summary,
    ...(image ? { image: [image] } : {}),
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl
    }
  }).replaceAll("<", "\\u003c");

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="article:published_time" content="${escapeHtml(article.published_at)}">
  <meta property="article:modified_time" content="${escapeHtml(
    article.updated_at || article.published_at
  )}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ""}
  <title>${escapeHtml(article.title)} | ${escapeHtml(siteName)}</title>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="/styles.css?v=20260804-carddetails2">
  <script src="/config.js" defer></script>
  <script src="/site.js" defer></script>
  <script src="/comments.js" defer></script>
  <script src="/ads.js" defer></script>
</head>
<body class="retro-blog">
  <div class="retro-top"><div><span data-site-tagline>ボクシングのニュースと話題</span><a href="/about.html">運営者情報</a></div></div>
  <header class="retro-header"><a class="retro-logo" href="/"><strong data-site-name>${escapeHtml(
    siteName
  )}</strong><span>BOXING NEWS</span></a></header>
  <div class="retro-page-layout">
    <aside class="retro-sidebar retro-sidebar-popular"><section class="retro-sidebar-panel"><h2>人気記事</h2><ol class="retro-sidebar-list retro-ranking-list">${sidebarHtml(
      popular,
      true
    )}</ol></section></aside>
    <main class="retro-feed">
      <article class="retro-post retro-detail">
        ${disclosure}
        <div class="retro-title-row"><h1>${escapeHtml(
          article.title
        )}</h1><a class="retro-tweet-link" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(
          article.title
        )}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer">Tweet</a></div>
        <p class="retro-category">カテゴリ：ボクシング</p>
        ${
          image
            ? `<img class="retro-post-image retro-detail-image" src="${escapeHtml(
                image
              )}" alt="${escapeHtml(article.title)}のアイキャッチ画像" loading="lazy">`
            : ""
        }
        <aside class="ad-slot" data-ad-slot-name="articleTop" aria-label="広告"></aside>
        ${affiliateLinksHtml(article)}
        <div class="retro-detail-body">${articleBodyHtml(article.body, article.title, summary)}${embedsHtml(article)}</div>
        ${fightCardsHtml(article)}
        ${videosHtml(article)}
        <aside class="ad-slot" data-ad-slot-name="articleBottom" aria-label="広告"></aside>
        <p class="retro-tags">タグ：${escapeHtml(articleTagText(article))}</p>
        <div class="retro-meta"><time>${escapeHtml(
          new Date(article.published_at).toLocaleDateString("ja-JP")
        )}</time></div>
        <div
          class="retro-comments-mount"
          data-comment-article-id="${escapeHtml(article.id)}"
          data-comment-article-slug="${escapeHtml(article.slug)}"
        ></div>
        <p class="retro-back"><a href="/">トップページへ戻る</a></p>
      </article>
    </main>
    <aside class="retro-sidebar retro-sidebar-latest"><section class="retro-sidebar-panel"><h2>最新記事</h2><ul class="retro-sidebar-list">${sidebarHtml(
      latest
    )}</ul><aside class="ad-slot sidebar-ad" data-ad-slot-name="sidebar" aria-label="広告"></aside></section></aside>
  </div>
  <footer class="retro-footer"><a href="/">TOP PAGEへ</a><nav><a href="/about.html">運営者情報</a><a href="/privacy.html">プライバシーポリシー</a><a href="/disclaimer.html">免責事項</a><a href="/contact.html">お問い合わせ</a></nav><small>copyright &copy; <span data-current-year></span> <span data-site-name>${escapeHtml(
    siteName
  )}</span> all rights reserved.</small></footer>
  ${
    jsonArray(article.tweets).length
      ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
      : ""
  }
  ${
    jsonArray(article.instagram_urls).length
      ? '<script async src="https://www.instagram.com/embed.js"></script>'
      : ""
  }
  ${
    boxrecUrl
      ? `<script>(function(){const image=document.querySelector(".retro-detail-image");if(!image||!image.parentNode)return;const link=document.createElement("a");link.className="retro-image-link";link.href=${JSON.stringify(
          boxrecUrl
        )};link.target="_blank";link.rel="noopener noreferrer";link.setAttribute("aria-label","BoxRecで選手情報を開く");image.parentNode.insertBefore(link,image);link.appendChild(image);})();</script>`
      : ""
  }
</body>
</html>`;

  context.waitUntil(
    (async () => {
      if (isVerificationRequest) return;
      const headers = {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      };
      const uniqueResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/rpc/record_article_view`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_article_slug: slug,
            p_visitor_hash: visitorHash
          })
        }
      );
      if (!uniqueResponse.ok) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/increment_article_view`, {
          method: "POST",
          headers,
          body: JSON.stringify({ article_slug: slug })
        });
      }
    })().catch(() => {})
  );

  const responseHeaders = {
    "Content-Type": "text/html; charset=UTF-8",
    "Cache-Control": "private, no-store"
  };
  if (!existingVisitorToken && !isVerificationRequest) {
    responseHeaders["Set-Cookie"] = `${visitorCookieName}=${encodeURIComponent(
      visitorToken
    )}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  }

  return new Response(html, {
    headers: responseHeaders
  });
}
