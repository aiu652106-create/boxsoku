const container = document.querySelector("#article-container");
const params = new URLSearchParams(window.location.search);
const identifier = params.get("slug") || params.get("id");
const affiliateConfig = window.BOXING_CONFIG?.affiliate || {};
const leminoAffiliateUrl = affiliateConfig.leminoUrl || "";
const amazonAffiliateUrl = affiliateConfig.amazonUrl || "";
const wowowAffiliateUrl = affiliateConfig.wowow?.text?.linkUrl || "";

function isNewsArticle(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  const declaredCategory = String(article?.category || "").toLowerCase();
  return declaredCategory === "news" || /NEWS|\u30CB\u30E5\u30FC\u30B9/i.test(source);
}

function articleCategoryText(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  if (/WOWOW|エキサイトマッチ/i.test(source)) return "WOWOWエキサイトマッチ";
  return isNewsArticle(article) ? "NEWS" : "興行日程";
}

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
    (Array.isArray(article.affiliateLinks) && article.affiliateLinks.length > 0) ||
    getPublicProductCards(article).length > 0
  );
}

function getPublicProductCards(article) {
  const selectProducts = window.BoxingData?.selectAffiliateProductCards;
  if (selectProducts) {
    return selectProducts(article?.slug || article?.id || "");
  }
  return Array.isArray(article?.productCards) ? article.productCards : [];
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
  const hasProducts = getPublicProductCards(article).length > 0;
  text.textContent =
    article.affiliateDisclosure ||
    (hasProducts
      ? "\u3053\u306e\u30da\u30fc\u30b8\u306b\u306f\u30a2\u30d5\u30a3\u30ea\u30a8\u30a4\u30c8\u30ea\u30f3\u30af\u304c\u542b\u307e\u308c\u3066\u3044\u307e\u3059\u3002"
      : affiliateConfig.disclosure) ||
    "この記事には配信サービスのアフィリエイトリンクが含まれています。";
  disclosure.append(badge, text);
  return disclosure;
}

function appendTweet(parent, url) {
  const normalizedUrl = window.BoxingData.normalizeTweetUrl(url);
  if (!normalizedUrl) return;
  const slot = document.createElement("div");
  slot.className = "retro-tweet";
  slot.dataset.xEmbed = "quote";
  const label = document.createElement("p");
  label.className = "x-embed-label";
  label.textContent = "X引用ツイート";
  const quote = document.createElement("blockquote");
  quote.className = "twitter-tweet";
  quote.dataset.lang = "ja";
  quote.dataset.dnt = "true";
  quote.dataset.cards = "visible";
  quote.dataset.conversation = "none";
  const link = document.createElement("a");
  link.href = normalizedUrl;
  link.textContent = "Xで引用ツイートを開く";
  quote.appendChild(link);
  slot.append(label, quote);
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

function safeArticleLinkUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function articleAffiliateService(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "amzn.to" || /(^|\.)amazon\.co\.jp$/.test(host)) return "amazon";
    if (host === "hb.afl.rakuten.co.jp") return "rakuten";
    if (host === "tr.affiliate-sp.docomo.ne.jp") return "lemino";
    if (/(^|\.)a8\.net$/.test(host)) return "a8";
  } catch {}
  return "";
}

function appendPlainArticleText(parent, text) {
  const marker = "配信：Lemino";
  const alternateMarker = "配信: Lemino";
  const markerIndex = text.indexOf(marker);
  const alternateIndex = text.indexOf(alternateMarker);
  const index = markerIndex >= 0 ? markerIndex : alternateIndex;
  const matched = markerIndex >= 0 ? marker : alternateMarker;
  if (index < 0 || !leminoAffiliateUrl) {
    parent.appendChild(document.createTextNode(text));
    return;
  }
  parent.append(document.createTextNode(text.slice(0, index)));
  const link = document.createElement("a");
  link.className = "affiliate-streaming-link";
  link.href = leminoAffiliateUrl;
  link.target = "_blank";
  link.rel = "sponsored noopener noreferrer";
  link.textContent = `${matched}で視聴する`;
  link.dataset.boxsokuAffiliateService = "lemino";
  link.dataset.boxsokuAffiliatePlacement = "article-body";
  parent.append(link, document.createTextNode(text.slice(index + matched.length)));
}

