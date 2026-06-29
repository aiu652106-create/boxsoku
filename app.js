const feed = document.querySelector("#article-feed");
const statusMessage = document.querySelector("#site-status");

function createArticle(article) {
  const post = document.createElement("article");
  post.className = "retro-post";

  if (article.isAdvertorial) {
    const disclosure = document.createElement("aside");
    disclosure.className = "affiliate-disclosure";
    disclosure.textContent =
      article.affiliateDisclosure ||
      "この記事には広告・アフィリエイトリンクが含まれています。";
    post.appendChild(disclosure);
  }

  const titleRow = document.createElement("div");
  titleRow.className = "retro-title-row";

  const heading = document.createElement("h1");
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

  const image = document.createElement("a");
  image.className = `retro-post-image accent-${article.accent || "red"}`;
  image.href = window.BoxingData.articleUrl(article);
  image.setAttribute("aria-label", `${article.title}の続きを読む`);
  window.BoxingUI.applyArticleImage(image, article);

  const summary = document.createElement("p");
  summary.className = "retro-summary";
  summary.textContent = article.summary;

  const continueLink = document.createElement("p");
  continueLink.className = "retro-continue";
  const link = document.createElement("a");
  link.href = window.BoxingData.articleUrl(article);
  link.textContent = `≫ ${article.title}の続きを読む`;
  continueLink.appendChild(link);

  const tags = document.createElement("p");
  tags.className = "retro-tags";
  tags.textContent = "タグ：ボクシング　ニュース";

  const meta = document.createElement("div");
  meta.className = "retro-meta";
  const time = document.createElement("time");
  time.textContent = window.BoxingData.articleDate(article);
  meta.append(time, document.createTextNode(" | "));

  post.append(titleRow, image, summary, continueLink, tags, meta);
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

                                                                                                                                                                                                            