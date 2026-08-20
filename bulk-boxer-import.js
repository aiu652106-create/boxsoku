(function () {
  "use strict";

  const state = {
    session: null,
    entity: "boxers",
    importId: null,
    items: [],
    format: "paste",
    fileName: "貼り付けデータ"
  };

  const entityLabels = {
    boxers: "選手",
    rankings: "ランキング履歴",
    titles: "王座",
    title_reigns: "王座保有履歴",
    fighter_status_history: "状態履歴"
  };
  const operationLabels = {
    new: "新規",
    update: "更新候補",
    duplicate: "重複",
    error: "エラー",
    review: "要確認"
  };
  const boxerFields = [
    "slug", "name_ja", "name_kana", "name_en", "ring_name", "boxrec_id", "boxrec_url",
    "sex", "nationality", "nationality_code", "birth_date", "birthplace", "career_status",
    "gym", "weight_class", "stance", "height_cm", "reach_cm", "pro_debut_date",
    "total_fights", "wins", "losses", "draws", "no_contests", "ko_wins",
    "world_champion_experience", "current_titles", "past_major_titles", "world_title_weight_classes",
    "ranking_wba", "ranking_wbc", "ranking_ibf", "ranking_wbo", "next_fight_date",
    "next_opponent", "next_venue", "next_event_name", "source_name", "source_url",
    "source_checked_at", "field_sources", "is_published"
  ];
  const entityFields = {
    boxers: boxerFields,
    rankings: ["fighter_id", "fighter_slug", "boxrec_id", "organization", "weight_class", "ranking", "ranking_date", "ranking_month", "source_name", "source_url", "source_date", "checked_at"],
    titles: ["title_id", "organization", "weight_class", "title_type", "title_name"],
    title_reigns: ["fighter_id", "fighter_slug", "boxrec_id", "title_id", "organization", "weight_class", "title_type", "title_name", "start_date", "end_date", "status", "source_name", "source_url", "source_date", "checked_at"],
    fighter_status_history: ["fighter_id", "fighter_slug", "boxrec_id", "status", "start_date", "end_date", "source_name", "source_url", "source_date", "checked_at"]
  };
  const aliases = {
    id: "internal_id",
    fighterId: "fighter_id",
    fighterSlug: "fighter_slug",
    boxrecId: "boxrec_id",
    boxrecUrl: "boxrec_url",
    nameJa: "name_ja",
    nameKana: "name_kana",
    nameEn: "name_en",
    ringName: "ring_name",
    nationalityCode: "nationality_code",
    birthDate: "birth_date",
    careerStatus: "career_status",
    weightClass: "weight_class",
    heightCm: "height_cm",
    reachCm: "reach_cm",
    proDebutDate: "pro_debut_date",
    totalFights: "total_fights",
    noContests: "no_contests",
    koWins: "ko_wins",
    worldChampionExperience: "world_champion_experience",
    currentTitles: "current_titles",
    pastMajorTitles: "past_major_titles",
    worldTitleWeightClasses: "world_title_weight_classes",
    rankingWba: "ranking_wba",
    rankingWbc: "ranking_wbc",
    rankingIbf: "ranking_ibf",
    rankingWbo: "ranking_wbo",
    nextFightDate: "next_fight_date",
    nextOpponent: "next_opponent",
    nextVenue: "next_venue",
    nextEventName: "next_event_name",
    sourceName: "source_name",
    sourceUrl: "source_url",
    sourceCheckedAt: "source_checked_at",
    fieldSources: "field_sources",
    isPublished: "is_published",
    titleId: "title_id",
    titleType: "title_type",
    startDate: "start_date",
    endDate: "end_date",
    sourceDate: "source_date",
    checkedAt: "checked_at"
  };
  const numericFields = new Set([
    "height_cm", "reach_cm", "total_fights", "wins", "losses", "draws", "no_contests", "ko_wins",
    "ranking", "ranking_wba", "ranking_wbc", "ranking_ibf", "ranking_wbo"
  ]);
  const dateFields = new Set([
    "birth_date", "pro_debut_date", "next_fight_date", "ranking_date", "ranking_month",
    "start_date", "end_date", "source_date"
  ]);
  const dateTimeFields = new Set(["source_checked_at", "checked_at"]);
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

  function setStatus(message, isError = false) {
    const target = byId("bulk-status");
    target.textContent = message || "";
    target.classList.toggle("is-error", isError);
  }

  function text(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function canonicalField(value) {
    const key = text(value);
    return aliases[key] || key.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  }

  function normalizeRow(row, entity) {
    const allowed = new Set(entityFields[entity]);
    return Object.entries(row || {}).reduce((result, [rawKey, rawValue]) => {
      const key = canonicalField(rawKey);
      if (!allowed.has(key)) return result;
      result[key] = rawValue === null || rawValue === undefined ? "" : rawValue;
      return result;
    }, {});
  }

  function parseCsv(value) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const input = String(value || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      if (character === '"') {
        if (quoted && input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && input[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => text(cell) !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += character;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      if (row.some((cell) => text(cell) !== "")) rows.push(row);
    }
    if (rows.length < 2) throw new Error("CSVは見出し行とデータ行を用意してください。");
    const headers = rows.shift().map(canonicalField);
    return rows.map((cells) => headers.reduce((result, header, index) => {
      if (header) result[header] = cells[index] ?? "";
      return result;
    }, {}));
  }

  function parseData(value) {
    const raw = String(value || "").trim();
    if (!raw) throw new Error("CSVまたはJSONを入力してください。");
    if (/^[\[{]/.test(raw)) {
      let parsed;
      try {
        parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
      } catch {
        throw new Error("JSONを読み取れませんでした。");
      }
      const rows = Array.isArray(parsed) ? parsed : parsed?.data || parsed?.rows || parsed?.records;
      if (!Array.isArray(rows)) throw new Error("JSONは配列、またはdata/rows/records配列を指定してください。");
      return rows;
    }
    return parseCsv(raw);
  }

  async function inputData() {
    const pasted = byId("bulk-paste").value;
    if (text(pasted)) {
      state.format = "paste";
      state.fileName = "貼り付けデータ";
      return parseData(pasted);
    }
    const file = byId("bulk-file").files[0];
    if (!file) throw new Error("貼り付け欄またはファイルを指定してください。");
    state.format = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    state.fileName = file.name;
    return parseData(await file.text());
  }

  function validUrl(value) {
    try {
      const url = new URL(text(value));
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function validDate(value) {
    return !text(value) || /^\d{4}-\d{2}-\d{2}$/.test(text(value));
  }

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
  }

  function rowKey(row, fields) {
    return fields.map((field) => text(row[field]).toLocaleLowerCase("ja-JP")).join("|");
  }

  function boxerMatches(row, boxers) {
    const candidates = new Map();
    const add = (boxer) => { if (boxer) candidates.set(boxer.internal_id, boxer); };
    if (validUuid(row.internal_id)) add(boxers.find((boxer) => boxer.internal_id === text(row.internal_id)));
    if (text(row.fighter_id) && validUuid(row.fighter_id)) add(boxers.find((boxer) => boxer.internal_id === text(row.fighter_id)));
    if (text(row.boxrec_id)) boxers.filter((boxer) => text(boxer.boxrec_id) === text(row.boxrec_id)).forEach(add);
    if (text(row.slug)) boxers.filter((boxer) => boxer.slug === text(row.slug)).forEach(add);
    if (text(row.fighter_slug)) boxers.filter((boxer) => boxer.slug === text(row.fighter_slug)).forEach(add);
    if (text(row.name_ja) && text(row.birth_date)) boxers.filter((boxer) => boxer.name_ja === text(row.name_ja) && text(boxer.birth_date).slice(0, 10) === text(row.birth_date)).forEach(add);
    return [...candidates.values()];
  }

  function resolveFighter(row, boxers) {
    const matches = boxerMatches(row, boxers);
    if (matches.length === 1) return { boxer: matches[0], errors: [] };
    if (matches.length > 1) return { boxer: null, errors: ["複数の既存選手に一致しました。fighter_idまたはBoxRec IDを指定してください。"] };
    return { boxer: null, errors: ["既存選手を特定できません。fighter_id、fighter_slug、BoxRec IDのいずれかを指定してください。"] };
  }

  function validateCommonSource(row, errors) {
    if (!text(row.source_name)) errors.push("source_nameが必要です。");
    if (!validUrl(row.source_url)) errors.push("source_urlはhttp(s) URLが必要です。");
  }

  function validateBoxer(row, existing) {
    const errors = [];
    const review = [];
    if (!text(row.name_ja)) errors.push("name_jaが必要です。");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(row.slug))) errors.push("slugの形式が不正です。");
    if (!/^\d+$/.test(text(row.boxrec_id))) errors.push("BoxRec IDが必要です。");
    if (!/^https:\/\/boxrec\.com\//i.test(text(row.boxrec_url))) errors.push("boxrec_urlはBoxRec本人ページのhttps URLが必要です。");
    if (!['male', 'female', 'unknown'].includes(text(row.sex))) errors.push("sexはmale/female/unknownのいずれかが必要です。");
    if (!/^[A-Z]{3}$/.test(text(row.nationality_code))) errors.push("nationality_codeは3文字の国コードが必要です。");
    if (!['active', 'inactive', 'retired', 'unknown'].includes(text(row.career_status))) errors.push("career_statusが不正です。");
    if (!validDate(row.birth_date) || !validDate(row.pro_debut_date) || !validDate(row.next_fight_date)) errors.push("日付はYYYY-MM-DDで入力してください。");
    validateCommonSource(row, errors);
    numericFields.forEach((field) => {
      if (text(row[field]) !== "" && (!Number.isFinite(Number(row[field])) || Number(row[field]) < 0)) errors.push(`${field}は0以上の数値が必要です。`);
    });
    if (existing && existing.boxrec_id && text(row.boxrec_id) !== text(existing.boxrec_id)) review.push("既存選手のBoxRec IDと異なります。本人ページを再確認してください。");
    if (existing && existing.slug !== text(row.slug) && text(row.slug)) review.push("既存選手のslugを変更します。");
    return { errors, review };
  }

  function duplicateSeen(row, entity, seen) {
    const keys = entity === "boxers"
      ? [rowKey(row, ["boxrec_id"]), rowKey(row, ["slug"]), text(row.name_ja) && text(row.birth_date) ? rowKey(row, ["name_ja", "birth_date"]) : ""]
      : [];
    for (const key of keys) {
      if (key && key !== "|" && seen.has(key)) return seen.get(key);
    }
    keys.filter(Boolean).forEach((key) => seen.set(key, seen.get(key) || row.__rowNumber));
    return null;
  }

  async function loadReferenceData(entity) {
    const boxerResult = await client().from("boxers").select("internal_id,slug,name_ja,name_en,boxrec_id,birth_date").order("name_ja");
    if (boxerResult.error) throw boxerResult.error;
    const references = { boxers: boxerResult.data || [] };
    if (entity === "rankings") {
      const result = await client().from("rankings").select("ranking_id,fighter_id,organization,weight_class,ranking,ranking_date,ranking_month");
      if (result.error) throw result.error;
      references.rankings = result.data || [];
    } else if (entity === "titles") {
      const result = await client().from("titles").select("title_id,organization,weight_class,title_type,title_name");
      if (result.error) throw result.error;
      references.titles = result.data || [];
    } else if (entity === "title_reigns") {
      const [titleResult, reignResult] = await Promise.all([
        client().from("titles").select("title_id,organization,weight_class,title_type,title_name"),
        client().from("title_reigns").select("reign_id,fighter_id,title_id,start_date,end_date,status")
      ]);
      if (titleResult.error) throw titleResult.error;
      if (reignResult.error) throw reignResult.error;
      references.titles = titleResult.data || [];
      references.titleReigns = reignResult.data || [];
    } else if (entity === "fighter_status_history") {
      const result = await client().from("fighter_status_history").select("history_id,fighter_id,status,start_date,end_date");
      if (result.error) throw result.error;
      references.statusHistory = result.data || [];
    }
    return references;
  }

  function titleForRow(row, titles) {
    if (text(row.title_id)) return titles.find((title) => title.title_id === text(row.title_id)) || null;
    return titles.find((title) => title.organization === text(row.organization)
      && title.weight_class === text(row.weight_class)
      && title.title_type === text(row.title_type || "world")
      && title.title_name === text(row.title_name)) || null;
  }

  function validateEntity(row, entity, refs) {
    const errors = [];
    const review = [];
    const fighterRequired = ["rankings", "title_reigns", "fighter_status_history"].includes(entity);
    let fighter = null;
    if (fighterRequired) {
      const result = resolveFighter(row, refs.boxers);
      fighter = result.boxer;
      if (result.errors.length) errors.push(...result.errors);
    }
    if (entity === "boxers") {
      const matches = boxerMatches(row, refs.boxers);
      if (matches.length > 1) return { existing: null, errors: ["複数の既存選手に一致しました。"], review };
      const existing = matches[0] || null;
      const result = validateBoxer(row, existing);
      errors.push(...result.errors);
      review.push(...result.review);
      return { existing, errors, review };
    }
    if (entity === "rankings") {
      if (!['WBA', 'WBC', 'IBF', 'WBO'].includes(text(row.organization).toUpperCase())) errors.push("organizationはWBA/WBC/IBF/WBOが必要です。");
      if (!text(row.weight_class)) errors.push("weight_classが必要です。");
      if (!/^\d+$/.test(text(row.ranking))) errors.push("rankingが必要です。");
      if (!validDate(row.ranking_date) || !validDate(row.ranking_month)) errors.push("ranking_date/ranking_monthはYYYY-MM-DDで入力してください。");
      validateCommonSource(row, errors);
      if (!validDate(row.source_date)) errors.push("source_dateはYYYY-MM-DDで入力してください。");
      const duplicate = refs.rankings.find((item) => item.fighter_id === fighter?.internal_id
        && item.organization === text(row.organization).toUpperCase()
        && item.weight_class === text(row.weight_class)
        && (item.ranking_month || item.ranking_date) === (text(row.ranking_month) || text(row.ranking_date)));
      if (duplicate && Number(duplicate.ranking) !== Number(row.ranking)) review.push("同じ月・条件の順位が既にあり、順位が異なります。");
      return { existing: fighter, duplicate: duplicate && review.length === 0 ? duplicate : null, errors, review };
    }
    if (entity === "titles") {
      if (!text(row.organization) || !text(row.weight_class) || !text(row.title_name)) errors.push("organization、weight_class、title_nameが必要です。");
      if (!['world', 'regional', 'national', 'youth', 'other'].includes(text(row.title_type || "world"))) errors.push("title_typeが不正です。");
      const duplicate = refs.titles.find((item) => item.organization === text(row.organization)
        && item.weight_class === text(row.weight_class)
        && item.title_type === text(row.title_type || "world")
        && item.title_name === text(row.title_name));
      return { existing: duplicate || null, duplicate, errors, review };
    }
    if (entity === "title_reigns") {
      const title = titleForRow(row, refs.titles);
      if (!title) errors.push("title_id、または既存王座を特定できるtitle_name等が必要です。");
      if (!['active', 'lost', 'vacated', 'stripped', 'inactive'].includes(text(row.status || "active"))) errors.push("statusが不正です。");
      if (!validDate(row.start_date) || !validDate(row.end_date) || !validDate(row.source_date)) errors.push("日付はYYYY-MM-DDで入力してください。");
      validateCommonSource(row, errors);
      const duplicate = refs.titleReigns.find((item) => item.fighter_id === fighter?.internal_id
        && item.title_id === title?.title_id
        && item.status === text(row.status || "active")
        && text(item.start_date) === text(row.start_date));
      return { existing: fighter, title, duplicate, errors, review };
    }
    if (entity === "fighter_status_history") {
      if (!['active', 'inactive', 'retired'].includes(text(row.status))) errors.push("statusが不正です。");
      if (!validDate(row.start_date) || !validDate(row.end_date) || !validDate(row.source_date)) errors.push("日付はYYYY-MM-DDで入力してください。");
      validateCommonSource(row, errors);
      const duplicate = refs.statusHistory.find((item) => item.fighter_id === fighter?.internal_id
        && item.status === text(row.status)
        && text(item.start_date) === text(row.start_date));
      return { existing: fighter, duplicate, errors, review };
    }
    return { existing: fighter, errors: ["未対応のデータ種別です。"], review };
  }

  function buildPreview(rows, entity, refs) {
    const seen = new Map();
    return rows.map((raw, index) => {
      const row = normalizeRow(raw, entity);
      row.__rowNumber = index + 2;
      const result = validateEntity(row, entity, refs);
      const seenAt = entity === "boxers" ? duplicateSeen(row, entity, seen) : null;
      const errors = [...result.errors];
      const review = [...result.review];
      if (seenAt) errors.push(`同じファイルの${seenAt}行目と識別情報が重複しています。`);
      let operation = "new";
      if (errors.length) operation = "error";
      else if (review.length) operation = "review";
      else if (result.duplicate) operation = "duplicate";
      else if (entity === "boxers" && result.existing) operation = "update";
      const proposedRecord = { ...row };
      delete proposedRecord.__rowNumber;
      return {
        rowNumber: index + 2,
        proposedRecord,
        existingFighterId: result.existing?.internal_id || null,
        operation,
        validationErrors: [...errors, ...review],
        displayKey: entity === "boxers"
          ? (row.name_ja || row.name_en || row.slug || "識別情報なし")
          : (row.fighter_slug || row.boxrec_id || row.fighter_id || row.title_name || row.status || "識別情報なし")
      };
    });
  }

  function summaryCounts(items) {
    return ["new", "update", "duplicate", "error", "review"].reduce((result, operation) => {
      result[operation] = items.filter((item) => item.operation === operation).length;
      return result;
    }, {});
  }

  async function savePreview(items) {
    const counts = summaryCounts(items);
    const run = await client().from("bulk_import_runs").insert({
      entity_type: state.entity,
      file_name: state.fileName,
      file_format: state.format,
      row_count: items.length,
      new_count: counts.new,
      update_count: counts.update,
      duplicate_count: counts.duplicate,
      error_count: counts.error,
      review_count: counts.review,
      status: "preview",
      created_by: state.session.user.id,
      error_summary: items.filter((item) => item.validationErrors.length).slice(0, 30).map((item) => ({ row: item.rowNumber, errors: item.validationErrors }))
    }).select("import_id").single();
    if (run.error) throw run.error;
    state.importId = run.data.import_id;
    const payload = items.map((item) => ({
      import_id: state.importId,
      row_number: item.rowNumber,
      proposed_record: item.proposedRecord,
      existing_fighter_id: item.existingFighterId,
      operation: item.operation,
      validation_errors: item.validationErrors,
      status: "preview"
    }));
    for (let start = 0; start < payload.length; start += 100) {
      const result = await client().from("bulk_import_items").insert(payload.slice(start, start + 100)).select("item_id,row_number");
      if (result.error) throw result.error;
      const ids = new Map((result.data || []).map((item) => [item.row_number, item.item_id]));
      items.forEach((item) => { if (ids.has(item.rowNumber)) item.itemId = ids.get(item.rowNumber); });
    }
  }

  function renderPreview() {
    const counts = summaryCounts(state.items);
    byId("bulk-summary-panel").hidden = false;
    byId("bulk-import-id").textContent = state.importId ? `ID: ${state.importId}` : "";
    byId("bulk-summary").innerHTML = [
      ["新規", counts.new, "new"], ["更新候補", counts.update, "update"], ["重複", counts.duplicate, "duplicate"], ["エラー", counts.error, "error"], ["要確認", counts.review, "review"]
    ].map(([label, count, operation]) => `<div class="bulk-summary-${operation}"><span>${label}</span><strong>${count}</strong></div>`).join("");
    const canApply = counts.new + counts.update > 0;
    byId("bulk-apply-button").disabled = !canApply || !state.importId;
    byId("bulk-apply-note").textContent = canApply
      ? "反映対象は新規・更新候補だけです。重複・エラー・要確認は自動でスキップします。反映前に確認ダイアログを表示します。"
      : "反映できる行はありません。エラーや要確認の内容を修正して、もう一度プレビューしてください。";
    byId("bulk-preview-table").innerHTML = state.items.map((item) => `<tr class="bulk-operation-${escapeHtml(item.operation)}"><td>${item.rowNumber}</td><td>${escapeHtml(operationLabels[item.operation])}</td><td>${escapeHtml(item.displayKey)}</td><td><code>${escapeHtml(JSON.stringify(item.proposedRecord))}</code></td><td>${escapeHtml(item.validationErrors.join(" / ") || "なし")}</td></tr>`).join("");
  }

  async function preview() {
    const button = byId("bulk-preview-button");
    button.disabled = true;
    setStatus("既存データと照合してプレビューを作成しています…");
    try {
      state.entity = byId("bulk-entity").value;
      const rawRows = await inputData();
      if (!rawRows.length) throw new Error("データ行がありません。");
      const refs = await loadReferenceData(state.entity);
      state.items = buildPreview(rawRows, state.entity, refs);
      await savePreview(state.items);
      renderPreview();
      await loadLogs();
      setStatus(`${state.items.length}行のプレビューを作成しました。`);
    } catch (error) {
      setStatus(error.message || "プレビューを作成できませんでした。", true);
    } finally {
      button.disabled = false;
    }
  }

  function valueFor(row, field) {
    const value = row[field];
    return value === null || value === undefined || text(value) === "" ? undefined : value;
  }

  function typedValue(field, value) {
    if (value === undefined) return undefined;
    if (numericFields.has(field)) return Number(value);
    if (field === "world_champion_experience" || field === "is_published") {
      const normalized = text(value).toLowerCase();
      if (["true", "1", "yes", "あり"].includes(normalized)) return true;
      if (["false", "0", "no", "なし"].includes(normalized)) return false;
    }
    if (field === "field_sources" && typeof value === "string") {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  }

  function rowPayload(row, fields) {
    return fields.reduce((payload, field) => {
      const value = valueFor(row, field);
      if (value !== undefined) payload[field] = typedValue(field, value);
      return payload;
    }, {});
  }

  async function fighterIdFor(row, boxers) {
    const result = resolveFighter(row, boxers);
    if (!result.boxer) throw new Error(result.errors.join(" / "));
    return result.boxer.internal_id;
  }

  async function applyBoxer(item) {
    const payload = rowPayload(item.proposedRecord, boxerFields);
    if (item.existingFighterId) payload.internal_id = item.existingFighterId;
    const result = await client().from("boxers").upsert(payload, { onConflict: "slug" }).select("internal_id").single();
    if (result.error) throw result.error;
  }

  async function applyRanking(item, boxers) {
    const row = item.proposedRecord;
    const payload = rowPayload(row, ["organization", "weight_class", "ranking", "ranking_date", "ranking_month", "source_name", "source_url", "source_date", "checked_at"]);
    payload.organization = text(payload.organization).toUpperCase();
    payload.fighter_id = await fighterIdFor(row, boxers);
    const result = await client().from("rankings").insert(payload);
    if (result.error) throw result.error;
  }

  async function ensureTitleId(row) {
    if (text(row.title_id)) return text(row.title_id);
    const payload = rowPayload(row, ["organization", "weight_class", "title_type", "title_name"]);
    payload.title_type = payload.title_type || "world";
    const result = await client().from("titles").upsert(payload, { onConflict: "organization,weight_class,title_type,title_name" }).select("title_id").single();
    if (result.error) throw result.error;
    return result.data.title_id;
  }

  async function applyTitle(item) {
    const row = item.proposedRecord;
    const payload = rowPayload(row, ["organization", "weight_class", "title_type", "title_name"]);
    payload.title_type = payload.title_type || "world";
    const result = await client().from("titles").upsert(payload, { onConflict: "organization,weight_class,title_type,title_name" });
    if (result.error) throw result.error;
  }

  async function applyTitleReign(item, boxers) {
    const row = item.proposedRecord;
    const payload = rowPayload(row, ["start_date", "end_date", "status", "source_name", "source_url", "source_date", "checked_at"]);
    payload.fighter_id = await fighterIdFor(row, boxers);
    payload.title_id = await ensureTitleId(row);
    payload.status = payload.status || "active";
    const result = await client().from("title_reigns").insert(payload);
    if (result.error) throw result.error;
  }

  async function applyStatusHistory(item, boxers) {
    const row = item.proposedRecord;
    const payload = rowPayload(row, ["status", "start_date", "end_date", "source_name", "source_url", "source_date", "checked_at"]);
    payload.fighter_id = await fighterIdFor(row, boxers);
    const result = await client().from("fighter_status_history").insert(payload);
    if (result.error) throw result.error;
  }

  async function markItem(item, status) {
    if (!item.itemId) return;
    const result = await client().from("bulk_import_items").update({ status, applied_at: status === "applied" ? new Date().toISOString() : null }).eq("item_id", item.itemId);
    if (result.error) throw result.error;
  }

  async function apply() {
    if (!state.importId || !state.items.length) return;
    const applyItems = state.items.filter((item) => ["new", "update"].includes(item.operation));
    if (!applyItems.length) return;
    if (!window.confirm(`${applyItems.length}件の新規・更新候補だけを反映します。重複・エラー・要確認は反映しません。続けますか？`)) return;
    const button = byId("bulk-apply-button");
    button.disabled = true;
    setStatus("一括反映しています…");
    try {
      const refs = await loadReferenceData(state.entity);
      let applied = 0;
      for (const item of applyItems) {
        if (state.entity === "boxers") await applyBoxer(item);
        else if (state.entity === "rankings") await applyRanking(item, refs.boxers);
        else if (state.entity === "titles") await applyTitle(item);
        else if (state.entity === "title_reigns") await applyTitleReign(item, refs.boxers);
        else if (state.entity === "fighter_status_history") await applyStatusHistory(item, refs.boxers);
        await markItem(item, "applied");
        item.status = "applied";
        applied += 1;
      }
      for (const item of state.items.filter((item) => !["new", "update"].includes(item.operation))) await markItem(item, "skipped");
      const run = await client().from("bulk_import_runs").update({ status: "applied", applied_at: new Date().toISOString() }).eq("import_id", state.importId);
      if (run.error) throw run.error;
      renderPreview();
      await loadLogs();
      setStatus(`${applied}件を反映しました。重複・エラー・要確認はスキップしました。`);
    } catch (error) {
      await client().from("bulk_import_runs").update({ status: "failed", error_summary: [{ message: error.message || "反映に失敗しました。" }] }).eq("import_id", state.importId);
      setStatus(error.message || "一括反映に失敗しました。反映済みの行がある場合はログを確認してください。", true);
    } finally {
      button.disabled = false;
    }
  }

  function renderLogs(rows) {
    const target = byId("bulk-log");
    if (!rows.length) {
      target.innerHTML = "<p>一括処理ログはありません。</p>";
      return;
    }
    target.innerHTML = rows.map((row) => `<article><strong>${escapeHtml(entityLabels[row.entity_type] || row.entity_type)}</strong><span>${escapeHtml(row.file_name)}</span><span>新規 ${row.new_count} / 更新 ${row.update_count} / 重複 ${row.duplicate_count} / エラー ${row.error_count} / 要確認 ${row.review_count}</span><time>${escapeHtml(new Date(row.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }))}</time><em>${escapeHtml(row.status)}</em></article>`).join("");
  }

  async function loadLogs() {
    const result = await client().from("bulk_import_runs").select("import_id,entity_type,file_name,new_count,update_count,duplicate_count,error_count,review_count,status,created_at").order("created_at", { ascending: false }).limit(20);
    if (result.error) throw result.error;
    renderLogs(result.data || []);
  }

  async function showDashboard() {
    byId("bulk-login-panel").hidden = true;
    byId("bulk-dashboard").hidden = false;
    try { await loadLogs(); } catch (error) { setStatus(error.message, true); }
  }

  async function init() {
    if (!window.BoxingData?.configured || !client()) {
      byId("bulk-login-error").textContent = "Supabaseが未設定です。";
      return;
    }
    try {
      const session = await window.BoxingData.getSession();
      if (session && (await window.BoxingData.isCurrentUserAdmin())) {
        state.session = session;
        await showDashboard();
      } else {
        byId("bulk-login-error").textContent = "管理者ログインが必要です。";
      }
    } catch (error) {
      byId("bulk-login-error").textContent = error.message;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("bulk-login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await window.BoxingData.signIn(byId("bulk-login-email").value, byId("bulk-login-password").value);
        state.session = await window.BoxingData.getSession();
        await showDashboard();
      } catch (error) {
        byId("bulk-login-error").textContent = error.message;
      }
    });
    byId("bulk-preview-button").addEventListener("click", preview);
    byId("bulk-apply-button").addEventListener("click", apply);
    byId("bulk-logout-button").addEventListener("click", async () => {
      await window.BoxingData.signOut();
      window.location.reload();
    });
    init();
  });
})();