function appendArticleInlineText(parent, value) {
  const text = String(value || "").replaceAll("**", "");
  const linkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    appendPlainArticleText(parent, text.slice(lastIndex, match.index));
    const sourceHref = safeArticleLinkUrl(match[2]);
    if (!sourceHref) {
      appendPlainArticleText(parent, match[0]);
    } else {
      const service = articleAffiliateService(sourceHref);
      const href = service === "amazon" && amazonAffiliateUrl
        ? amazonAffiliateUrl
        : service === "lemino" && leminoAffiliateUrl
          ? leminoAffiliateUrl
          : sourceHref;
      const link = document.createElement("a");
      if (service) {
        link.className = "affiliate-streaming-link";
        link.dataset.boxsokuAffiliateService = service;
        link.dataset.boxsokuAffiliatePlacement = "article-body";
      }
      link.href = href;
      link.target = "_blank";
      link.rel = service
        ? "sponsored noopener noreferrer"
        : "noopener noreferrer";
      link.textContent = match[1];
      parent.appendChild(link);
    }
    lastIndex = match.index + match[0].length;
  }

  appendPlainArticleText(parent, text.slice(lastIndex));
}

function appendArticleText(parent, value) {
  const text = String(value || "");
  const lines = text.split(/\r?\n/);
  const heading = String(lines[0] || "").trim().match(/^#{2,6}\s+(.+)$/);
  if (heading && lines.length === 1) {
    const element = document.createElement("h2");
    appendArticleInlineText(element, heading[1]);
    parent.appendChild(element);
    return;
  }
  if (lines.length && lines.every((line) => /^[-*+]\s+/.test(line.trim()))) {
    const list = document.createElement("ul");
    lines.forEach((line) => {
      const item = document.createElement("li");
      appendArticleInlineText(item, line.trim().replace(/^[-*+]\s+/, ""));
      list.appendChild(item);
    });
    parent.appendChild(list);
    return;
  }
  const paragraph = document.createElement("p");
  appendArticleInlineText(paragraph, text);
  parent.appendChild(paragraph);
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
    const service = /WOWOW/i.test(item.label)
      ? "wowow"
      : /Lemino/i.test(item.label)
        ? "lemino"
        : articleAffiliateService(item.url);
    link.href = service === "amazon" && amazonAffiliateUrl
      ? amazonAffiliateUrl
      : service === "lemino" && leminoAffiliateUrl
        ? leminoAffiliateUrl
        : service === "wowow" && wowowAffiliateUrl
          ? wowowAffiliateUrl
          : item.url;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.textContent = item.label;
    if (service) {
      link.dataset.boxsokuAffiliateService = service;
      link.dataset.boxsokuAffiliatePlacement = "article-streaming-links";
    }
    section.appendChild(link);
  });
  return section;
}

