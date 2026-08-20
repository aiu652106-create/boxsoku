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

  async function loadBoxers() {
    const { data, error } = await window.BoxingData.client
      .from("boxers")
      .select("*")
      .order("name_ja", { ascending: true });
    if (error) throw error;
    currentBoxers = data || [];
    renderList();
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
      career_status: valueOf("careerStatus").value,
      gym: nullableValue(valueOf("gym")),
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
      current_titles: nullableValue(valueOf("currentTitles")),
      past_major_titles: nullableValue(valueOf("pastTitles")),
      world_title_weight_classes: nullableValue(valueOf("worldTitleClasses")),
      ranking_wba: nullableNumber(valueOf("rankingWba")),
      ranking_wbc: nullableNumber(valueOf("rankingWbc")),
      ranking_ibf: nullableNumber(valueOf("rankingIbf")),
      ranking_wbo: nullableNumber(valueOf("rankingWbo")),
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
    if (saved) loadForm(saved);
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
    await loadBoxers();
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
