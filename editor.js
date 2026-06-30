const form = document.querySelector("#article-form");
const params = new URLSearchParams(window.location.search);
const editingId = params.get("id");
const imageFileInput = document.querySelector("#image-file");
const imageUrlInput = document.querySelector("#image-url");
const imageStatus = document.querySelector("#image-status");
const previewImage = document.querySelector("#preview-image");
const submitButton = document.querySelector("#publish-button");
const advertorialInput = document.querySelector("#is-advertorial");
const affiliateDisclosureInput = document.querySelector("#affiliate-disclosure");
const affiliateLinksInput = document.querySelector("#affiliate-links");
const tweetUrlsInput = document.querySelector("#tweet-urls");
const youtubeUrlsInput = document.querySelector("#youtube-urls");
const instagramUrlsInput = document.querySelector("#instagram-urls");
const previewAffiliateDisclosure = document.querySelector(
  "#preview-affiliate-disclosure"
);
const previewAffiliateDisclosureText = document.querySelector(
  "#preview-affiliate-disclosure-text"
);
const previewAffiliateLinks = document.querySelector("#preview-affiliate-links");
const previewAffiliateLinkList = document.querySelector(
  "#preview-affiliate-link-list"
);
let editingArticle = null;
let selectedFile = null;
let previewObjectUrl = "";
let imageCleared = false;
let imageUrlRequestId = 0;

function buildSummary(body, title) {
  const source = String(body || title || "").replace(/\s+/g, " ").trim();
  return source.slice(0, 500) || String(title || "Article").trim() || "Article";
}