function createProductCards(article) {
  const cards = getPublicProductCards(article)
    .map((item) => ({
      ...item,
      url: safeAffiliateUrl(item?.url),
      image: safeAffiliateUrl(item?.image)
    }))
    .filter((item) => item.title && item.url && item.image)
    .slice(0, 4);
  if (!cards.length) return null;

  const section = document.createElement("section");
  section.className = "affiliate-products";
  section.setAttribute("aria-label", "\u304a\u3059\u3059\u3081\u5546\u54c1");
  cards.forEach((item) => {
    const card = document.createElement("a");
    card.className = "affiliate-product-card";
    card.href = item.url;
    card.target = "_blank";
    card.rel = "sponsored nofollow noopener";
    card.dataset.boxsokuAffiliateService = "rakuten";
    card.dataset.boxsokuAffiliatePlacement = "article-product";
    if (item.id) card.dataset.boxsokuAffiliateItem = item.id;

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = `${item.title}\u306e\u5546\u54c1\u753b\u50cf`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";

    const content = document.createElement("span");
    content.className = "affiliate-product-card-content";
    const title = document.createElement("strong");
    title.textContent = item.title;
    content.appendChild(title);
    if (item.price) {
      const price = document.createElement("span");
      price.className = "affiliate-product-price";
      price.textContent = item.price;
      content.appendChild(price);
    }
    if (item.checkedAt) {
      const checkedAt = document.createElement("small");
      checkedAt.className = "affiliate-product-checked-at";
      checkedAt.textContent = `${item.checkedAt}\u6642\u70b9`;
      content.appendChild(checkedAt);
    }
    const action = document.createElement("span");
    action.className = "affiliate-product-action";
    action.textContent = "\u5546\u54c1\u3092\u898b\u308b";
    content.appendChild(action);
    card.append(image, content);
    section.appendChild(card);
  });
  return section;
}

