(function () {
  function applyArticleImage(element, article) {
    const image = article?.image || "assets/boxing-arena.png";
    element.classList.add("has-custom-image");
    element.style.backgroundImage = `url(${JSON.stringify(image)}), url("assets/boxing-arena.png")`;
  }

  function createSidebarArticle(article, index, showRank) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = window.BoxingData.articleUrl(article);

    if (showRank) {
      const rank = document.createElement("span");
      rank.className = "retro-sidebar-rank";
      rank.textContent = String(index + 1);
      link.appendChild(rank);
    }

    const thumbnail = document.createElement("span");
    thumbnail.className = `retro-sidebar-thumbnail accent-${article.accent || "red"}`;
    thumbnail.setAttribute("aria-hidden", "true");
    applyArticleImage(thumbnail, article);

    const text = document.createElement("span");
    text.className = "retro-sidebar-text";

    const title = document.createElement("strong");
    title.textContent = article.title;

    const date = document.createElement("time");
    date.textContent = window.BoxingData.articleDate(article);

    text.append(title, date);
    link.append(thumbnail, text);
    item.appendChild(link);
    return item;
  }

  async function renderSidebars(articles) {
    const popularList = document.querySelector("#popular-articles");
    const latestList = document.querySelector("#latest-articles");
    if (!popularList || !latestList) return;

    const source = articles || (await window.BoxingData.getArticles());
    const newestArticles = [...source].sort(
      (first, second) =>
        new Date(second.publishedAt || 0).getTime() -
        new Date(first.publishedAt || 0).getTime()
    );
    const popularArticles = [...source].sort(
      (first, second) =>
        Number(second.viewCount || 0) - Number(first.viewCount || 0)
    );

    popularList.replaceChildren(
      ...popularArticles
        .slice(0, 5)
        .map((article, index) => createSidebarArticle(article, index, true))
    );
    latestList.replaceChildren(
      ...newestArticles
        .slice(0, 8)
        .map((article, index) => createSidebarArticle(article, index, false))
    );
  }

  window.BoxingUI = {
    applyArticleImage,
    renderSidebars
  };
})();