function cleanImageUrl(value) {
  return String(value || "")
    .trim()
    .replace(/^url\((["']?)(.*)\1\)$/i, "$2")
    .replaceAll("&amp;", "&");
}

function isDirectImageUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    const path = url.pathname.toLowerCase();
    const format = String(url.searchParams.get("format") || "").toLowerCase();
    return (
      /\.(avif|gif|jpe?g|png|webp)$/.test(path) ||
      ["avif", "gif", "jpg", "jpeg", "png", "webp"].includes(format)
    );
  } catch {
    return false;
  }
}

function xPhotoMatch(value) {
  return String(value || "").match(
    /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/(\d+)(?:\/photo\/(\d+))?/i
  );
}

async function resolveImageUrl(value) {
  const url = cleanImageUrl(value);
  if (!url) return "";
  if (isDirectImageUrl(url)) return url;

  const match = xPhotoMatch(url);
  if (!match) return "";

  const photoIndex = Math.max(0, Number(match[2] || 1) - 1);
  const response = await fetch(`https://api.fxtwitter.com/status/${match[1]}`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return "";
  const payload = await response.json();
  const photos = payload?.tweet?.media?.photos || payload?.tweet?.media?.all || [];
  const photo = photos[photoIndex] || photos[0];
  return isDirectImageUrl(photo?.url) ? photo.url : "";
}

function urlLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function appendPreviewEmbed(parent, type, url) {
  const item = document.createElement("div");
  item.className = `tweet-preview-card preview-${type}`;

  const label = document.createElement("strong");
  label.textContent =
    type === "youtube" ? "YouTube" : type === "instagram" ? "Instagram" : "X";

  const text = document.createElement("span");
  text.textContent = url;

  item.append(label, text);
  parent.appendChild(item);
}

function setPreviewImage(url) {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }
  if (url) {
    previewImage.style.backgroundImage = `url(${JSON.stringify(
      url
    )}), url("assets/boxing-arena.png")`;
  } else {
    previewImage.style.removeProperty("background-image");
  }
}

function updatePreview() {
  const title = document.querySelector("#title").value.trim();
  const body = document.querySelector("#body").value.trim();
  document.querySelector("#title-count").textContent = String(title.length);
  document.querySelector("#preview-title").textContent =
    title || "記事タイトルがここに入ります";

  const bodyPreview = document.querySelector("#preview-body");
  bodyPreview.replaceChildren();
  const pastedImage = cleanImageUrl(imageUrlInput.value);
  const paragraphs = body
    ? body.split(/\n\s*\n/).filter(Boolean)
    : ["本文を入力すると、ここで仕上がりを確認できます。"];
  paragraphs.slice(0, 4).forEach((value) => {
    const lines = value.split(/\n/);
    const firstLine = String(lines[0] || "").trim();
    if (window.BoxingData?.isTweetUrl?.(firstLine)) {
      appendPreviewEmbed(bodyPreview, "tweet", firstLine);
      const rest = lines.slice(1).join("\n").trim();
      if (!rest) return;
      value = rest;
    } else if (window.BoxingData?.isTweetUrl?.(value.trim())) {
      appendPreviewEmbed(bodyPreview, "tweet", value.trim());
      return;
    }
    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    bodyPreview.appendChild(paragraph);
  });

  if (!selectedFile) {
    const currentImage = imageCleared
      ? ""
      : imageUrlInput.dataset.resolvedImage
        ? imageUrlInput.dataset.resolvedImage
        : pastedImage && isDirectImageUrl(pastedImage)
        ? pastedImage
        : isDirectImageUrl(editingArticle?.image)
          ? editingArticle.image
          : "";
    setPreviewImage(currentImage);
  }

  urlLines(tweetUrlsInput.value).forEach((url) => {
    appendPreviewEmbed(bodyPreview, "tweet", url);
  });
  urlLines(youtubeUrlsInput.value).forEach((url) => {
    appendPreviewEmbed(bodyPreview, "youtube", url);
  });
  urlLines(instagramUrlsInput.value).forEach((url) => {
    appendPreviewEmbed(bodyPreview, "instagram", url);
  });

  const linkLabels = affiliateLinksInput.value
    .split(/\r?\n/)
    .map((line) => line.split("|")[0].trim())
    .filter(Boolean)
    .slice(0, 5);
  const showAffiliate = advertorialInput.checked || linkLabels.length > 0;
  previewAffiliateDisclosure.hidden = !showAffiliate;
  previewAffiliateLinks.hidden = linkLabels.length === 0;
  previewAffiliateDisclosureText.textContent =
    affiliateDisclosureInput.value.trim() ||
    window.BOXING_CONFIG?.affiliate?.disclosure ||
    "この記事には配信サービスのアフィリエイトリンクが含まれています。";
  previewAffiliateLinkList.replaceChildren(
    ...linkLabels.map((label) => {
      const item = document.createElement("span");
      item.className = "affiliate-preview-link";
      item.textContent = label;
      return item;
    })
  );
}

async function compressImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("JPEG、PNG、WebP画像を選択してください。");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("元画像は10MB以下にしてください。");
  }

  const bitmap = await createImageBitmap(file);
  const maxWidth = 1600;
  const maxHeight = 1200;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像を変換できませんでした。"))),
      "image/webp",
      0.82
    );
  });
}

imageFileInput.addEventListener("change", async () => {
  const [file] = imageFileInput.files;
  if (!file) return;
  imageStatus.textContent = "画像を処理しています...";
  try {
    selectedFile = await compressImage(file);
    imageCleared = false;
    previewObjectUrl = URL.createObjectURL(selectedFile);
    previewImage.style.backgroundImage = `url(${JSON.stringify(
      previewObjectUrl
    )}), url("assets/boxing-arena.png")`;
    imageUrlInput.value = "";
    imageStatus.textContent = "選択した画像を保存時にアップロードします。";
  } catch (error) {
    selectedFile = null;
    imageFileInput.value = "";
    imageStatus.textContent = error.message;
  }
});

