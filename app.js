const feed = document.querySelector("#article-feed");
const statusMessage = document.querySelector("#site-status");

function isNewsArticle(article) {
  const source = `${article?.title || ""}\n${article?.summary || ""}\n${article?.body || ""}`;
  const declaredCategory = String(article?.category || "").toLowerCase();
  return declaredCategory === "news" || /NEWS|\u30CB\u30E5\u30FC\u30B9/i.test(source);
}

function articleCategoryText(article) {
  const source = `${article?.title || ""}\n${article?.summary || ""}\n${article?.body || ""}`;
  if (/WOWOW|エキサイトマッチ/i.test(source)) return "WOWOWエキサイトマッチ";
  return isNewsArticle(article) ? "NEWS" : "興行日程";
}

function articleCategoryKey(article) {
  const source = `${article?.title || ""}\n${article?.summary || ""}\n${article?.body || ""}`;
  if (/WOWOW|エキサイトマッチ/i.test(source)) return "wowow";
  return isNewsArticle(article) ? "news" : "schedule";
}

function matchesCategory(article, category) {
  if (category === "lemino") {
    const source = `${article?.title || ""}\n${article?.summary || ""}\n${article?.body || ""}`;
    return /Lemino/i.test(source);
  }
  if (category === "broadcast") {
    const source = `${article?.title || ""}\n${article?.summary || ""}\n${article?.body || ""}`;
    return /Lemino|WOWOW|エキサイトマッチ|U-NEXT|Prime Video|Amazon|配信|放送/i.test(
      source
    );
  }
  return articleCategoryKey(article) === category;
}

