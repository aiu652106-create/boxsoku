(function () {
  const FALLBACK_IMAGE = "/assets/boxing-arena.png";

  function getArticleImageUrl(article) {
    const value = String(article?.image || "").trim();
    if (!value) return FALLBACK_IMAGE;
    if (/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i.test(value)) {
      return FALLBACK_IMAGE;
    }
    if (/^https?:\/\//i.test(value)) return value;
    return new URL(`/${value.replace(/^\/+/, "")}`, window.location.origin).href;
  }

  function setImageFallback(element, image, article) {
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = FALLBACK_IMAGE;
    element.style.backgroundImage = `url(${JSON.stringify(FALLBACK_IMAGE)})`;
    element.classList.add("is-image-fallback");
    image.alt = `${article?.title || "ボクシング記事"}のアイキャッチ画像`;
  }

  function applyArticleImage(element, article) {
    const image = getArticleImageUrl(article);
    element.classList.toggle("has-custom-image", image !== FALLBACK_IMAGE);
    element.style.backgroundImage = `url(${JSON.stringify(image)})`;
    if (element.tagName === "IMG") {
      element.alt = `${article?.title || "ボクシング記事"}のアイキャッチ画像`;
      element.loading = "lazy";
      element.addEventListener("error", () => setImageFallback(element, element, article), {
        once: true
      });
      element.src = image;
    } else {
      element.replaceChildren();
      const img = document.createElement("img");
      img.src = image;
      img.alt = `${article?.title || "ボクシング記事"}のアイキャッチ画像`;
      img.loading = "lazy";
      img.addEventListener("error", () => setImageFallback(element, img, article), {
        once: true
      });
      element.appendChild(img);
    }
    return true;
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
    thumbnail.className = "retro-sidebar-thumbnail";
    const hasImage = applyArticleImage(thumbnail, article);

    const text = document.createElement("span");
    text.className = "retro-sidebar-text";

    const title = document.createElement("strong");
    title.textContent = article.title;

    const date = document.createElement("time");
    date.textContent = window.BoxingData.articleDate(article);

    text.append(title, date);
    if (hasImage) {
      link.append(thumbnail, text);
    } else {
      link.classList.add("is-text-only");
      link.appendChild(text);
    }
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
    getArticleImageUrl,
    renderSidebars
  };
})();

