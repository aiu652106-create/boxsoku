const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const articleList = document.querySelector("#admin-article-list");
const emptyState = document.querySelector("#admin-empty");
const logoutButton = document.querySelector("#logout-button");
const setupNotice = document.querySelector("#admin-setup-notice");
const previewNotice = document.querySelector("#admin-preview-notice");
const commentList = document.querySelector("#admin-comment-list");
const commentEmpty = document.querySelector("#admin-comment-empty");
const affiliateReportContent = document.querySelector("#affiliate-report-content");
const affiliateReportEmpty = document.querySelector("#affiliate-report-empty");
const affiliateReportStatus = document.querySelector("#affiliate-report-status");
const siteSettingsForm = document.querySelector("#site-settings-form");
const siteIconUrlInput = document.querySelector("#site-icon-url");
const siteIconFileInput = document.querySelector("#site-icon-file");
const siteIconPreview = document.querySelector("#site-icon-preview");
const siteSettingsStatus = document.querySelector("#site-settings-status");
const siteSettingsMessage = document.querySelector("#site-settings-message");
const siteSettingsSave = document.querySelector("#site-settings-save");
const ownerTrafficExclusion = document.querySelector("#owner-traffic-exclusion");
const ownerTrafficStatus = document.querySelector("#owner-traffic-status");
const ownerTrafficMessage = document.querySelector("#owner-traffic-message");
let previewMode = false;
const LOCAL_COMMENT_PREFIX = "boxing-comments:";
const OWNER_TRAFFIC_COOKIE = "boxsoku_owner_traffic";

function hasOwnerTrafficExclusion() {
  return document.cookie.split(";").some((item) => {
    const [name, value] = item.trim().split("=");
    return name === OWNER_TRAFFIC_COOKIE && value === "1";
  });
}

