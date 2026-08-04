const container = document.querySelector("#article-container");
const params = new URLSearchParams(window.location.search);
const identifier = params.get("slug") || params.get("id");
const affiliateConfig = window.BOXING_CONFIG?.affiliate || {};

function articleCategoryText(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  return /WOWOW|エキサイトマッチ/i.test(source)
    ? "WOWOWエキサイトマッチ"
    : "試合日程";
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
      if (fighter.ranking) {
        const ranking = document.createElement("p");
        ranking.className = "retro-fighter-ranking";
        ranking.textContent = fighter.ranking;
        fighterCard.appendChild(ranking);
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
    "@type": "NewsArticle",
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
  tweet.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(window.location.href)}`;
  tweet.target = "_blank";
  tweet.rel = "noopener noreferrer";
  tweet.textContent = "Tweet";
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
  const fightCards = createFightCards(article);
  container.append(titleRow, category);
  container.appendChild(imageContent);
  container.appendChild(topAd);
  if (affiliateLinks) container.appendChild(affiliateLinks);
  container.appendChild(body);
  if (fightCards) container.appendChild(fightCards);
  if (videoEmbeds.childElementCount) container.appendChild(videoEmbeds);
  container.append(meta, commentsMount, back);
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
    if (params.get("boxsoku_verify") !== "1") {
      window.BoxingData.incrementView(article.slug).catch(() => {});
    }
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="site-error">記事を読み込めませんでした。しばらくしてから再度お試しください。</p>';
  }
}

initialize();