imageUrlInput.addEventListener("input", async () => {
  selectedFile = null;
  imageCleared = false;
  imageFileInput.value = "";
  delete imageUrlInput.dataset.resolvedImage;
  updatePreview();
  const pastedImage = cleanImageUrl(imageUrlInput.value);
  if (!pastedImage) {
    imageStatus.textContent = "画像未設定";
    return;
  }
  if (isDirectImageUrl(pastedImage)) {
    setPreviewImage(pastedImage);
    imageStatus.textContent = "外部画像URLを使用します。";
    return;
  }
  if (!xPhotoMatch(pastedImage)) {
    imageStatus.textContent =
      "画像ファイルURLではありません。jpg/png/webp等の画像アドレスを貼ってください。";
    return;
  }

  const requestId = ++imageUrlRequestId;
  imageStatus.textContent = "X画像を取得しています...";
  try {
    const resolved = await resolveImageUrl(pastedImage);
    if (requestId !== imageUrlRequestId) return;
    if (!resolved) {
      imageStatus.textContent = "X画像を取得できませんでした。";
      return;
    }
    imageUrlInput.dataset.resolvedImage = resolved;
    setPreviewImage(resolved);
    imageStatus.textContent = "X画像を取得して使用します。";
  } catch {
    if (requestId === imageUrlRequestId) {
      imageStatus.textContent = "X画像を取得できませんでした。";
    }
  }
});

document.querySelector("#image-reset").addEventListener("click", () => {
  selectedFile = null;
  imageCleared = true;
  imageFileInput.value = "";
  imageUrlInput.value = "";
  setPreviewImage("");
  imageStatus.textContent = "画像未設定";
});

document.querySelector("#title").addEventListener("input", (event) => {
  if (!editingArticle && !document.querySelector("#slug").dataset.edited) {
    document.querySelector("#slug").value = window.BoxingData.createSlug(event.target.value);
  }
  updatePreview();
});
document.querySelector("#slug").addEventListener("input", (event) => {
  event.target.dataset.edited = "true";
});
["body"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", updatePreview);
});
affiliateDisclosureInput.addEventListener("input", updatePreview);
advertorialInput.addEventListener("change", updatePreview);
affiliateLinksInput.addEventListener("input", () => {
  if (affiliateLinksInput.value.trim()) advertorialInput.checked = true;
  updatePreview();
});
tweetUrlsInput.addEventListener("input", updatePreview);
youtubeUrlsInput.addEventListener("input", updatePreview);
instagramUrlsInput.addEventListener("input", updatePreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.firstChild.textContent = "保存中...";
  let uploaded = null;

  try {
    const user = await window.BoxingData.getCurrentUser();
    if (!user || !(await window.BoxingData.isCurrentUserAdmin())) {
      throw new Error("管理者としてログインし直してください。");
    }

    const pastedImage = cleanImageUrl(imageUrlInput.value);
    const resolvedPastedImage = pastedImage
      ? imageUrlInput.dataset.resolvedImage || (await resolveImageUrl(pastedImage))
      : "";
    if (pastedImage && !resolvedPastedImage) {
      throw new Error(
        "画像URLを取得できませんでした。jpg/png/webp等の画像URL、または画像付きX投稿のURLを貼ってください。"
      );
    }
    let image = resolvedPastedImage
      ? resolvedPastedImage
      : isDirectImageUrl(editingArticle?.image)
        ? editingArticle.image
        : "";
    let imagePath = resolvedPastedImage
      ? ""
      : editingArticle?.imagePath || "";

    if (selectedFile) {
      uploaded = await window.BoxingData.uploadArticleImage(selectedFile, user.id);
      image = uploaded.url;
      imagePath = uploaded.path;
    } else if (imageCleared) {
      image = "";
      imagePath = "";
    }

    const status = document.querySelector("#status").value;
    const affiliateLinks = window.BoxingData.parseAffiliateLinks(
      affiliateLinksInput.value
    );
    const article = {
      id: editingArticle?.id,
      slug: window.BoxingData.createSlug(document.querySelector("#slug").value),
      title: document.querySelector("#title").value.trim(),
      summary: buildSummary(
        document.querySelector("#body").value,
        document.querySelector("#title").value
      ),
      body: document.querySelector("#body").value.trim(),
      image,
      imagePath,
      accent: "red",
      status,
      isAdvertorial:
        advertorialInput.checked || affiliateLinks.length > 0,
      affiliateDisclosure:
        affiliateDisclosureInput.value.trim() ||
        (affiliateLinks.length > 0
          ? window.BOXING_CONFIG?.affiliate?.disclosure ||
            "この記事には配信サービスのアフィリエイトリンクが含まれています。"
          : ""),
      affiliateLinks,
      tweets: window.BoxingData.parseUrlList(
        tweetUrlsInput.value,
        window.BoxingData.isTweetUrl
      ),
      youtubeUrls: window.BoxingData.parseUrlList(
        youtubeUrlsInput.value,
        window.BoxingData.isYouTubeUrl
      ),
      instagramUrls: window.BoxingData.parseUrlList(
        instagramUrlsInput.value,
        window.BoxingData.isInstagramUrl
      ),
      publishedAt:
        status === "published"
          ? editingArticle?.publishedAt || new Date().toISOString()
          : editingArticle?.publishedAt || null
    };

    const oldImagePath = editingArticle?.imagePath || "";
    await window.BoxingData.saveArticle(article);
    if (oldImagePath && oldImagePath !== imagePath) {
      await window.BoxingData.removeArticleImage(oldImagePath).catch(() => {});
    }
    window.location.href = "admin.html";
  } catch (error) {
    if (uploaded) {
      await window.BoxingData.removeArticleImage(uploaded.path).catch(() => {});
    }
    window.alert(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.firstChild.textContent = editingArticle ? "変更を保存する" : "記事を保存する";
  }
});

