const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const safeUrl = (value, fallback = "/assets/boxing-arena.png") => {
  try {
    const url = new URL(String(value || ""), "https://example.invalid");
    if (url.protocol === "https:" || url.protocol === "http:") {
      if (url.origin === "https://example.invalid") {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.href;
    }
  } catch {}
  return fallback;
};

const articleBodyHtml = (body) => {
  const paragraphs = String(body || "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  const middleAdIndex =
    paragraphs.length >= 4 ? Math.ceil(paragraphs.length / 2) - 1 : -1;
  return paragraphs
    .map((paragraph, index) => {
      const ad =
        index === middleAdIndex
          ? '<aside class="ad-slot" data-ad-slot-name="articleMiddle" aria-label="広告"></aside>'
          : "";
      return `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>${ad}`;
    })
    .join("");
};

const jsonArray = (value) => (Array.isArray(value) ? value : []);

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
    .map(
      (url) =>
        `<div class="retro-tweet"><blockquote class="twitter-tweet" data-lang="ja" data-dnt="true"><a href="${escapeHtml(
          safeUrl(url, "#")
        )}">Xで投稿を見る</a></blockquote></div>`
    )
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

  return tweets + videos + instagram;
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
        <a href="/news/${encodeURIComponent(article.slug)}">
          ${ranked ? `<span class="retro-sidebar-rank">${index + 1}</span>` : ""}
          <span class="retro-sidebar-thumbnail accent-${escapeHtml(
            article.accent || "red"
          )}" style="background-image:url('${escapeHtml(
            safeUrl(article.image_url)
          )}')"></span>
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
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
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
  const select = encodeURIComponent(
    "id,slug,title,summary,body,image_url,accent,is_advertorial,affiliate_disclosure,affiliate_links,tweets,youtube_urls,instagram_urls,published_at,updated_at"
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
  const image = new URL(
    safeUrl(article.image_url, "/assets/boxing-arena.png"),
    `${siteUrl}/`
  ).href;
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
    description: article.summary,
    image: [image],
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
  <meta name="description" content="${escapeHtml(article.summary)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.summary)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="article:published_time" content="${escapeHtml(article.published_at)}">
  <meta property="article:modified_time" content="${escapeHtml(
    article.updated_at || article.published_at
  )}">
  <meta name="twitter:card" content="summary_large_image">
  <title>${escapeHtml(article.title)} | ${escapeHtml(siteName)}</title>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="/styles.css">
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
        <div class="retro-post-image retro-detail-image accent-${escapeHtml(
          article.accent || "red"
        )}" role="img" aria-label="${escapeHtml(
          article.title
        )}の記事画像" style="background-image:url('${escapeHtml(image)}')"></div>
        <aside class="ad-slot" data-ad-slot-name="articleTop" aria-label="広告"></aside>
        <div class="retro-detail-body">${articleBodyHtml(article.body)}${embedsHtml(article)}</div>
        ${affiliateLinksHtml(article)}
        <aside class="ad-slot" data-ad-slot-name="articleBottom" aria-label="広告"></aside>
        <p class="retro-tags">タグ：ボクシング　ニュース</p>
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
</body>
</html>`;

  context.waitUntil(
    fetch(`${env.SUPABASE_URL}/rest/v1/rpc/increment_article_view`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ article_slug: slug })
    })
  );

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=60, s-maxage=300"
    }
  });
}