function updateCategoryNav(activeCategory) {
  document.querySelectorAll("[data-category-filter]").forEach((link) => {
    const isActive = link.dataset.categoryFilter === activeCategory;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function affiliateItems(article) {
  return (Array.isArray(article.affiliateLinks) ? article.affiliateLinks : [])
    .map((item) => {
      try {
        const url = new URL(String(item?.url || ""));
        const safeUrl = url.protocol === "https:" ? url.href : "";
        const service = affiliateService(safeUrl, item?.label);
        const approvedAffiliate = window.BOXING_CONFIG?.affiliate || {};
        const approvedUrl = service === "amazon"
          ? approvedAffiliate.amazonUrl
          : service === "lemino"
            ? approvedAffiliate.leminoUrl
            : service === "wowow"
              ? approvedAffiliate.wowow?.text?.linkUrl
              : "";
        return {
          ...item,
          url: approvedUrl || safeUrl
        };
      } catch {
        return { ...item, url: "" };
      }
    })
    .filter((item) => item.label && item.url);
}

function affiliateService(value, label = "") {
  if (/WOWOW/i.test(label)) return "wowow";
  if (/Lemino/i.test(label)) return "lemino";
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "amzn.to" || /(^|\.)amazon\.co\.jp$/.test(host)) return "amazon";
    if (host === "hb.afl.rakuten.co.jp") return "rakuten";
    if (host === "tr.affiliate-sp.docomo.ne.jp") return "lemino";
    if (/(^|\.)a8.net$/.test(host)) return "a8";
  } catch {}
  return "";
}

function createArticle(article) {
  const post = document.createElement("article");
  post.className = `retro-post retro-post-${articleCategoryKey(article)}`;
  const links = affiliateItems(article);

  if (article.isAdvertorial || links.length) {
    const disclosure = document.createElement("aside");
    disclosure.className = "affiliate-disclosure";
    disclosure.textContent =
      article.affiliateDisclosure ||
      "この記事には広告・アフィリエイトリンクが含まれています。";
    post.appendChild(disclosure);
  }

  const titleRow = document.createElement("div");
  titleRow.className = "retro-title-row";

  const heading = document.createElement("h2");
  const titleLink = document.createElement("a");
  titleLink.href = window.BoxingData.articleUrl(article);
  titleLink.textContent = article.title;
  heading.appendChild(titleLink);

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

  const summaryText = window.BoxingData.articleSummary(article);
  const summary = document.createElement("p");
  summary.className = "retro-summary";
  summary.textContent = summaryText;

  const image = document.createElement("a");
  image.className = "retro-post-image";
  image.href = window.BoxingData.articleUrl(article);
  image.setAttribute("aria-label", `${article.title}の続きを読む`);
  const hasImage = window.BoxingUI.applyArticleImage(image, article);

  let teaser = null;
  if (links.length) {
    teaser = document.createElement("aside");
    teaser.className = "affiliate-teaser";
    const teaserCopy = document.createElement("div");
    const teaserLabel = document.createElement("span");
    teaserLabel.className = "affiliate-teaser-label";
    teaserLabel.textContent = "公式配信をチェック";
    const teaserTitle = document.createElement("strong");
    teaserTitle.textContent = links[0].label;
    const teaserNote = document.createElement("span");
    teaserNote.className = "affiliate-teaser-note";
    teaserNote.textContent = "料金・配信条件は公式ページで確認";
    teaserCopy.append(teaserLabel, teaserTitle, teaserNote);

    const teaserLink = document.createElement("a");
    teaserLink.href = links[0].url;
    teaserLink.rel = "sponsored noopener noreferrer";
    teaserLink.textContent = "配信ページを見る";
    const service = affiliateService(links[0].url, links[0].label);
    if (!service) teaserLink.target = "_blank";
    if (service) {
      teaserLink.dataset.boxsokuAffiliateService = service;
      teaserLink.dataset.boxsokuAffiliatePlacement = "listing-card";
    }
    teaser.append(teaserCopy, teaserLink);
  }

  const continueLink = document.createElement("p");
  continueLink.className = "retro-continue";
  const link = document.createElement("a");
  link.href = window.BoxingData.articleUrl(article);
  link.textContent = "記事の詳細を見る";
  continueLink.appendChild(link);

  const meta = document.createElement("div");
  meta.className = "retro-meta";
  const time = document.createElement("time");
  time.textContent = window.BoxingData.articleDate(article);
  meta.append(time, document.createTextNode(`｜カテゴリ：${articleCategoryText(article)}`));

  post.append(titleRow, category);
  if (hasImage) post.appendChild(image);
  if (summaryText) post.appendChild(summary);
  if (teaser) post.appendChild(teaser);
  post.append(continueLink, meta);
  return post;
}

async function initialize() {
  try {
    const articles = await window.BoxingData.getArticles();
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    const pathCategory = {
      "/schedule": "schedule",
      "/lemino-boxing": "lemino",
      "/boxing-broadcast": "broadcast",
      "/boxing-news": "news",
      "/wowow-excite-match": "wowow"
    }[window.location.pathname.replace(/\/$/, "") || "/"];
    const activeCategory = pathCategory ||
      (["wowow", "lemino", "broadcast", "schedule", "news"].includes(requestedCategory)
        ? requestedCategory
        : null);
    updateCategoryNav(activeCategory);
    const visibleArticles = activeCategory
      ? articles.filter((article) => matchesCategory(article, activeCategory))
      : articles;
    feed.replaceChildren(...visibleArticles.map(createArticle));
    await window.BoxingUI.renderSidebars(articles);

    if (!window.BoxingData.configured && statusMessage) {
      statusMessage.hidden = false;
      statusMessage.textContent =
        "現在はセットアップ前のサンプル記事を表示しています。Supabase設定後に管理画面から記事を公開できます。";
    }

    if (!articles.length) {
      const empty = document.createElement("p");
      empty.className = "site-empty";
      empty.textContent = "公開中の記事はまだありません。";
      feed.appendChild(empty);
    }
  } catch (error) {
    console.error(error);
    feed.innerHTML =
      '<p class="site-error">記事を読み込めませんでした。しばらくしてから再度お試しください。</p>';
  }
}

initialize();