function setOwnerTrafficExclusion(enabled) {
  const maxAge = enabled ? 60 * 60 * 24 * 365 : 0;
  document.cookie = `${OWNER_TRAFFIC_COOKIE}=${enabled ? "1" : "0"}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
}

function syncOwnerTrafficExclusion(message = "") {
  const enabled = hasOwnerTrafficExclusion();
  ownerTrafficExclusion.checked = enabled;
  ownerTrafficStatus.textContent = enabled ? "有効" : "無効";
  ownerTrafficMessage.textContent =
    message ||
    (enabled
      ? "このブラウザは収集対象から除外されています。"
      : "自分でサイトを確認するときは除外を有効にしてください。");
}

const distributionRules = [
  { label: "WOWOW", pattern: /WOWOW|wowowライブ/i },
  { label: "U-NEXT", pattern: /U-?NEXT|ユーネクスト/i },
  { label: "ABEMA", pattern: /ABEMA|アベマ/i },
  { label: "DAZN", pattern: /DAZN/i },
  { label: "Amazon Prime Video", pattern: /Amazon\s*Prime|アマゾンプライム|アマプラ/i }
];

function articleDistributionSite(article) {
  const affiliateLinks = Array.isArray(article.affiliateLinks)
    ? article.affiliateLinks
    : [];
  const source = [
    article.title,
    article.summary,
    article.body,
    ...affiliateLinks.flatMap((item) => [item?.label, item?.url])
  ]
    .filter(Boolean)
    .join("\n");
  const matched = distributionRules
    .filter((rule) => rule.pattern.test(source))
    .map((rule) => rule.label);

  if (matched.length) return matched.join(" / ");

  const hosts = affiliateLinks
    .map((item) => {
      try {
        return new URL(item?.url || "").hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  return hosts.length ? hosts.join(" / ") : "配信サイト未設定";
}

function distributionSiteOrder(label) {
  const priority = [
    "WOWOW",
    "U-NEXT",
    "ABEMA",
    "DAZN",
    "Amazon Prime Video",
    "配信サイト未設定"
  ];
  const index = priority.indexOf(label);
  return index === -1 ? priority.length - 1 : index;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = busy ? "処理中..." : label;
}

function setSiteIconPreview(url) {
  const value = String(url || "").trim();
  if (!value) {
    siteIconPreview.removeAttribute("src");
    siteIconPreview.hidden = true;
    return;
  }
  siteIconPreview.src = value;
  siteIconPreview.hidden = false;
}

function setSiteSettingsMessage(message, isError = false) {
  siteSettingsMessage.textContent = message || "";
  siteSettingsMessage.classList.toggle("is-error", isError);
}

function setSiteSettingsDisabled(disabled) {
  siteSettingsForm
    .querySelectorAll("input, button")
    .forEach((element) => {
      element.disabled = disabled;
    });
}

async function loadSiteSettings() {
  const settings = await window.BoxingData.getSiteSettings();
  siteIconUrlInput.value = settings.siteIconUrl || "";
  setSiteIconPreview(settings.siteIconUrl);
  siteSettingsStatus.textContent = "読み込み済み";
}

function createArticleRow(article) {
  const row = document.createElement("article");
  row.className = "admin-article-row";

  const info = document.createElement("div");
  info.className = "admin-article-info";
  const status = document.createElement("div");
  status.className = "admin-article-status";
  const badge = document.createElement("span");
  badge.textContent = article.status === "published" ? "公開中" : "下書き";
  if (article.status !== "published") badge.classList.add("is-draft");
  const time = document.createElement("time");
  time.textContent = window.BoxingData.articleDate(article);
  status.append(badge, time);
  const title = document.createElement("h3");
  title.textContent = article.title;
  const distribution = document.createElement("p");
  distribution.className = "admin-article-distribution";
  distribution.textContent = `配信：${articleDistributionSite(article)}`;
  const fightCardCount = document.createElement("p");
  fightCardCount.className = "admin-article-fight-count";
  fightCardCount.textContent = article.fightCards?.length
    ? `対戦カード ${article.fightCards.length}件`
    : "対戦カードなし";
  const viewCount = document.createElement("p");
  const uniqueViewCount = document.createElement("p");
  uniqueViewCount.className = "admin-article-unique-view-count";
  uniqueViewCount.textContent =
    article.uniqueViewCount == null
      ? "ユニーク訪問者 未設定"
      : `ユニーク訪問者 ${Number(article.uniqueViewCount).toLocaleString("ja-JP")}人`;
  viewCount.className = "admin-article-view-count";
  viewCount.textContent = `閲覧数 ${Number(article.viewCount || 0).toLocaleString("ja-JP")} PV`;
  info.append(status, title, distribution, fightCardCount, viewCount, uniqueViewCount);

  const actions = document.createElement("div");
  actions.className = "admin-article-actions";

  if (previewMode) {
    const preview = document.createElement("span");
    preview.className = "admin-preview-action";
    preview.textContent = "確認用";
    actions.appendChild(preview);
    row.append(info, actions);
    return row;
  }

  const edit = document.createElement("a");
  edit.href = `editor.html?id=${encodeURIComponent(article.id)}`;
  edit.textContent = "記事・対戦カードを編集";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "削除";
  remove.addEventListener("click", async () => {
    if (!window.confirm(`「${article.title}」を削除しますか？`)) return;
    setBusy(remove, true, "削除");
    try {
      await window.BoxingData.deleteArticle(article);
      await loadArticles();
    } catch (error) {
      window.alert(error.message);
      setBusy(remove, false, "削除");
    }
  });
  if (article.status === "published") {
    const view = document.createElement("a");
    view.href = window.BoxingData.articleUrl(article);
    view.target = "_blank";
    view.rel = "noopener";
    view.textContent = "表示";
    actions.appendChild(view);
  }
  actions.append(edit, remove);
  row.append(info, actions);
  return row;
}

function renderArticleGroups(articles) {
  const groups = new Map();
  articles.forEach((article) => {
    const label = articleDistributionSite(article);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(article);
  });

  const orderedGroups = [...groups.entries()].sort(
    ([first], [second]) =>
      distributionSiteOrder(first) - distributionSiteOrder(second) ||
      first.localeCompare(second, "ja")
  );
  articleList.replaceChildren(
    ...orderedGroups.map(([label, groupArticles]) => {
      const section = document.createElement("section");
      section.className = "admin-article-group";
      const heading = document.createElement("div");
      heading.className = "admin-article-group-heading";
      const title = document.createElement("h3");
      title.textContent = label;
      const count = document.createElement("span");
      count.textContent = `${groupArticles.length}件`;
      heading.append(title, count);
      section.append(heading, ...groupArticles.map(createArticleRow));
      return section;
    })
  );
}

async function loadArticles(previewArticles = null) {
  const articles =
    previewArticles ||
    (await window.BoxingData.getArticles({
      includeDrafts: true,
      force: true
    }));
  renderArticleGroups(articles);
  document.querySelector("#published-count").textContent = String(
    articles.filter((article) => article.status === "published").length
  );
  document.querySelector("#draft-count").textContent = String(
    articles.filter((article) => article.status === "draft").length
  );
  document.querySelector("#admin-list-count").textContent = `${articles.length}件`;
  emptyState.hidden = articles.length > 0;
}

function formatCommentDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function createCommentRow(comment) {
  const row = document.createElement("article");
  row.className = "admin-comment-row";

  const meta = document.createElement("div");
  meta.className = "admin-comment-meta";
  const article = document.createElement("strong");
  article.textContent = comment.articleTitle;
  const author = document.createElement("span");
  author.textContent = `名前：${comment.displayName} / ID：${comment.visitorId}`;
  const time = document.createElement("time");
  time.dateTime = comment.createdAt;
  time.textContent = formatCommentDate(comment.createdAt);
  meta.append(article, author, time);

  const body = document.createElement("p");
  body.className = "admin-comment-body";
  body.textContent = comment.body;

  const actions = document.createElement("div");
  actions.className = "admin-comment-actions";
  if (comment.articleSlug) {
    const view = document.createElement("a");
    view.href = `article.html?slug=${encodeURIComponent(comment.articleSlug)}`;
    view.target = "_blank";
    view.rel = "noopener";
    view.textContent = "記事を見る";
    actions.appendChild(view);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "コメントを削除";
  remove.addEventListener("click", async () => {
    if (!window.confirm(`「${comment.displayName}」のコメントを削除しますか？`)) {
      return;
    }
    setBusy(remove, true, "コメントを削除");
    try {
      if (previewMode) {
        const stored = JSON.parse(
          localStorage.getItem(comment.storageKey) || "[]"
        );
        const remaining = Array.isArray(stored)
          ? stored.filter((item) => String(item.id) !== String(comment.id))
          : [];
        if (remaining.length) {
          localStorage.setItem(comment.storageKey, JSON.stringify(remaining));
        } else {
          localStorage.removeItem(comment.storageKey);
        }
        await loadComments();
      } else {
        await window.BoxingData.deleteComment(comment.id);
        await loadComments();
      }
    } catch (error) {
      window.alert(error.message);
      setBusy(remove, false, "コメントを削除");
    }
  });
  actions.appendChild(remove);
  row.append(meta, body, actions);
  return row;
}

function renderComments(comments) {
  commentList.replaceChildren(...comments.map(createCommentRow));
  document.querySelector("#comment-count").textContent = String(comments.length);
  document.querySelector("#admin-comment-count").textContent =
    `${comments.length}件`;
  commentEmpty.hidden = comments.length > 0;
}

async function loadComments(previewItems = null) {
  const comments =
    previewItems ||
    (previewMode
      ? getLocalAdminComments()
      : await window.BoxingData.getAdminComments());
  renderComments(comments);
}

async function loadVisitStats() {
  const todayElement = document.querySelector("#today-visitor-count");
  const monthElement = document.querySelector("#month-visitor-count");
  if (previewMode) {
    todayElement.textContent = "未設定";
    monthElement.textContent = "未設定";
    return;
  }
  const stats = await window.BoxingData.getAdminVisitStats();
  todayElement.textContent =
    stats == null ? "未設定" : stats.today.toLocaleString("ja-JP");
  monthElement.textContent =
    stats == null ? "未設定" : stats.month.toLocaleString("ja-JP");
}

function getLocalAdminComments() {
  const articleMap = new Map(
    window.BoxingData.sampleArticles.map((article) => [article.slug, article])
  );
  const comments = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const storageKey = localStorage.key(index);
    if (!storageKey?.startsWith(LOCAL_COMMENT_PREFIX)) continue;

    const articleSlug = storageKey.slice(LOCAL_COMMENT_PREFIX.length);
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      stored = [];
    }
    if (!Array.isArray(stored)) continue;

    const article = articleMap.get(articleSlug);
    stored.forEach((comment) => {
      comments.push({
        ...comment,
        storageKey,
        articleSlug,
        articleTitle: article?.title || articleSlug
      });
    });
  }

  return comments.sort(
    (first, second) =>
      new Date(second.createdAt || 0).getTime() -
      new Date(first.createdAt || 0).getTime()
  );
}

async function showDashboard() {
  const isAdmin = await window.BoxingData.isCurrentUserAdmin();
  if (!isAdmin) {
    await window.BoxingData.signOut().catch(() => {});
    loginPanel.hidden = false;
    dashboard.hidden = true;
    loginError.textContent = "このアカウントには管理者権限がありません。";
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  setSiteSettingsDisabled(false);
  await Promise.all([
    loadArticles(),
    loadComments(),
    loadVisitStats(),
    loadAffiliateStats(),
    loadSiteSettings()
  ]);
}

const affiliateServiceLabels = {
  a8: "A8.net",
  amazon: "Amazon / Prime Video",
  lemino: "Lemino",
  rakuten: "楽天市場",
  wowow: "WOWOW"
};

const affiliatePlacementLabels = {
  "article-body": "記事本文",
  "article-bottom-banner": "記事下バナー",
  "article-product": "商品カード",
  "article-streaming-links": "配信リンク欄",
  "article-top-text": "記事上部テキスト",
  "listing-card": "記事一覧カード"
};

function createAffiliateReportGroup(titleText, rows, renderRow) {
  const section = document.createElement("section");
  const title = document.createElement("h3");
  title.textContent = titleText;
  const list = document.createElement("ol");
  rows.forEach((row, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "admin-affiliate-rank";
    rank.textContent = String(index + 1);
    const content = renderRow(row);
    item.append(rank, content);
    list.appendChild(item);
  });
  section.append(title, list);
  return section;
}

function renderAffiliateStats(stats) {
  const clickElement = document.querySelector("#affiliate-click-count");
  const visitorElement = document.querySelector("#affiliate-visitor-count");
  affiliateReportContent.replaceChildren();

  if (stats == null) {
    clickElement.textContent = "未設定";
    visitorElement.textContent = "未設定";
    affiliateReportStatus.textContent = "DB設定待ち";
    affiliateReportEmpty.textContent = "収益導線の集計テーブルが未設定です。";
    affiliateReportEmpty.hidden = false;
    return;
  }

  clickElement.textContent = stats.clicks.toLocaleString("ja-JP");
  visitorElement.textContent = stats.uniqueVisitors.toLocaleString("ja-JP");
  affiliateReportStatus.textContent = `${stats.clicks.toLocaleString("ja-JP")}クリック`;
  affiliateReportEmpty.textContent = "まだ収益リンクのクリックはありません。";
  affiliateReportEmpty.hidden = stats.clicks > 0;
  if (!stats.clicks) return;

  const services = createAffiliateReportGroup(
    "サービス別",
    stats.services,
    (row) => {
      const wrapper = document.createElement("div");
      const label = document.createElement("strong");
      label.textContent = affiliateServiceLabels[row.service] || row.service;
      const value = document.createElement("span");
      value.textContent = `${row.clicks.toLocaleString("ja-JP")}クリック・${row.uniqueVisitors.toLocaleString("ja-JP")}人`;
      wrapper.append(label, value);
      return wrapper;
    }
  );
  const pages = createAffiliateReportGroup("クリックされたページ", stats.pages, (row) => {
    const wrapper = document.createElement("div");
    const link = document.createElement("a");
    link.href = row.pagePath;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = row.pagePath;
    const value = document.createElement("span");
    value.textContent = `${row.clicks.toLocaleString("ja-JP")}クリック`;
    wrapper.append(link, value);
    return wrapper;
  });
  const placements = createAffiliateReportGroup(
    "掲載位置別",
    stats.placements,
    (row) => {
      const wrapper = document.createElement("div");
      const label = document.createElement("strong");
      label.textContent = affiliatePlacementLabels[row.placement] || row.placement;
      const value = document.createElement("span");
      value.textContent = `${row.clicks.toLocaleString("ja-JP")}クリック`;
      wrapper.append(label, value);
      return wrapper;
    }
  );
  affiliateReportContent.append(services, pages, placements);
}

async function loadAffiliateStats() {
  if (previewMode) {
    renderAffiliateStats(null);
    return;
  }
  renderAffiliateStats(await window.BoxingData.getAdminAffiliateStats(30));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  loginError.textContent = "";
  setBusy(button, true, "ログイン");
  try {
    await window.BoxingData.signIn(
      document.querySelector("#login-email").value,
      document.querySelector("#login-password").value
    );
    await showDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    setBusy(button, false, "ログイン");
  }
});

logoutButton.addEventListener("click", async () => {
  await window.BoxingData.signOut();
  dashboard.hidden = true;
  loginPanel.hidden = false;
});

ownerTrafficExclusion.addEventListener("change", () => {
  setOwnerTrafficExclusion(ownerTrafficExclusion.checked);
  syncOwnerTrafficExclusion(
    ownerTrafficExclusion.checked
      ? "除外を有効にしました。このブラウザの新しいアクセスは集計されません。"
      : "除外を解除しました。次回のアクセスから集計対象になります。"
  );
});

siteIconFileInput.addEventListener("change", () => {
  const file = siteIconFileInput.files?.[0];
  if (file) setSiteIconPreview(URL.createObjectURL(file));
});

siteSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSiteSettingsMessage("");
  setBusy(siteSettingsSave, true, "設定を保存");
  let uploadedImage = null;

  try {
    const file = siteIconFileInput.files?.[0];
    let iconUrl = siteIconUrlInput.value.trim();

    if (file) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("PNG・JPEG・WebPのみアップロードできます。");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("画像は5MB以内にしてください。");
      }
      const user = await window.BoxingData.getCurrentUser();
      if (!user?.id) throw new Error("ログイン状態を確認できません。");
      uploadedImage = await window.BoxingData.uploadArticleImage(file, user.id);
      iconUrl = uploadedImage.url;
      siteIconUrlInput.value = iconUrl;
    }

    const saved = await window.BoxingData.saveSiteSettings({
      siteIconUrl: iconUrl
    });
    setSiteIconPreview(saved.siteIconUrl);
    siteIconFileInput.value = "";
    siteSettingsStatus.textContent = "保存済み";
    setSiteSettingsMessage("サイトアイコンを保存しました。");
  } catch (error) {
    if (uploadedImage?.path) {
      await window.BoxingData.removeArticleImage(uploadedImage.path).catch(() => {});
    }
    setSiteSettingsMessage(error.message || "保存に失敗しました。", true);
  } finally {
    setBusy(siteSettingsSave, false, "設定を保存");
  }
});

async function initialize() {
  syncOwnerTrafficExclusion();
  if (!window.BoxingData.configured) {
    previewMode = true;
    loginPanel.hidden = true;
    dashboard.hidden = false;
    previewNotice.hidden = false;
    logoutButton.hidden = true;
    ["#sidebar-new-article", "#new-article-button"].forEach((selector) => {
      const link = document.querySelector(selector);
      link.removeAttribute("href");
      link.classList.add("is-disabled");
      link.setAttribute("aria-disabled", "true");
    });
    await Promise.all([
      loadArticles(window.BoxingData.sampleArticles),
      loadComments(),
      loadVisitStats(),
      loadAffiliateStats(),
      loadSiteSettings()
    ]);
    setSiteSettingsDisabled(true);
    setSiteSettingsMessage("Supabase接続後に保存できます。");
    return;
  }

  const session = await window.BoxingData.getSession();
  if (session) {
    await showDashboard();
  }
}

initialize().catch((error) => {
  loginError.textContent = error.message;
});