function fillForm(article) {
  editingArticle = article;
  document.title = "記事を編集 | ボクシング速報";
  document.querySelector("#editor-heading").textContent = "記事を編集";
  document.querySelector(".draft-state").textContent =
    article.status === "published" ? "公開中" : "下書き";
  document.querySelector("#title").value = article.title;
  document.querySelector("#slug").value = article.slug;
  document.querySelector("#slug").dataset.edited = "true";
  document.querySelector("#body").value = article.body;
  document.querySelector("#status").value = article.status;
  advertorialInput.checked =
    article.isAdvertorial || article.affiliateLinks.length > 0;
  affiliateDisclosureInput.value = article.affiliateDisclosure;
  affiliateLinksInput.value = article.affiliateLinks
    .map((link) => `${link.label} | ${link.url}`)
    .join("\n");
  tweetUrlsInput.value = article.tweets.join("\n");
  youtubeUrlsInput.value = article.youtubeUrls.join("\n");
  instagramUrlsInput.value = article.instagramUrls.join("\n");
  if (article.image) {
    imageUrlInput.value = article.imagePath ? "" : article.image;
    setPreviewImage(article.image);
    imageStatus.textContent = "現在の記事画像";
  }
  submitButton.firstChild.textContent = "変更を保存する";
  updatePreview();
}

async function initialize() {
  if (!window.BoxingData.configured) {
    window.alert("Supabase設定が完了していません。");
    window.location.href = "admin.html";
    return;
  }
  const session = await window.BoxingData.getSession();
  if (!session || !(await window.BoxingData.isCurrentUserAdmin())) {
    window.location.href = "admin.html";
    return;
  }
  if (editingId) {
    const article = await window.BoxingData.findArticle(editingId, {
      includeDrafts: true
    });
    if (!article) throw new Error("編集する記事が見つかりません。");
    fillForm(article);
  } else {
    document.querySelector("#slug").value = window.BoxingData.createSlug("");
    updatePreview();
  }
}

initialize().catch((error) => {
  window.alert(error.message);
  window.location.href = "admin.html";
});
