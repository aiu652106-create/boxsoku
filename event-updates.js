(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const loginPanel = byId("event-login-panel");
  const dashboard = byId("event-dashboard");
  const loginForm = byId("event-login-form");
  const loginError = byId("event-login-error");
  const message = byId("event-message");
  let state = { sources: [], runs: [], candidates: [], articles: [] };

  function setMessage(text, isError = false) {
    message.textContent = text || "";
    message.classList.toggle("is-error", isError);
  }

  async function session() {
    const current = await window.BoxingData.getSession();
    if (!current?.access_token) throw new Error("ログインが必要です。");
    return current;
  }

  async function api(path, options = {}) {
    const current = await session();
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${current.access_token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || "処理に失敗しました。");
    }
    return payload;
  }

  function formatDate(value) {
    if (!value) return "未設定";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ja-JP");
  }

  function appendText(parent, tag, text, className = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text == null ? "" : String(text);
    parent.appendChild(element);
    return element;
  }

  function renderSources() {
    const list = byId("event-source-list");
    list.replaceChildren();
    state.sources.forEach((source) => {
      const card = document.createElement("article");
      card.className = "event-source-card";
      const heading = document.createElement("div");
      heading.className = "event-source-heading";
      appendText(heading, "h3", source.display_name);
      appendText(heading, "span", source.state || "unknown", `event-source-state event-state-${source.state || "unknown"}`);
      card.appendChild(heading);
      appendText(card, "p", `${source.source_key} / ${source.cadence} / 失敗連続 ${source.consecutive_failures || 0}回`);
      appendText(card, "p", `最終成功：${formatDate(source.last_success_at)}　次回：${formatDate(source.next_run_at)}`);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event-source-run";
      button.textContent = "今すぐ確認";
      button.disabled = ["stopped", "disabled", "running"].includes(source.state);
      button.addEventListener("click", () => runSource(source.source_key, button));
      card.appendChild(button);
      list.appendChild(card);
    });
  }

  function articleOptions(select, selected = "") {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "記事を選択（公開反映時は必須）";
    select.appendChild(empty);
    state.articles.forEach((article) => {
      const option = document.createElement("option");
      option.value = article.id;
      option.textContent = `${article.status === "published" ? "公開" : "下書き"}：${article.title}`;
      option.selected = article.id === selected;
      select.appendChild(option);
    });
  }

  function renderCandidate(candidate) {
    const card = document.createElement("article");
    card.className = "event-candidate-card";
    const data = candidate.normalized_data || {};
    const heading = document.createElement("div");
    heading.className = "event-candidate-heading";
    appendText(heading, "h3", data.event_name || "名称未確認");
    appendText(heading, "span", `${candidate.operation} / ${candidate.status}`, `event-candidate-status event-status-${candidate.status}`);
    card.appendChild(heading);
    appendText(card, "p", `${candidate.source_name}　${candidate.source_url}`);
    appendText(card, "p", `開催日：${data.event_date || "未確認"}　会場：${data.venue || data.location || "未確認"}　カード：${Array.isArray(data.bouts) ? data.bouts.length : 0}件`);
    if (Array.isArray(candidate.validation_errors) && candidate.validation_errors.length) {
      appendText(card, "p", `要確認：${candidate.validation_errors.join("、")}`, "event-validation-error");
    }
    const detail = document.createElement("details");
    appendText(detail, "summary", "抽出データを表示");
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    detail.appendChild(pre);
    card.appendChild(detail);

    if (["pending", "needs_review"].includes(candidate.status)) {
      const controls = document.createElement("div");
      controls.className = "event-candidate-controls";
      const select = document.createElement("select");
      select.setAttribute("aria-label", "反映する記事");
      articleOptions(select, candidate.matched_article_id || "");
      controls.appendChild(select);
      const eventInput = document.createElement("input");
      eventInput.type = "text";
      eventInput.inputMode = "text";
      eventInput.autocomplete = "off";
      eventInput.placeholder = "既存イベントID（任意）";
      eventInput.setAttribute("aria-label", "既存イベントID（任意）");
      eventInput.value = candidate.matched_event_id || "";
      controls.appendChild(eventInput);
      [
        ["approved", "承認（保存）"],
        ["published", "承認して公開"],
        ["approved_removal", "要確認を承認（反映）"],
        ["needs_review", "要確認"],
        ["rejected", "却下"]
      ].forEach(([action, label]) => {
        const button = document.createElement("button");
        button.type = "button";
       button.textContent = label;
       button.className = action === "rejected" ? "is-danger" : "";
       button.disabled = action === "published" && !select.value;
        select.addEventListener("change", () => {
          button.disabled = action === "published" && !select.value;
        });
       button.addEventListener("click", () => reviewCandidate(candidate.candidate_id, action, select.value, eventInput.value, button));
        controls.appendChild(button);
      });
      card.appendChild(controls);
    }
    return card;
  }

  function renderCandidates() {
    const list = byId("event-candidate-list");
    list.replaceChildren();
    byId("event-candidate-count").textContent = `${state.candidates.length}件`;
    byId("event-candidate-empty").hidden = state.candidates.length > 0;
    state.candidates.forEach((candidate) => list.appendChild(renderCandidate(candidate)));
  }

  function renderRuns() {
    const list = byId("event-run-list");
    list.replaceChildren();
    state.runs.slice(0, 30).forEach((run) => {
      const row = document.createElement("div");
      row.className = "event-run-row";
      appendText(row, "strong", run.source_key);
      appendText(row, "span", `${run.outcome} / HTTP ${run.http_status || "-"}`);
      appendText(row, "span", `${formatDate(run.fetched_at)} / 抽出 ${run.extracted_count || 0} / 候補 ${run.updated_count || 0}`);
      if (run.error_message) appendText(row, "small", run.error_message, "event-run-error");
      list.appendChild(row);
    });
  }

  async function refresh() {
    setMessage("読み込み中…");
    const payload = await api("/api/event-candidates");
    state = {
      sources: Array.isArray(payload.sources) ? payload.sources : [],
      runs: Array.isArray(payload.runs) ? payload.runs : [],
      candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
      articles: Array.isArray(payload.articles) ? payload.articles : []
    };
    renderSources();
    renderCandidates();
    renderRuns();
    setMessage("更新しました。");
  }

  async function runSource(sourceKey, button) {
    button.disabled = true;
    setMessage(`${sourceKey}を確認中…`);
    try {
      const payload = await api("/api/event-sync", {
        method: "POST",
        body: JSON.stringify({ sourceKey })
      });
      const needsReview = (payload.results || []).some(
        (result) => result.outcome === "needs_review"
      );
      setMessage(
        needsReview
          ? `${sourceKey}の取得結果を要確認として保存しました。`
          : `${sourceKey}の確認が完了しました。`
      );
      await refresh();
    } catch (error) {
      setMessage(error.message, true);
      button.disabled = false;
    }
  }

  async function reviewCandidate(candidateId, action, articleId, eventId, button) {
    button.disabled = true;
    setMessage("候補を処理中…");
    try {
      await api("/api/event-candidates", {
       method: "POST",
        body: JSON.stringify({ candidateId, action, articleId: articleId || null, eventId: eventId || null })
     });
      setMessage("候補を処理しました。");
      await refresh();
    } catch (error) {
      setMessage(error.message, true);
      button.disabled = false;
    }
  }

  async function showDashboard() {
    if (!(await window.BoxingData.isCurrentUserAdmin())) {
      throw new Error("このアカウントには管理者権限がありません。");
    }
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await refresh();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    byId("event-refresh").addEventListener("click", () => refresh().catch((error) => setMessage(error.message, true)));
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginError.textContent = "";
      try {
        await window.BoxingData.signIn(byId("event-login-email").value, byId("event-login-password").value);
        await showDashboard();
      } catch (error) {
        loginError.textContent = error.message;
      }
    });
    try {
      if (await window.BoxingData.getSession()) await showDashboard();
    } catch (error) {
      loginError.textContent = error.message;
    }
  });
})();
