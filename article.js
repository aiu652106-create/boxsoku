const container = document.querySelector("#article-container");
const params = new URLSearchParams(window.location.search);
const identifier = params.get("slug") || params.get("id");
const affiliateConfig = window.BOXING_CONFIG?.affiliate || {};

function createAdSlot(name) {
  const ad = document.createElement("aside");
  ad.className = "ad-slot";
  ad.dataset.adSlotName = name;
  ad.setAttribute("aria-label", "広告");
  return ad;
}

function hasAffiliatePromotion(article) {
  return (
    article.isAdvertorial ||
    (Array.isArray(article.affiliateLinks) && article.affiliateLinks.length > 0)
  );
}

function safeAffiliateUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function createAffiliateDisclosure(article) {
  if (!hasAffiliatePromotion(article)) return null;
  const disclosure = document.createElement("aside");
  disclosure.className = "affiliate-disclosure";
  const badge = document.createElement("span");
  badge.className = "affiliate-disclosure-badge";
  badge.textContent = "PR";
  const text = document.createElement("span");
  text.textContent =
    article.affiliateDisclosure ||
    affiliateConfig.disclosure ||
    "この記事には配信サービスのアフィリエイトリンクが含まれています。";
  disclosure.append(badge, text);
  return disclosure;
}

function appendTweet(parent, url) {
  if (!window.BoxingData.isTweetUrl(url)) return;
  const slot = document.createElement("div");
  slot.className = "retro-tweet";
  const quote = document.createElement("blockquote");
  quote.className = "twitter-tweet";
  quote.dataset.lang = "ja";
  quote.dataset.dnt = "true";
  const link = document.createElement("a");
  link.href = url;
  link.textContent = "Xで投稿を見る";
  quote.appendChild(link);
  slot.appendChild(quote);
  parent.appendChild(slot);
}

function appendYouTube(parent, url) {
  if (!window.BoxingData.isYouTubeUrl(url)) return;
  const slot = document.createElement("div");
  slot.className = "retro-youtube";
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    window.BoxingData.getYouTubeVideoId(url)
  )}`;
  frame.title = "YouTube動画";
  frame.loading = "lazy";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  slot.appendChild(frame);
  parent.appendChild(slot);
}

function appendInstagram(parent, url) {
  if (!window.BoxingData.isInstagramUrl(url)) return;
  const slot = document.createElement("div");
  slot.className = "retro-instagram";
  const quote = document.createElement("blockquote");
  quote.className = "instagram-media";
  quote.dataset.instgrmPermalink = url;
  quote.dataset.instgrmVersion = "14";
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Instagramで投稿を見る";
  quote.appendChild(link);
  slot.appendChild(quote);
  parent.appendChild(slot);
}

function createAffiliateLinks(article) {
  const links = (Array.isArray(article.affiliateLinks)
    ? article.affiliateLinks
    : []
  )
    .map((item) => ({ ...item, url: safeAffiliateUrl(item?.url) }))
    .filter((item) => item.label && item.url);
  if (!links.length) return null;
  const section = document.createElement("aside");
  section.className = "affiliate-links";
  const heading = document.createElement("strong");
  heading.textContent =
    affiliateConfig.heading || "この試合を配信サイトで見る";
  section.appendChild(heading);
  links.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.textContent = item.label;
    section.appendChild(link);
  });
  const note = document.createElement("p");
  note.className = "affiliate-links-note";
  note.textContent =
    affiliateConfig.note ||
    "料金・配信内容・視聴条件はリンク先の公式ページでご確認ください。";
  section.appendChild(note);
  return section;
}

function addExternalScript(src) {
  if ([...document.scripts].some((script) => script.src === src)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
}

function updateMetadata(article) {
  const pageUrl = new URL(window.BoxingData.articleUrl(article), window.location.href).href;
  const imageUrl = String(article.image || "");
  const siteName = window.BOXING_CONFIG?.site?.name || "ボクシング速報";
  const configuredSiteUrl = String(window.BOXING_CONFIG?.site?.url || "");
  const siteUrl =
    /^https:\/\/.+/i.test(configuredSiteUrl) &&
    !/^https:\/\/example\.com\/?$/i.test(configuredSiteUrl)
      ? configuredSiteUrl
      : window.location.origin;
  document.title = `${article.title} | ${siteName}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", article.summary);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", pageUrl);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", article.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute(
    "content",
    article.summary
  );
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", pageUrl);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", article.title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute(
    "content",
    article.summary
  );
  document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", imageUrl);

  let structuredData = document.querySelector("#article-structured-data");
  if (!structuredData) {
    structuredData = document.createElement("script");
    structuredData.id = "article-structured-data";
    structuredData.type = "application/ld+json";
    document.head.appendChild(structuredData);
  }
  structuredData.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || undefined,
    mainEntityOfPage: pageUrl,
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
  });
}

