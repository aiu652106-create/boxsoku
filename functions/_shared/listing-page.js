const PAGE_DEFINITIONS = {
  home: {
    path: "/",
    title: "ボクシング試合予定・配信情報｜ボクシング速報",
    heading: "ボクシング試合予定・配信情報",
    description:
      "今日・今週・今後のボクシング試合予定、対戦カード、開始時間、会場、Lemino・WOWOWなどの放送・配信情報を日本人ボクサー中心に掲載します。",
    intro:
      "日本人ボクサーを中心に、今後の試合予定、対戦カード、開始時間、会場、放送・配信情報をまとめています。",
    category: null
  },
  schedule: {
    path: "/schedule",
    title: "ボクシング試合予定・今日の試合と配信情報｜ボクシング速報",
    heading: "ボクシング試合予定",
    description:
      "今日・今週・今後のボクシング試合予定を日付順に掲載。対戦カード、開始時間、会場、Leminoなどの放送・配信情報を確認できます。",
    intro:
      "今後開催されるボクシング興行を日付順に掲載しています。各記事で対戦カード、試合順、会場、放送・配信情報を確認できます。",
    category: "schedule"
  },
  news: {
    path: "/boxing-news",
    title: "ボクシングニュース最新情報｜ボクシング速報",
    heading: "ボクシングニュース",
    description:
      "日本人ボクサーを中心に、試合決定、会見、選手情報などの最新ボクシングニュースを掲載します。",
    intro:
      "試合決定、会見、選手情報など、ボクシングの最新ニュースを掲載しています。",
    category: "news"
  },
  wowow: {
    path: "/wowow-excite-match",
    title: "WOWOWエキサイトマッチ放送予定・対戦カード｜ボクシング速報",
    heading: "WOWOWエキサイトマッチ放送予定",
    description:
      "WOWOWエキサイトマッチの放送予定を日付順に掲載。放送時間、対戦カード、選手情報を確認できます。",
    intro:
      "WOWOWエキサイトマッチの放送予定と対戦カードをまとめています。放送内容は各記事で確認できます。",
    category: "wowow"
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function jsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function isNewsArticle(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  const declaredCategory = String(article?.category || "").toLowerCase();
  return declaredCategory === "news" || /NEWS|ニュース/i.test(source);
}

function articleCategoryKey(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  if (/WOWOW|エキサイトマッチ/i.test(source)) return "wowow";
  return isNewsArticle(article) ? "news" : "schedule";
}

function articleCategoryText(article) {
  const category = articleCategoryKey(article);
  if (category === "wowow") return "WOWOWエキサイトマッチ";
  if (category === "news") return "NEWS";
  return "試合日程";
}

function stripArticleMarkup(value) {
  return String(value || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function articleSummary(article) {
  const explicit = stripArticleMarkup(article?.summary);
  if (explicit) return explicit.slice(0, 180);
  const body = stripArticleMarkup(article?.body);
  if (!body) return "";
  const title = stripArticleMarkup(article?.title);
  const withoutRepeatedTitle = body.startsWith(title)
    ? body.slice(title.length).trim()
    : body;
  return withoutRepeatedTitle.slice(0, 180);
}

function articleUrl(article) {
  return `/news/${encodeURIComponent(article.slug)}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ja-JP");
}

function affiliateItems(article) {
  return jsonArray(article?.affiliate_links)
    .map((item) => ({
      label: String(item?.label || "").trim(),
      url: safeHttpsUrl(item?.url)
    }))
    .filter((item) => item.label && item.url);
}

function articleCardHtml(article) {
  const url = articleUrl(article);
  const title = escapeHtml(article.title);
  const image = safeHttpsUrl(article.image_url);
  const summary = articleSummary(article);
  const affiliate = affiliateItems(article)[0];
  const hasCommercialContent =
    Boolean(article.is_advertorial) || Boolean(affiliate) ||
    jsonArray(article.affiliate_links).some((item) => item?.type === "product_cards");

  return `<article class="retro-post">
    ${
      hasCommercialContent
        ? `<aside class="affiliate-disclosure">${escapeHtml(
            article.affiliate_disclosure ||
              "この記事には広告・アフィリエイトリンクが含まれています。"
          )}</aside>`
        : ""
    }
    <div class="retro-title-row"><h2><a href="${url}">${title}</a></h2><a class="retro-tweet-link" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(
      article.title
    )}&url=${encodeURIComponent(`https://boxsoku.com${url}`)}" target="_blank" rel="noopener noreferrer">Tweet</a></div>
    <p class="retro-category">カテゴリ：${escapeHtml(articleCategoryText(article))}</p>
    ${
      image
        ? `<a class="retro-post-image" href="${url}" aria-label="${title}の続きを読む"><img src="${escapeHtml(
            image
          )}" alt="${title}のアイキャッチ画像" loading="lazy"></a>`
        : ""
    }
    ${summary ? `<p class="retro-summary">${escapeHtml(summary)}</p>` : ""}
    ${
      affiliate
        ? `<aside class="affiliate-teaser"><div><span class="affiliate-teaser-label">公式配信をチェック</span><strong>${escapeHtml(
            affiliate.label
          )}</strong><span class="affiliate-teaser-note">料金・配信条件は公式ページで確認</span></div><a href="${escapeHtml(
            affiliate.url
          )}" target="_blank" rel="sponsored noopener noreferrer">配信ページを見る</a></aside>`
        : ""
    }
    <p class="retro-continue"><a href="${url}">記事の詳細を見る</a></p>
    <div class="retro-meta"><time datetime="${escapeHtml(
      article.published_at
    )}">${escapeHtml(formatDate(article.published_at))}</time>｜カテゴリ：${escapeHtml(
      articleCategoryText(article)
    )}</div>
  </article>`;
}

function sidebarHtml(articles, ranked = false) {
  return articles
    .map((article, index) => {
      const image = safeHttpsUrl(article.image_url);
      return `<li><a class="${image ? "" : "is-text-only"}" href="${articleUrl(
        article
      )}">${ranked ? `<span class="retro-sidebar-rank">${index + 1}</span>` : ""}${
        image
          ? `<span class="retro-sidebar-thumbnail"><img src="${escapeHtml(
              image
            )}" alt="${escapeHtml(article.title)}のアイキャッチ画像" loading="lazy"></span>`
          : ""
      }<span class="retro-sidebar-text"><strong>${escapeHtml(
        article.title
      )}</strong><time>${escapeHtml(
        formatDate(article.published_at)
      )}</time></span></a></li>`;
    })
    .join("");
}

async function supabaseRows(env, query) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.json();
}

function categoryNav(activeCategory) {
  const items = [
    ["schedule", "/schedule", "試合日程"],
    ["news", "/boxing-news", "NEWS"],
    ["wowow", "/wowow-excite-match", "WOWOWエキサイトマッチ"]
  ];
  return items
    .map(
      ([key, href, label]) =>
        `<a href="${href}" data-category-filter="${key}"${
          activeCategory === key ? ' class="is-active" aria-current="page"' : ""
        }>${label}</a>`
    )
    .join("");
}

export async function renderListingPage(context, pageKey = "home") {
  const { env, request } = context;
  const page = PAGE_DEFINITIONS[pageKey] || PAGE_DEFINITIONS.home;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Supabase environment variables are not configured.", {
      status: 503
    });
  }

  const select = encodeURIComponent(
    "id,slug,title,summary,body,image_url,accent,is_advertorial,affiliate_disclosure,affiliate_links,published_at,updated_at,view_count"
  );
  const now = encodeURIComponent(new Date().toISOString());
  const articles = await supabaseRows(
    env,
    `articles?select=${select}&status=eq.published&published_at=lte.${now}&order=published_at.desc&limit=100`
  );
  const visibleArticles = page.category
    ? articles.filter((article) => articleCategoryKey(article) === page.category)
    : articles;
  const popular = [...articles]
    .sort(
      (left, right) =>
        Number(right.view_count || 0) - Number(left.view_count || 0) ||
        new Date(right.published_at) - new Date(left.published_at)
    )
    .slice(0, 5);
  const latest = articles.slice(0, 8);

  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const siteName = String(env.SITE_NAME || "ボクシング速報");
  const canonical = `${siteUrl}${page.path}`;
  const defaultImage = `${siteUrl}/assets/boxing-arena.png`;
  const itemList = visibleArticles.slice(0, 20).map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${siteUrl}${articleUrl(article)}`,
    name: article.title
  }));
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        email: "bokusoku446@gmail.com"
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: siteName,
        inLanguage: "ja",
        publisher: { "@id": `${siteUrl}/#organization` }
      },
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: page.heading,
        description: page.description,
        isPartOf: { "@id": `${siteUrl}/#website` },
        mainEntity: { "@type": "ItemList", itemListElement: itemList }
      }
    ]
  }).replaceAll("<", "\\u003c");

  const cards = visibleArticles.length
    ? visibleArticles.map(articleCardHtml).join("")
    : '<p class="site-empty">公開中の記事はまだありません。</p>';
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(defaultImage)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(page.title)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${escapeHtml(defaultImage)}">
  <title>${escapeHtml(page.title)}</title>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="/styles.css?v=20260809-public-readability1">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="/config.js?v=20260805-lemino-link1" defer></script>
  <script src="/site.js" defer></script>
  <script src="/data.js?v=20260809-seo-human-first1" defer></script>
  <script src="/sidebar.js?v=20260804-content-polish" defer></script>
  <script src="/app.js?v=20260809-search-hubs1" defer></script>
  <script src="/ads.js" defer></script>
