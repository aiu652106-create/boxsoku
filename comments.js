(function () {
  "use strict";

  const DEFAULT_NAME = "ボクシング名無し";
  const MAX_NAME_LENGTH = 24;
  const MAX_COMMENT_LENGTH = 1000;
  const LOCAL_KEY_PREFIX = "boxing-comments:";
  const NAME_KEY = "boxing-comment-name";
  const VISITOR_KEY = "boxing-comment-visitor";

  function isLocalPreview() {
    return (
      window.location.protocol === "file:" ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
    );
  }

  function localKey(article) {
    return `${LOCAL_KEY_PREFIX}${article.slug || article.id}`;
  }

  function getLocalComments(article) {
    try {
      const comments = JSON.parse(localStorage.getItem(localKey(article)) || "[]");
      return Array.isArray(comments) ? comments : [];
    } catch {
      return [];
    }
  }

  function saveLocalComments(article, comments) {
    localStorage.setItem(localKey(article), JSON.stringify(comments));
  }

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID().replaceAll("-", "").slice(0, 9);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value));
  }

  async function parseResponse(response) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("コメント機能から正しい応答がありません。");
    }
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || "コメントの処理に失敗しました。");
    }
    return payload;
  }

  async function getComments(article) {
    if (isLocalPreview() || article.isSample) {
      return { comments: getLocalComments(article), local: true };
    }
    const response = await fetch(
      `/api/comments?article=${encodeURIComponent(article.id)}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }
    );
    return parseResponse(response);
  }

  async function postComment(article, input) {
    if (isLocalPreview() || article.isSample) {
      const comments = getLocalComments(article);
      const comment = {
        id: crypto.randomUUID(),
        number: comments.length + 1,
        displayName: input.name,
        body: input.body,
        visitorId: getVisitorId(),
        createdAt: new Date().toISOString()
      };
      comments.push(comment);
      saveLocalComments(article, comments);
      return { comments, comment, local: true };
    }

    const response = await fetch("/api/comments", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        articleId: article.id,
        name: input.name,
        body: input.body,
        website: input.website
      })
    });
    return parseResponse(response);
  }

  function appendCommentBody(element, value) {
    const pattern = /([※＊*米])([0-9０-９]+)/g;
    let cursor = 0;

    for (const match of value.matchAll(pattern)) {
      const index = match.index || 0;
      element.append(document.createTextNode(value.slice(cursor, index)));
      const number = match[2].replace(/[０-９]/g, (digit) =>
        String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
      );
      const link = document.createElement("a");
      link.href = `#comment-${number}`;
      link.textContent = match[0];
      element.appendChild(link);
      cursor = index + match[0].length;
    }

    element.append(document.createTextNode(value.slice(cursor)));
  }

  function createCommentElement(comment, index) {
    const number = Number(comment.number || index + 1);
    const item = document.createElement("li");
    item.id = `comment-${number}`;
    item.className = "retro-comment";

    const info = document.createElement("p");
    info.className = "retro-comment-info";

    const reply = document.createElement("button");
    reply.type = "button";
    reply.dataset.replyNumber = String(number);
    reply.title = `${number}番へ返信`;
    reply.textContent = String(number);

    const author = document.createElement("strong");
    author.textContent = comment.displayName;

    const date = document.createElement("time");
    date.dateTime = comment.createdAt;
    date.textContent = formatDate(comment.createdAt);

    const visitor = document.createElement("span");
    visitor.textContent = `ID：${comment.visitorId}`;

    info.append(
      reply,
      document.createTextNode(" 名前："),
      author,
      date,
      visitor
    );

    const body = document.createElement("div");
    body.className = "retro-comment-body";
    appendCommentBody(body, comment.body);
    item.append(info, body);
    return item;
  }

  function createSection() {
    const section = document.createElement("section");
    section.className = "retro-comments";
    section.innerHTML = `
      <section class="retro-comment-panel">
        <h2>コメント一覧 <span class="retro-comment-count">（0件）</span></h2>
        <p class="retro-comment-status" role="status" aria-live="polite"></p>
        <ol class="retro-comment-list">
          <li class="retro-comment-empty">コメントを読み込んでいます...</li>
        </ol>
      </section>
      <section class="retro-comment-panel">
        <h2>コメントする</h2>
        <form class="retro-comment-form">
          <label for="comment-name">名前</label>
          <input
            id="comment-name"
            name="name"
            type="text"
            maxlength="${MAX_NAME_LENGTH}"
            required
          >
          <span aria-hidden="true"></span>
          <label class="retro-comment-memory">
            <input name="remember" type="checkbox">
            情報を記憶
          </label>
          <label for="comment-body">コメント</label>
          <textarea
            id="comment-body"
            name="body"
            maxlength="${MAX_COMMENT_LENGTH}"
            required
          ></textarea>
          <label class="retro-comment-trap" aria-hidden="true">
            ウェブサイト
            <input name="website" type="text" tabindex="-1" autocomplete="off">
          </label>
          <span aria-hidden="true"></span>
          <button type="submit">投稿する</button>
        </form>
      </section>
    `;
    return section;
  }

  function renderComments(section, comments) {
    const list = section.querySelector(".retro-comment-list");
    const count = section.querySelector(".retro-comment-count");
    count.textContent = `（${comments.length}件）`;
    list.replaceChildren();

    if (!comments.length) {
      const empty = document.createElement("li");
      empty.className = "retro-comment-empty";
      empty.textContent = "まだコメントはありません。";
      list.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    comments.forEach((comment, index) => {
      fragment.appendChild(createCommentElement(comment, index));
    });
    list.appendChild(fragment);
  }

  function insertReply(section, number) {
    const textarea = section.querySelector('textarea[name="body"]');
    const text = `※${number}\n`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value =
      textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    section.querySelector(".retro-comment-form").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  async function mount(target, article) {
    if (!target || !article?.id || target.dataset.commentsMounted === "true") return;
    target.dataset.commentsMounted = "true";

    const section = createSection();
    const form = section.querySelector(".retro-comment-form");
    const status = section.querySelector(".retro-comment-status");
    const nameInput = form.elements.name;
    const remember = form.elements.remember;
    const savedName = localStorage.getItem(NAME_KEY);

    nameInput.value = savedName || DEFAULT_NAME;
    remember.checked = Boolean(savedName);
    target.appendChild(section);

    section.addEventListener("click", (event) => {
      const reply = event.target.closest("[data-reply-number]");
      if (reply) insertReply(section, reply.dataset.replyNumber);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const name = String(form.elements.name.value || "").trim();
      const body = String(form.elements.body.value || "").trim();

      if (!name || !body) {
        status.textContent = "名前とコメントを入力してください。";
        return;
      }

      button.disabled = true;
      status.textContent = "投稿しています...";
      try {
        const result = await postComment(article, {
          name: name.slice(0, MAX_NAME_LENGTH),
          body: body.slice(0, MAX_COMMENT_LENGTH),
          website: String(form.elements.website.value || "")
        });
        if (remember.checked) localStorage.setItem(NAME_KEY, name);
        else localStorage.removeItem(NAME_KEY);
        form.elements.body.value = "";
        renderComments(section, result.comments || []);
        status.textContent = result.local
          ? "プレビュー用コメントを保存しました。"
          : "コメントを投稿しました。";
        section
          .querySelector(`#comment-${result.comment?.number || ""}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    try {
      const result = await getComments(article);
      renderComments(section, result.comments || []);
      status.textContent = result.local
        ? "プレビューではコメントをこの端末に保存します。"
        : "";
    } catch (error) {
      status.textContent = error.message;
      section.querySelector(".retro-comment-list").replaceChildren();
    }
  }

  function autoMount() {
    document.querySelectorAll("[data-comment-article-id]").forEach((target) => {
      mount(target, {
        id: target.dataset.commentArticleId,
        slug: target.dataset.commentArticleSlug || target.dataset.commentArticleId
      });
    });
  }

  window.BoxingComments = { mount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})();
