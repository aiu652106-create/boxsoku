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
let previewMode = false;
const LOCAL_COMMENT_PREFIX = "boxing-comments:";

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = busy ? "処理中..." : label;
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
  const summary = document.createElement("p");
  summary.textContent = article.summary;
  info.append(status, title, summary);

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
  edit.textContent = "編集";
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

async function loadArticles(previewArticles = null) {
  const articles =
    previewArticles ||
    (await window.BoxingData.getArticles({
      includeDrafts: true,
      force: true
    }));
  articleList.replaceChildren(...articles.map(createArticleRow));
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
  await Promise.all([loadArticles(), loadComments()]);
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

async function initialize() {
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
      loadComments()
    ]);
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