function fightImageUrl(value) {
  let image = "";
  try {
    image = window.BoxingData.parseImageUrl(value);
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
}

function createFightCards(article) {
  const cards = article.fightCards?.length
    ? article.fightCards
    : window.BoxingData.getDefaultFightCards(article.slug);
  if (!cards.length) return null;
  const fightSortOrder = (value) => {
    const number = Number(String(value || "").match(/\d+/)?.[0]);
    if (Number.isFinite(number)) return number;
    if (String(value || "").includes("セミファイナル")) return 1000;
    if (String(value || "").includes("メインイベント")) return 1001;
    return 999;
  };
  const orderedCards = [...cards].sort((a, b) => {
    return fightSortOrder(a.bout) - fightSortOrder(b.bout);
  });

  const section = document.createElement("section");
  section.className = "retro-fight-cards";
  section.setAttribute("aria-labelledby", "fight-card-heading");
  const heading = document.createElement("div");
  heading.className = "retro-fight-cards-heading";
  const eyebrow = document.createElement("span");
  eyebrow.textContent = "FIGHT CARD";
  const title = document.createElement("h2");
  title.id = "fight-card-heading";
  title.textContent = "対戦カード";
  heading.append(eyebrow, title);
  section.appendChild(heading);

  orderedCards.forEach((fight, index) => {
    const card = document.createElement("article");
    card.className = "retro-fight-card";
    const bout = document.createElement("p");
    bout.className = "retro-fight-number";
    bout.textContent = fight.bout || "";
    const weight = document.createElement("p");
    weight.className = "retro-fight-weight";
    weight.textContent = fight.weight;
    const grid = document.createElement("div");
    grid.className = "retro-fight-card-grid";

    [
      [fight.left, "left"],
      [fight.right, "right"]
    ].forEach(([fighter, side], index) => {
      if (index === 1) {
        const vs = document.createElement("span");
        vs.className = "retro-fight-vs";
        vs.setAttribute("aria-hidden", "true");
        vs.textContent = "VS";
        grid.appendChild(vs);
      }
      const fighterCard = document.createElement("div");
      fighterCard.className = `retro-fighter-card retro-fighter-card-${side}`;
      let profile = "";
      try {
        profile = window.BoxingData.parseBoxRecUrl(fighter.profile);
      } catch {}
      const image = fightImageUrl(fighter.image);
      if (image) {
        const photo = document.createElement("a");
        photo.className = `retro-fighter-photo retro-fighter-photo-${side}`;
        if (profile) {
          photo.href = profile;
          photo.target = "_blank";
          photo.rel = "noopener noreferrer";
        } else {
          photo.removeAttribute("href");
        }
        const imageElement = document.createElement("img");
        imageElement.src = image;
        imageElement.alt = `${fighter.name}のプロフィール画像`;
        imageElement.loading = "lazy";
        imageElement.referrerPolicy = "no-referrer";
        photo.appendChild(imageElement);
        fighterCard.appendChild(photo);
      }
      if (fighter.name) {
        const name = document.createElement("a");
        name.className = `retro-fighter-name retro-fighter-name-${side}`;
        name.textContent = fighter.name;
        if (profile) {
          name.href = profile;
          name.target = "_blank";
          name.rel = "noopener noreferrer";
          fighterCard.appendChild(name);
        } else {
          const plainName = document.createElement("span");
          plainName.className = name.className;
          plainName.textContent = name.textContent;
          fighterCard.appendChild(plainName);
        }
      }
      if (fighter.ranking) {
        const ranking = document.createElement("p");
        ranking.className = "retro-fighter-ranking";
        ranking.textContent = fighter.ranking;
        fighterCard.appendChild(ranking);
      }
      if (profile) {
        const linkHint = document.createElement("small");
        linkHint.className = "retro-fighter-link-note";
        linkHint.textContent = "\u30af\u30ea\u30c3\u30af\u3067BoxRec\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u3092\u958b\u304f";
        fighterCard.appendChild(linkHint);
      }
      grid.appendChild(fighterCard);
    });
    card.append(bout, weight, grid);
    section.appendChild(card);
  });
  return section;
}

function addExternalScript(src) {
  if ([...document.scripts].some((script) => script.src === src)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
}

function refreshTweetEmbeds(root) {
  let attempts = 0;
  const load = () => {
    if (typeof window.twttr?.widgets?.load === "function") {
      window.twttr.widgets.load(root);
      return;
    }
    if (attempts < 20) {
      attempts += 1;
      window.setTimeout(load, 250);
    }
  };
  load();
}

function updateMetadata(article) {
  const pageUrl = new URL(window.BoxingData.articleUrl(article), window.location.href).href;
  const imageUrl = window.BoxingUI?.getArticleImageUrl(article) || "";
  const summary = window.BoxingData.articleSummary(article);
  const metaDescription = summary.slice(0, 160);
  const siteName = window.BOXING_CONFIG?.site?.name || "ボクシング速報";
  const configuredSiteUrl = String(window.BOXING_CONFIG?.site?.url || "");
  const siteUrl =
    /^https:\/\/.+/i.test(configuredSiteUrl) &&
    !/^https:\/\/example\.com\/?$/i.test(configuredSiteUrl)
      ? configuredSiteUrl
      : window.location.origin;
  document.title = `${article.title} | ${siteName}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", metaDescription);
  document
    .querySelector('meta[name="robots"]')
    ?.setAttribute(
      "content",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", pageUrl);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", article.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute(
    "content",
    metaDescription
  );
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", pageUrl);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", article.title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute(
    "content",
    metaDescription
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
    "@type": articleCategoryText(article) === "NEWS" ? "NewsArticle" : "Article",
    headline: article.title,
    description: summary,
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
  const shareUrl = new URL(
    window.BoxingData.articleUrl(article),
    window.location.href
  );
  shareUrl.search = "";
  shareUrl.hash = "";
  shareUrl.searchParams.set("utm_source", "x");
  shareUrl.searchParams.set("utm_medium", "social");
  shareUrl.searchParams.set("utm_campaign", "article");
  tweet.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(shareUrl.href)}`;
  tweet.target = "_blank";
  tweet.rel = "noopener noreferrer";
  tweet.textContent = "Xで共有";
  titleRow.append(heading, tweet);

  const category = document.createElement("p");
  category.className = "retro-category";
  category.textContent = `カテゴリ：${articleCategoryText(article)}`;

  const image = document.createElement("img");
  image.className = "retro-post-image retro-detail-image";
  window.BoxingUI?.applyArticleImage(image, article);
  // BoxRec links belong to fighter images and names in the fight cards.
  // The article's lead image is the event/program image, so it stays unlinked.
  const imageContent = image;

  const topAd = createAdSlot("articleTop");

  const body = document.createElement("div");
  body.className = "retro-detail-body";
  const videoEmbeds = document.createElement("div");
  videoEmbeds.className = "retro-article-videos";
  const leadText = window.BoxingData.articleSummary(article).trim();
  const paragraphs = String(article.body || "")
    .split(/\n\s*\n/)
    .filter(
      (paragraph, index) => {
        const text = paragraph.trim();
        if (index === 0 && text === String(article.title || "").trim()) {
          return false;
        }
        return !(index <= 1 && leadText && text === leadText);
      }
    )
    .filter(Boolean);
  const middleAdIndex =
    paragraphs.length >= 4 ? Math.ceil(paragraphs.length / 2) - 1 : -1;
  const inlineTweetUrls = new Set();
  paragraphs.forEach((paragraph) => {
    const lines = paragraph.split(/\n/);
    [lines[0], paragraph.trim()].forEach((url) => {
      const normalizedUrl = window.BoxingData.normalizeTweetUrl(url);
      if (normalizedUrl) inlineTweetUrls.add(normalizedUrl);
    });
  });
  const externalTweets = window.BoxingData
    .uniqueTweetUrls(article.tweets)
    .filter((url) => !inlineTweetUrls.has(url));
  const renderedTweetUrls = new Set();
  const appendArticleTweet = (url) => {
    const normalizedUrl = window.BoxingData.normalizeTweetUrl(url);
    if (!normalizedUrl || renderedTweetUrls.has(normalizedUrl)) return;
    renderedTweetUrls.add(normalizedUrl);
    appendTweet(body, normalizedUrl);
  };
  paragraphs.forEach((paragraph, index) => {
    const lines = paragraph.split(/\n/);
    const firstLine = String(lines[0] || "").trim();
    if (window.BoxingData.isTweetUrl(firstLine)) {
      appendArticleTweet(firstLine);
      const rest = lines.slice(1).join("\n").trim();
      if (rest) {
        const text = document.createElement("p");
        text.textContent = rest;
        body.appendChild(text);
      }
    } else if (window.BoxingData.isTweetUrl(paragraph.trim())) {
      appendArticleTweet(paragraph.trim());
    } else {
      appendArticleText(body, paragraph);
    }
    if (index < externalTweets.length) appendArticleTweet(externalTweets[index]);
    if (index === middleAdIndex) body.appendChild(createAdSlot("articleMiddle"));
  });
  externalTweets.slice(paragraphs.length).forEach(appendArticleTweet);
  article.youtubeUrls.forEach((url) => appendYouTube(videoEmbeds, url));
  article.instagramUrls.forEach((url) => appendInstagram(body, url));

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
  const productCards = createProductCards(article);
  const fightCards = createFightCards(article);
  container.append(titleRow, category);
  container.appendChild(imageContent);
  if (videoEmbeds.childElementCount) container.appendChild(videoEmbeds);
  container.appendChild(body);
  container.appendChild(topAd);
  if (fightCards) container.appendChild(fightCards);
  if (affiliateLinks) container.appendChild(affiliateLinks);
  if (productCards) container.appendChild(productCards);
  container.append(meta, commentsMount, back);
  window.BoxingAds?.render(container);
  window.BoxingComments?.mount(commentsMount, article);

  const hasInlineTweet = String(article.body || "")
    .split(/\n/)
    .some((line) => window.BoxingData.isTweetUrl(line.trim()));
  if (article.tweets.length || hasInlineTweet) {
    addExternalScript("https://platform.twitter.com/widgets.js");
    refreshTweetEmbeds(body);
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
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="site-error">記事を読み込めませんでした。しばらくしてから再度お試しください。</p>';
  }
}

initialize();