function renderArticle(article) {
  updateMetadata(article);
  container.innerHTML = "";

  const disclosure = createAffiliateDisclosure(article);
  if (disclosure) container.appendChild(disclosure);

  const titleRow = document.createElement("div");
  titleRow.className = "retro-title-row";
  const heading = document.createElement("h1");
  heading.textContent = article.title;
  const tweet = document.createElement("a");
  tweet.className = "retro-tweet-link";
  tweet.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(window.location.href)}`;
  tweet.target = "_blank";
  tweet.rel = "noopener noreferrer";
  tweet.textContent = "Tweet";
  titleRow.append(heading, tweet);

  const category = document.createElement("p");
  category.className = "retro-category";
  category.textContent = "カテゴリ：ボクシング";

  const image = document.createElement("img");
  image.className = "retro-post-image retro-detail-image";
  image.src = article.image;
  image.alt = article.title;
  image.loading = "lazy";

  const topAd = createAdSlot("articleTop");

  const body = document.createElement("div");
  body.className = "retro-detail-body";
  const paragraphs = String(article.body || "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  const middleAdIndex =
    paragraphs.length >= 4 ? Math.ceil(paragraphs.length / 2) - 1 : -1;
  paragraphs.forEach((paragraph, index) => {
    const lines = paragraph.split(/\n/);
    const firstLine = String(lines[0] || "").trim();
    if (window.BoxingData.isTweetUrl(firstLine)) {
      appendTweet(body, firstLine);
      const rest = lines.slice(1).join("\n").trim();
      if (rest) {
        const text = document.createElement("p");
        text.textContent = rest;
        body.appendChild(text);
      }
    } else if (window.BoxingData.isTweetUrl(paragraph.trim())) {
      appendTweet(body, paragraph.trim());
    } else {
      const text = document.createElement("p");
      text.textContent = paragraph;
      body.appendChild(text);
    }
    if (index < article.tweets.length) appendTweet(body, article.tweets[index]);
    if (index === middleAdIndex) body.appendChild(createAdSlot("articleMiddle"));
  });
  article.tweets.slice(paragraphs.length).forEach((url) => appendTweet(body, url));
  article.youtubeUrls.forEach((url) => appendYouTube(body, url));
  article.instagramUrls.forEach((url) => appendInstagram(body, url));

  const tags = document.createElement("p");
  tags.className = "retro-tags";
  tags.textContent = "タグ：ボクシング　ニュース";
  const meta = document.createElement("div");
  meta.className = "retro-meta";
  const time = document.createElement("time");
  time.textContent = window.BoxingData.articleDate(article);
  meta.appendChild(time);
  const back = document.createElement("p");
  back.className = "retro-back";
  const backLink = document.createElement("a");
  backLink.href = "index.html";
  backLink.textContent = "トップページへ戻る";
  back.appendChild(backLink);
  const commentsMount = document.createElement("div");
  commentsMount.className = "retro-comments-mount";

  const affiliateLinks = createAffiliateLinks(article);
  container.append(titleRow, category);
  if (article.image) container.appendChild(image);
  container.append(topAd, body);
  if (affiliateLinks) container.appendChild(affiliateLinks);
  container.append(tags, meta, commentsMount, back);
  window.BoxingAds?.render(container);
  window.BoxingComments?.mount(commentsMount, article);

  if (article.tweets.length) {
    addExternalScript("https://platform.twitter.com/widgets.js");
  }
  if (article.instagramUrls.length) {
    addExternalScript("https://www.instagram.com/embed.js");
  }
}

async function initialize() {
  try {
    const article = await window.BoxingData.findArticle(identifier || "sample-world-title");
    if (!article) {
      container.innerHTML =
        '<h1>記事が見つかりません</h1><p>記事が削除されたか、URLが変更されています。</p><p class="retro-back"><a href="index.html">トップページへ戻る</a></p>';
      return;
    }
    renderArticle(article);
    const articles = await window.BoxingData.getArticles();
    await window.BoxingUI.renderSidebars(articles);
    window.BoxingData.incrementView(article.slug).catch(() => {});
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="site-error">記事を読み込めませんでした。しばらくしてから再度お試しください。</p>';
  }
}

initialize();
