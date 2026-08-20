(function () {
  const fieldNames = [
    "nameJa",
    "slug",
    "nameKana",
    "nameEn",
    "ringName",
    "boxrecId",
    "boxrecUrl",
    "sex",
    "nationality",
    "nationalityCode",
    "birthDate",
    "birthplace",
    "careerStatus",
    "gym",
    "trainer",
    "promoter",
    "manager",
    "trainingBase",
    "weightClass",
    "stance",
    "height",
    "reach",
    "debutDate",
    "totalFights",
    "wins",
    "losses",
    "draws",
    "noContests",
    "koWins",
    "worldChampion",
    "currentTitles",
    "pastTitles",
    "worldTitleClasses",
    "rankingWba",
    "rankingWbc",
    "rankingIbf",
    "rankingWbo",
    "nextDate",
    "nextOpponent",
    "nextVenue",
    "nextEvent",
    "sourceName",
    "sourceUrl",
    "sourceCheckedAt",
    "fieldSources",
    "published"
  ];

  let currentBoxers = [];
  let editingId = "";
  let sourceAuditRequestId = 0;

  const sourceFieldLabels = {
    profile: "基本プロフィール",
    record: "戦績",
    boxrec: "BoxRec ID・本人ページ",
    boxrec_id: "BoxRec ID・本人ページ",
    boxrec_url: "BoxRec ID・本人ページ",
    name_ja: "基本プロフィール",
    name_kana: "基本プロフィール",
    name_en: "基本プロフィール",
    nationality: "国籍",
    birth_date: "生年月日",
    birthplace: "出身地",
    sex: "性別",
    weight_class: "階級",
    stance: "構え",
    height_cm: "身長",
    reach_cm: "リーチ",
    pro_debut_date: "プロデビュー",
    world_champion_experience: "世界王者経験",
    past_major_titles: "過去の主要タイトル",
    titles: "過去の主要タイトル",
    world_title_weight_classes: "世界王座獲得階級",
    next_fight: "次戦",
    next_fight_date: "次戦",
    next_opponent: "次戦",
    next_venue: "次戦",
    next_event_name: "次戦",
    gym: "所属ジム",
    trainer: "トレーナー",
    promoter: "プロモーター",
    manager: "マネージャー",
    training_base: "トレーニング拠点"
  };
  const canonicalSourceFields = new Set([
    "career_status",
    "current_titles",
    "ranking_wba",
    "ranking_wbc",
    "ranking_ibf",
    "ranking_wbo"
  ]);

  const byId = (id) => document.getElementById(id);
  const valueOf = (name) => byId(`boxer-${kebab(name)}`);
  const kebab = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

  function setStatus(message, isError = false) {
    const element = byId("boxer-admin-status");
    element.textContent = message || "";
    element.classList.toggle("is-error", isError);
  }

  function nullableValue(element) {
    const value = String(element?.value || "").trim();
    return value === "" ? null : value;
  }

  function nullableNumber(element) {
    const value = String(element?.value || "").trim();
    if (!value) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function nullableDateTime(element) {
    const value = String(element?.value || "").trim();
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function setValue(name, value) {
    const element = valueOf(name);
    if (!element) return;
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
      return;
    }
    if (element.type === "datetime-local") {
      if (!value) {
        element.value = "";
        return;
      }
      const date = new Date(value);
      element.value = Number.isNaN(date.getTime()) ? "" : toDateTimeLocal(date);
      return;
    }
    element.value = value === null || value === undefined ? "" : String(value);
  }

  function toDateTimeLocal(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }

  function resetForm() {
    editingId = "";
    byId("boxer-form").reset();
    byId("boxer-published").checked = true;
    byId("boxer-career-status").value = "unknown";
    byId("boxer-world-champion").value = "";
    byId("boxer-delete-button").disabled = true;
    byId("boxer-form-heading").textContent = "選手情報（新規）";
    renderSourceAudit(null);
  }

  function loadForm(boxer) {
    editingId = boxer.internal_id;
    setValue("internalId", boxer.internal_id);
    setValue("nameJa", boxer.name_ja);
    setValue("slug", boxer.slug);
    setValue("nameKana", boxer.name_kana);
    setValue("nameEn", boxer.name_en);
    setValue("ringName", boxer.ring_name);
    setValue("boxrecId", boxer.boxrec_id);
    setValue("boxrecUrl", boxer.boxrec_url);
    setValue("sex", boxer.sex);
    setValue("nationality", boxer.nationality);
    setValue("nationalityCode", boxer.nationality_code);
    setValue("birthDate", boxer.birth_date);
    setValue("birthplace", boxer.birthplace);
    setValue("careerStatus", boxer.career_status);
    setValue("gym", boxer.gym);
    setValue("trainer", boxer.trainer);
    setValue("promoter", boxer.promoter);
    setValue("manager", boxer.manager);
    setValue("trainingBase", boxer.training_base);
    setValue("weightClass", boxer.weight_class);
    setValue("stance", boxer.stance);
    setValue("height", boxer.height_cm);
    setValue("reach", boxer.reach_cm);
    setValue("debutDate", boxer.pro_debut_date);
    setValue("totalFights", boxer.total_fights);
    setValue("wins", boxer.wins);
    setValue("losses", boxer.losses);
    setValue("draws", boxer.draws);
    setValue("noContests", boxer.no_contests);
    setValue("koWins", boxer.ko_wins);
    setValue("worldChampion", boxer.world_champion_experience === null ? "" : String(boxer.world_champion_experience));
    setValue("currentTitles", boxer.current_titles);
    setValue("pastTitles", boxer.past_major_titles);
    setValue("worldTitleClasses", boxer.world_title_weight_classes);
    setValue("rankingWba", boxer.ranking_wba);
    setValue("rankingWbc", boxer.ranking_wbc);
    setValue("rankingIbf", boxer.ranking_ibf);
    setValue("rankingWbo", boxer.ranking_wbo);
    setValue("nextDate", boxer.next_fight_date);
    setValue("nextOpponent", boxer.next_opponent);
    setValue("nextVenue", boxer.next_venue);
    setValue("nextEvent", boxer.next_event_name);
    setValue("sourceName", boxer.source_name);
    setValue("sourceUrl", boxer.source_url);
    setValue("sourceCheckedAt", boxer.source_checked_at);
    setValue("fieldSources", boxer.field_sources ? JSON.stringify(boxer.field_sources, null, 2) : "");
    setValue("published", boxer.is_published);
    byId("boxer-delete-button").disabled = false;
    byId("boxer-form-heading").textContent = `選手情報：${boxer.name_ja}`;
  }

  function recordLabel(boxer) {
    if (boxer.total_fights === null && boxer.wins === null) return "戦績：不明";
    return `${boxer.total_fights ?? "?"}戦${boxer.wins ?? "?"}勝${boxer.losses ?? "?"}敗`;
  }

  function renderList() {
    const list = byId("boxer-list");
    byId("boxer-count").textContent = `${currentBoxers.length}名`;
    if (!currentBoxers.length) {
      list.innerHTML = '<p class="boxer-admin-empty">まだ登録されていません。</p>';
      return;
    }
    list.innerHTML = currentBoxers
      .map(
        (boxer) => `<button type="button" class="boxer-admin-list-item${
          boxer.internal_id === editingId ? " is-active" : ""
        }" data-boxer-id="${escapeHtml(boxer.internal_id)}"><strong>${escapeHtml(
          boxer.name_ja
        )}</strong><span>${escapeHtml(boxer.career_status === "retired" ? "引退" : boxer.career_status === "inactive" ? "活動休止" : boxer.career_status === "active" ? "現役" : "不明")} / ${escapeHtml(
          recordLabel(boxer)
        )}</span></button>`
      )
      .join("");
    list.querySelectorAll("[data-boxer-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const boxer = currentBoxers.find((item) => item.internal_id === button.dataset.boxerId);
        if (boxer) {
          loadForm(boxer);
          void loadSourceAudit(boxer);
          renderList();
        }
      });
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function sourceDisplayName(value) {
    const name = String(value || "").trim();
    if (!name) return "情報源";
    return name.split(/\s*\/\s*/)[0].trim() || "情報源";
  }

  function sourceNameIsUnconfirmed(value) {
    return /確認できず|確認できない|記載なし/.test(String(value || ""));
  }

  function preferredSourceName(names) {
    const candidates = names.filter((name) => !sourceNameIsUnconfirmed(name));
    return [...(candidates.length ? candidates : names)].sort(
      (left, right) => left.length - right.length || left.localeCompare(right, "ja")
    )[0] || "情報源";
  }

  function sourceEntries(value) {
    const values = Array.isArray(value) ? value : [value];
    return values
      .map((entry) => (typeof entry === "string" ? { url: entry } : entry))
      .filter((entry) => entry && typeof entry === "object");
  }

  function safeSourceUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function sourceDateText(value) {
    const date = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll("-", "/") : "不明";
  }

  function checkedAtText(value) {
    if (!value) return "不明";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "不明" : date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  }

  function currentTitleReign(reign) {
    if (String(reign?.status || "") !== "active") return false;
    if (!reign?.end_date) return true;
    return String(reign.end_date).slice(0, 10) >= new Date().toISOString().slice(0, 10);
  }

  function buildSourceAuditRows(boxer, rankings, titleReigns, status) {
    const byUrl = new Map();
    const add = (entry, purpose) => {
      const url = safeSourceUrl(entry?.url || entry?.source_url);
      if (!url) return;
      const sourceName = sourceDisplayName(entry?.name || entry?.source_name);
      if (sourceNameIsUnconfirmed(sourceName)) return;
      const existing = byUrl.get(url);
      if (existing) {
        if (!existing.purposes.includes(purpose)) existing.purposes.push(purpose);
        if (!existing.names.includes(sourceName)) existing.names.push(sourceName);
        existing.sourceDate ||= entry?.source_date || entry?.sourceDate || null;
        existing.checkedAt ||= entry?.checked_at || entry?.checkedAt || null;
        return;
      }
      byUrl.set(url, {
        names: [sourceName],
        url,
        purposes: [purpose],
        sourceDate: entry?.source_date || entry?.sourceDate || null,
        checkedAt: entry?.checked_at || entry?.checkedAt || null
      });
    };

    const fieldSources = boxer.field_sources && typeof boxer.field_sources === "object"
      ? boxer.field_sources
      : {};
    for (const [fieldName, value] of Object.entries(fieldSources)) {
      if (canonicalSourceFields.has(fieldName) || fieldName === "residence") continue;
      const label = sourceFieldLabels[fieldName];
      if (!label) continue;
      for (const entry of sourceEntries(value)) add(entry, label);
    }
    for (const row of rankings || []) {
      const organization = String(row.organization || "").toUpperCase();
      add(row, organization ? `${organization}ランキング` : "世界ランキング");
    }
    for (const row of titleReigns || []) {
      if (currentTitleReign(row)) add(row, "現在保有タイトル");
    }
    if (status) add(status, "現役・引退状態");
    if (!byUrl.size) add({ name: boxer.source_name, url: boxer.source_url, checked_at: boxer.source_checked_at }, "互換用代表出典");

    return [...byUrl.values()].map((row) => ({ ...row, name: preferredSourceName(row.names) }));
  }

  function renderSourceAudit(boxer, rows = []) {
    const target = byId("boxer-source-audit");
    if (!target) return;
    if (!boxer) {
      target.innerHTML = '<h3>項目別出典の確認</h3><p class="boxer-admin-source-audit-empty">選手を選択してください。</p>';
      return;
    }
    if (!rows.length) {
      target.innerHTML = '<h3>項目別出典の確認</h3><p class="boxer-admin-source-audit-empty">項目別に確認できる出典はありません。</p>';
      return;
    }
    target.innerHTML = `<h3>項目別出典の確認</h3><p class="boxer-admin-source-audit-note">同じURLは1件にまとめ、用途を併記しています。</p><ul class="boxer-admin-source-audit-list">${rows
      .map((row) => `<li class="boxer-admin-source-audit-item"><strong>${escapeHtml(row.name)}</strong><span>対象：${escapeHtml(row.purposes.join("・"))}</span><a href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.url)}</a><span>公開日：${escapeHtml(sourceDateText(row.sourceDate))}｜確認日：${escapeHtml(checkedAtText(row.checkedAt || boxer.source_checked_at))}</span></li>`)
      .join("")}</ul>`;
  }

  async function loadSourceAudit(boxer) {
    const requestId = ++sourceAuditRequestId;
    if (!boxer) {
      renderSourceAudit(null);
      return;
    }
    const target = byId("boxer-source-audit");
    if (target) target.innerHTML = '<h3>項目別出典の確認</h3><p class="boxer-admin-source-audit-empty">正本出典を読み込み中…</p>';
    try {
      const [rankingsResult, titlesResult, statusResult] = await Promise.all([
        window.BoxingData.client
          .from("current_fighter_rankings")
          .select("organization,ranking,source_name,source_url,source_date,checked_at")
          .eq("fighter_id", boxer.internal_id),
        window.BoxingData.client
          .from("title_reigns")
          .select("title_id,status,end_date,source_name,source_url,source_date,checked_at")
          .eq("fighter_id", boxer.internal_id)
          .eq("status", "active"),
        window.BoxingData.client
          .from("current_fighter_status")
          .select("status,source_name,source_url,source_date,checked_at")
          .eq("fighter_id", boxer.internal_id)
          .limit(1)
      ]);
      if (rankingsResult.error) throw rankingsResult.error;
      if (titlesResult.error) throw titlesResult.error;
      if (statusResult.error) throw statusResult.error;
      if (requestId !== sourceAuditRequestId) return;
      renderSourceAudit(
        boxer,
        buildSourceAuditRows(
          boxer,
          rankingsResult.data || [],
          titlesResult.data || [],
          (statusResult.data || [])[0] || null
        )
      );
    } catch (error) {
      if (requestId !== sourceAuditRequestId) return;
      const target = byId("boxer-source-audit");
      if (target) target.innerHTML = `<h3>項目別出典の確認</h3><p class="boxer-admin-source-audit-error">正本出典の読み込みに失敗しました。${escapeHtml(error.message || "")}</p>`;
    }
  }

  async function loadBoxers() {
    const { data, error } = await window.BoxingData.client
      .from("boxers")
      .select("*")
      .order("name_ja", { ascending: true });
    if (error) throw error;
    currentBoxers = data || [];
    renderList();
  }

  async function loadReportSummary() {
    const target = byId("boxer-report-admin-counts");
    const result = await window.BoxingData.client.from("correction_reports").select("report_id,status");
    if (result.error) {
      target.innerHTML = "<span>報告件数を読み込めません。</span>";
      return;
    }
    const rows = result.data || [];
    const labels = [["pending", "未対応"], ["reviewing", "確認中"], ["fixed", "修正済み"], ["rejected", "却下"]];
    target.innerHTML = labels.map(([status, label]) => `<span><strong>${rows.filter((row) => row.status === status).length}</strong>${label}</span>`).join("");
  }

  function formPayload() {
    let fieldSources = {};
    const rawFieldSources = String(valueOf("fieldSources").value || "").trim();
    if (rawFieldSources) {
      fieldSources = JSON.parse(rawFieldSources);
      if (!fieldSources || Array.isArray(fieldSources) || typeof fieldSources !== "object") {
        throw new Error("項目別出典はJSONオブジェクトで入力してください。");
      }
    }
    return {
      slug: String(valueOf("slug").value || "").trim(),
      name_ja: String(valueOf("nameJa").value || "").trim(),
      name_kana: nullableValue(valueOf("nameKana")),
      name_en: nullableValue(valueOf("nameEn")),
      ring_name: nullableValue(valueOf("ringName")),
      boxrec_id: nullableValue(valueOf("boxrecId")),
      boxrec_url: nullableValue(valueOf("boxrecUrl")),
      sex: nullableValue(valueOf("sex")),
      nationality: nullableValue(valueOf("nationality")),
      nationality_code: nullableValue(valueOf("nationalityCode"))?.toUpperCase() || null,
      birth_date: nullableValue(valueOf("birthDate")),
      birthplace: nullableValue(valueOf("birthplace")),
      gym: nullableValue(valueOf("gym")),
      trainer: nullableValue(valueOf("trainer")),
      promoter: nullableValue(valueOf("promoter")),
      manager: nullableValue(valueOf("manager")),
      training_base: nullableValue(valueOf("trainingBase")),
      weight_class: nullableValue(valueOf("weightClass")),
      stance: nullableValue(valueOf("stance")),
      height_cm: nullableNumber(valueOf("height")),
      reach_cm: nullableNumber(valueOf("reach")),
      pro_debut_date: nullableValue(valueOf("debutDate")),
      total_fights: nullableNumber(valueOf("totalFights")),
      wins: nullableNumber(valueOf("wins")),
      losses: nullableNumber(valueOf("losses")),
      draws: nullableNumber(valueOf("draws")),
      no_contests: nullableNumber(valueOf("noContests")),
      ko_wins: nullableNumber(valueOf("koWins")),
      world_champion_experience: valueOf("worldChampion").value === "" ? null : valueOf("worldChampion").value === "true",
      next_fight_date: nullableValue(valueOf("nextDate")),
      next_opponent: nullableValue(valueOf("nextOpponent")),
      next_venue: nullableValue(valueOf("nextVenue")),
      next_event_name: nullableValue(valueOf("nextEvent")),
      source_name: String(valueOf("sourceName").value || "").trim(),
      source_url: String(valueOf("sourceUrl").value || "").trim(),
      source_checked_at: nullableDateTime(valueOf("sourceCheckedAt")),
      field_sources: fieldSources,
      is_published: valueOf("published").checked
    };
  }

  async function save(event) {
    event.preventDefault();
    const form = byId("boxer-form");
    if (!form.reportValidity()) return;
    let payload;
    try {
      payload = formPayload();
    } catch (error) {
      setStatus(error.message, true);
      return;
    }
    if (!payload.name_ja || !payload.slug || !payload.source_name || !payload.source_url) {
      setStatus("選手名・slug・主な出典名・主な出典URLは必須です。", true);
      return;
    }
    setStatus("保存中…");
    const query = editingId
      ? window.BoxingData.client.from("boxers").update(payload).eq("internal_id", editingId)
      : window.BoxingData.client.from("boxers").insert(payload);
    const { error } = await query;
    if (error) {
      setStatus(error.message, true);
      return;
    }
    await loadBoxers();
    const saved = currentBoxers.find((boxer) => boxer.slug === payload.slug);
    if (saved) {
      loadForm(saved);
      await loadSourceAudit(saved);
    }
    setStatus("保存しました。");
  }

  async function remove() {
    if (!editingId) return;
    const boxer = currentBoxers.find((item) => item.internal_id === editingId);
    if (!boxer || !window.confirm(`${boxer.name_ja}を削除しますか？`)) return;
    setStatus("削除中…");
    const { error } = await window.BoxingData.client.from("boxers").delete().eq("internal_id", editingId);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    resetForm();
    await loadBoxers();
    setStatus("削除しました。");
  }

  async function init() {
    if (!window.BoxingData?.configured || !window.BoxingData?.client) {
      byId("boxer-login-error").textContent = "Supabaseが未設定です。";
      return;
    }
    try {
      const session = await window.BoxingData.getSession();
      if (session && (await window.BoxingData.isCurrentUserAdmin())) {
        await showDashboard();
      }
    } catch (error) {
      byId("boxer-login-error").textContent = error.message;
    }
  }

  async function showDashboard() {
    byId("boxer-login-panel").hidden = true;
    byId("boxer-dashboard").hidden = false;
    resetForm();
    await Promise.all([loadBoxers(), loadReportSummary()]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("boxer-login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorElement = byId("boxer-login-error");
      errorElement.textContent = "";
      try {
        await window.BoxingData.signIn(byId("boxer-login-email").value, byId("boxer-login-password").value);
        await showDashboard();
      } catch (error) {
        errorElement.textContent = error.message;
      }
    });
    byId("boxer-form").addEventListener("submit", save);
    byId("boxer-new-button").addEventListener("click", () => {
      resetForm();
      renderList();
    });
    byId("boxer-delete-button").addEventListener("click", remove);
    byId("boxer-logout-button").addEventListener("click", async () => {
      await window.BoxingData.signOut();
      window.location.reload();
    });
    init();
  });
})();
