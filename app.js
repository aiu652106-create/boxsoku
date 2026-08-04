const feed = document.querySelector("#article-feed");
const statusMessage = document.querySelector("#site-status");

function articleTagText(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  if (/試合結果|結果速報|勝敗|判定|KO勝ち|TKO/.test(source)) {
    return "試合日程";
  }
  if (
    article?.fightCards?.length ||
    /試合予定|試合日程|放送予定|対戦カード/.test(source)
  ) {
    return "試合日程";
  }
  if (/選手|ボクサー|戦績|プロフィール/.test(source)) {
    return "試合日程";
  }
  return "試合日程";
}

function articleCategoryText(article) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  return /WOWOW|エキサイトマッチ/i.test(source)
    ? "WOWOWエキサイトマッチ"
    : "ボクシング";
}

function affiliateItems(article) {
  return (Array.isArray(article.affiliateLinks) ? article.affiliateLinks : [])
    .map((item) => {
      try {
        const url = new URL(String(item?.url || ""));
        return { ...item, url: url.protocol === "https:" ? url.href : "" };
      } catch {
        return { ...item, url: "" };
      }
    })
    .filter((item) => item.label && item.url);
}

function createArticle(article) {
  const post = document.createElement("article");
  post.className = "retro-post";
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
  tweet.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(
    new URL(window.BoxingData.articleUrl(article), window.location.href).href
  )}`;
  tweet.target = "_blank";
  tweet.rel = "noopener noreferrer";
  tweet.textContent = "Tweet";

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
  image.href = article.boxrecUrl || window.BoxingData.articleUrl(article);
  if (article.boxrecUrl) {
    image.target = "_blank";
    image.rel = "noopener noreferrer";
  }
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
    teaserLink.target = "_blank";
    teaserLink.rel = "sponsored noopener noreferrer";
    teaserLink.textContent = "配信ページを見る";
    teaser.append(teaserCopy, teaserLink);
  }

  const continueLink = document.createElement("p");
  continueLink.className = "retro-continue";
  const link = document.createElement("a");
  link.href = window.BoxingData.articleUrl(article);
  link.textContent = "記事の詳細を見る";
  continueLink.appendChild(link);

  const tags = document.createElement("p");
  tags.className = "retro-tags";
  tags.textContent = `タグ：${articleTagText(article)}`;

  const meta = document.createElement("div");
  meta.className = "retro-meta";
  const time = document.createElement("time");
  time.textContent = window.BoxingData.articleDate(article);
  meta.append(time, document.createTextNode(`｜カテゴリ：${articleCategoryText(article)}`));

  post.append(titleRow, category);
  if (hasImage) post.appendChild(image);
  if (summaryText) post.appendChild(summary);
  if (teaser) post.appendChild(teaser);
  post.append(continueLink, tags, meta);
  return post;
}

async function initialize() {
  try {
    const articles = await window.BoxingData.getArticles();
    feed.replaceChildren(...articles.map(createArticle));
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