</head>
<body class="retro-blog">
  <div class="retro-top"><div><span data-site-tagline>ボクシングの試合予定と配信情報をわかりやすく紹介</span><a href="/about">運営者情報</a></div></div>
  <header class="retro-header"><a class="retro-logo" href="/"><strong data-site-name>${escapeHtml(
    siteName
  )}</strong><span>BOXING NEWS</span></a></header>
  <p id="site-status" class="site-status" hidden></p>
  <div class="retro-page-layout">
    <aside class="retro-sidebar retro-sidebar-popular" aria-labelledby="popular-heading"><nav class="retro-category-nav retro-category-sidebar" aria-label="記事カテゴリー">${categoryNav(
      page.category
    )}</nav><section class="retro-sidebar-panel"><h2 id="popular-heading">人気記事</h2><ol id="popular-articles" class="retro-sidebar-list retro-ranking-list">${sidebarHtml(
      popular,
      true
    )}</ol></section></aside>
    <main class="retro-feed"><h1 class="feed-heading">${escapeHtml(
      page.heading
    )}</h1><p class="feed-intro">${escapeHtml(
      page.intro
    )}</p><aside class="ad-slot home-top-ad" data-ad-slot-name="homeTop" aria-label="広告"></aside><div id="article-feed" aria-live="polite">${cards}</div></main>
    <aside class="retro-sidebar retro-sidebar-latest" aria-labelledby="latest-heading"><section class="retro-sidebar-panel"><h2 id="latest-heading">最新記事</h2><ul id="latest-articles" class="retro-sidebar-list">${sidebarHtml(
      latest
    )}</ul><aside class="ad-slot sidebar-ad" data-ad-slot-name="sidebar" aria-label="広告"></aside></section></aside>
  </div>
  <footer class="retro-footer"><a href="/">TOP PAGEへ</a><nav><a href="/about">運営者情報</a><a href="/privacy">プライバシーポリシー</a><a href="/disclaimer">免責事項</a><a href="/contact">お問い合わせ</a></nav><small>copyright &copy; <span data-current-year></span> <span data-site-name>${escapeHtml(
    siteName
  )}</span> all rights reserved.</small></footer>
</body>
</html>`;

  return new Response(request.method === "HEAD" ? null : html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
