(function () {
  "use strict";

  const state = { candidates: [], reports: [], session: null };
  const categoryLabels = {
    fight_result: "試合結果",
    ranking: "ランキング",
    title: "タイトル",
    status: "現役・引退",
    gym: "所属変更",
    profile: "プロフィール",
    next_fight: "次戦",
    user_report: "ユーザー報告",
    other: "その他"
  };
  const statusLabels = {
    pending: "未確認",
    approved: "承認済み",
    rejected: "却下",
    needs_review: "保留・要確認"
  };
  const reportStatusLabels = {
    pending: "未対応",
    reviewing: "確認中",
    resolved: "修正済み",
    rejected: "却下"
  };

  const byId = (id) => document.getElementById(id);
  const client = () => window.BoxingData?.client;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function valueText(value) {
    if (value === null || value === undefined || value === "") return "不明";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  }

  function boxerOf(item) {
    return item?.boxers || {};
  }

  function candidateName(item) {
    return boxerOf(item).name_ja || item.fighter_id;
  }

  function candidateMatches(item) {
    const statusFilter = byId("review-status-filter").value;
    const categoryFilter = byId("review-category-filter").value;
    const sourceFilter = byId("review-source-filter").value;
    const search = String(byId("review-search").value || "").trim().toLocaleLowerCase("ja-JP");
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (sourceFilter !== "all" && item.source_name !== sourceFilter) return false;
    if (!search) return true;
    const source = [
      candidateName(item),
      item.field_name,
      categoryLabels[item.category],
      item.source_name,
      item.source_url,
      valueText(item.current_value),
      valueText(item.proposed_value)
    ].join(" ").toLocaleLowerCase("ja-JP");
    return source.includes(search);
  }

  function detectedText(value) {
    if (!value) return "不明";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "不明";
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function sourceHtml(item) {
    const url = safeUrl(item.source_url);
    const name = escapeHtml(item.source_name || "出典");
    return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name;
  }

  function setStatus(message, isError = false) {
    const element = byId("review-status");
    element.textContent = message || "";
    element.classList.toggle("is-error", isError);
  }

  function renderSummary() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = state.candidates.filter((item) => new Date(item.detected_at).getTime() >= start.getTime());
    const pending = state.candidates.filter((item) => ["pending", "needs_review"].includes(item.status));
    const count = (category) => today.filter((item) => item.category === category).length;
    byId("review-pending-count").textContent = String(pending.length);
    byId("review-fight-count").textContent = String(count("fight_result"));
    byId("review-ranking-count").textContent = String(count("ranking"));
    byId("review-title-count").textContent = String(count("title"));
    byId("review-profile-count").textContent = String(
      ["status", "gym", "profile", "next_fight", "other"].reduce((sum, category) => sum + count(category), 0)
    );
    byId("review-report-count").textContent = String(count("user_report"));
    byId("review-user-report-count").textContent = `${state.reports.length}件`;
  }

  function renderSourceFilter() {
    const select = byId("review-source-filter");
    const selected = select.value;
    const sources = [...new Set(state.candidates.map((item) => item.source_name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ja")
    );
    select.innerHTML = `<option value="all">すべて</option>${sources
      .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
      .join("")}`;
    if (sources.includes(selected)) select.value = selected;
  }

  function renderCandidates() {
    const list = byId("review-candidate-list");
    const filtered = state.candidates.filter(candidateMatches);
    byId("review-result-count").textContent = `${filtered.length}件`;
    byId("review-candidate-empty").hidden = filtered.length !== 0;
    list.innerHTML = filtered.map((item) => {
      const boxer = boxerOf(item);
      const report = item.report_id ? "（ユーザー報告から作成）" : "";
      return `<article class="review-candidate-card" data-candidate-id="${escapeHtml(item.candidate_id)}">
        <header><label class="review-select"><input type="checkbox" data-candidate-check value="${escapeHtml(item.candidate_id)}" /><span>選択</span></label><div><span class="review-badge">${escapeHtml(statusLabels[item.status] || item.status)}</span><span class="review-category">${escapeHtml(categoryLabels[item.category] || item.category)}</span></div></header>
        <h3>${boxer.slug ? `<a href="/boxer/${encodeURIComponent(boxer.slug)}" target="_blank" rel="noopener">${escapeHtml(candidateName(item))}</a>` : escapeHtml(candidateName(item))}</h3>
        <p class="review-field-name">項目：${escapeHtml(item.field_name)} ${escapeHtml(report)}</p>
        <dl class="review-value-diff"><div><dt>現在表示</dt><dd>${escapeHtml(valueText(item.current_value))}</dd></div><div><dt>変更候補</dt><dd>${escapeHtml(valueText(item.proposed_value))}</dd></div></dl>
        <p class="review-source">情報源：${sourceHtml(item)}<br>情報源日付：${escapeHtml(item.source_date || "不明")} ／ 検出日時：${escapeHtml(detectedText(item.detected_at))}${item.confidence === null || item.confidence === undefined ? "" : ` ／ 信頼度：${escapeHtml(item.confidence)}`}</p>
        <div class="review-actions"><button type="button" data-candidate-action="approved">承認</button><button type="button" data-candidate-action="needs_review">保留</button><button type="button" data-candidate-action="rejected" class="review-danger">却下</button></div>
      </article>`;
    }).join("");
  }

  function renderReports() {
    const list = byId("review-report-list");
    byId("review-report-empty").hidden = state.reports.length !== 0;
    list.innerHTML = state.reports.map((report) => {
      const boxer = boxerOf(report);
      const evidence = safeUrl(report.evidence_url);
      return `<article class="review-report-card" data-report-id="${escapeHtml(report.report_id)}">
        <header><span class="review-badge">${escapeHtml(reportStatusLabels[report.status] || report.status)}</span><time>${escapeHtml(detectedText(report.submitted_at))}</time></header>
        <h3>${boxer.slug ? `<a href="/boxer/${encodeURIComponent(boxer.slug)}" target="_blank" rel="noopener">${escapeHtml(candidateName(report))}</a>` : escapeHtml(candidateName(report))}</h3>
        <p>指摘項目：${escapeHtml(report.field_name)}</p>
        <dl class="review-value-diff"><div><dt>現在表示</dt><dd>${escapeHtml(report.current_value)}</dd></div><div><dt>変更候補</dt><dd>${escapeHtml(report.proposed_value)}</dd></div></dl>
        <p>${escapeHtml(report.comment || "補足コメントなし")}</p>
        <p>根拠URL：${evidence ? `<a href="${escapeHtml(evidence)}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.evidence_url)}</a>` : escapeHtml(report.evidence_url)}</p>
        <div class="review-actions"><button type="button" data-report-action="reviewing">確認中</button><button type="button" data-report-action="resolved">修正済み</button><button type="button" data-report-action="rejected" class="review-danger">却下</button></div>
      </article>`;
    }).join("");
  }

  async function loadData() {
    const [candidateResult, reportResult] = await Promise.all([
      client().from("update_candidates").select("*, boxers(name_ja, slug)").order("detected_at", { ascending: false }),
      client().from("boxer_reports").select("*, boxers(name_ja, slug)").order("submitted_at", { ascending: false })
    ]);
    if (candidateResult.error) throw candidateResult.error;
    if (reportResult.error) throw reportResult.error;
    state.candidates = candidateResult.data || [];
    state.reports = reportResult.data || [];
    renderSourceFilter();
    renderSummary();
    renderCandidates();
    renderReports();
  }

  async function reviewCandidate(candidateId, action) {
    const result = await client().rpc("review_update_candidate", {
      p_candidate_id: candidateId,
      p_action: action,
      p_review_note: null
    });
    if (result.error) throw result.error;
  }

  async function reviewMany(ids, action) {
    if (!ids.length) {
      setStatus("候補を選択してください。", true);
      return;
    }
    const label = action === "approved" ? "承認" : action === "rejected" ? "却下" : "保留";
    if (!window.confirm(`${ids.length}件を${label}しますか？`)) return;
    setStatus(`${label}処理中…`);
    try {
      for (const id of ids) await reviewCandidate(id, action);
      await loadData();
      setStatus(`${ids.length}件を${label}しました。`);
    } catch (error) {
      setStatus(error.message || `${label}に失敗しました。`, true);
    }
  }

  async function updateReport(reportId, status) {
    setStatus("報告状態を更新中…");
    const result = await client().from("boxer_reports").update({
      status,
      reviewed_by: state.session.user.id,
      reviewed_at: new Date().toISOString()
    }).eq("report_id", reportId);
    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }
    await loadData();
    setStatus("報告状態を更新しました。");
  }

  async function copyPending() {
    const pending = state.candidates.filter((item) => ["pending", "needs_review"].includes(item.status));
    if (!pending.length) {
      setStatus("未確認の候補はありません。", true);
      return;
    }
    const text = pending.map((item) => [
      `選手：${candidateName(item)}`,
      `項目：${item.field_name}`,
      `現在表示：${valueText(item.current_value)}`,
      `変更候補：${valueText(item.proposed_value)}`,
      `情報源：${item.source_name}`,
      `情報源URL：${item.source_url}`,
      `情報源日付：${item.source_date || "不明"}`,
      `検出日時：${detectedText(item.detected_at)}`,
      "----------------"
    ].join("\n")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${pending.length}件をクリップボードへコピーしました。`);
    } catch {
      setStatus("クリップボードへコピーできませんでした。", true);
    }
  }

  function selectedIds() {
    return [...document.querySelectorAll("[data-candidate-check]:checked")].map((input) => input.value);
  }

  async function showDashboard() {
    byId("review-login-panel").hidden = true;
    byId("review-dashboard").hidden = false;
    await loadData();
  }

  async function init() {
    if (!window.BoxingData?.configured || !client()) {
      byId("review-login-error").textContent = "Supabaseが未設定です。";
      return;
    }
    try {
      const session = await window.BoxingData.getSession();
      if (session && (await window.BoxingData.isCurrentUserAdmin())) {
        state.session = session;
        await showDashboard();
      } else {
        byId("review-login-error").textContent = "管理者ログインが必要です。";
      }
    } catch (error) {
      byId("review-login-error").textContent = error.message;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("review-login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await window.BoxingData.signIn(byId("review-login-email").value, byId("review-login-password").value);
        state.session = await window.BoxingData.getSession();
        await showDashboard();
      } catch (error) {
        byId("review-login-error").textContent = error.message;
      }
    });
    byId("review-refresh-button").addEventListener("click", async () => {
      try { await loadData(); setStatus("再読み込みしました。"); } catch (error) { setStatus(error.message, true); }
    });
    ["review-status-filter", "review-category-filter", "review-source-filter", "review-search"].forEach((id) => {
      byId(id).addEventListener("input", renderCandidates);
      byId(id).addEventListener("change", renderCandidates);
    });
    byId("review-select-all").addEventListener("click", () => {
      document.querySelectorAll("[data-candidate-check]").forEach((input) => { input.checked = true; });
    });
    byId("review-copy-button").addEventListener("click", copyPending);
    byId("review-bulk-approve").addEventListener("click", () => reviewMany(selectedIds(), "approved"));
    byId("review-bulk-reject").addEventListener("click", () => reviewMany(selectedIds(), "rejected"));
    byId("review-bulk-hold").addEventListener("click", () => reviewMany(selectedIds(), "needs_review"));
    byId("review-candidate-list").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-candidate-action]");
      if (!button) return;
      const card = button.closest("[data-candidate-id]");
      try {
        await reviewCandidate(card.dataset.candidateId, button.dataset.candidateAction);
        await loadData();
        setStatus("候補を更新しました。");
      } catch (error) {
        setStatus(error.message || "候補を更新できませんでした。", true);
      }
    });
    byId("review-report-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-report-action]");
      if (!button) return;
      const card = button.closest("[data-report-id]");
      updateReport(card.dataset.reportId, button.dataset.reportAction);
    });
    byId("review-logout-button").addEventListener("click", async () => {
      await window.BoxingData.signOut();
      window.location.reload();
    });
    init();
  });
})();
