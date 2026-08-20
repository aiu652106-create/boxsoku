import { securityHeaders } from "../_shared/security.js";

const JSON_HEADERS = securityHeaders({
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
});

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_PROPOSED_VALUE = 2000;
const MAX_COMMENT = 2000;
const REPORT_FIELDS = new Set([
  "name_ja",
  "name_kana",
  "name_en",
  "ring_name",
  "nationality",
  "birth_date",
  "birthplace",
  "career_status",
  "gym",
  "weight_class",
  "stance",
  "height_cm",
  "reach_cm",
  "pro_debut_date",
  "world_champion_experience",
  "current_titles",
  "past_major_titles",
  "world_title_weight_classes",
  "ranking_wba",
  "ranking_wbc",
  "ranking_ibf",
  "ranking_wbo",
  "next_fight",
  "next_fight_date",
  "next_opponent",
  "next_venue",
  "next_event_name"
]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
}

async function reporterHash(request, fighterId, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const salt = String(env.COMMENT_ID_SALT || env.BOXSOKU_REPORT_SALT || "");
  const bytes = new TextEncoder().encode(`${ip}|${fighterId}|${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function configured(env) {
  return Boolean(
    env.SUPABASE_URL &&
      env.SUPABASE_ANON_KEY &&
      env.BOXSOKU_SERVER_TOKEN &&
      (env.COMMENT_ID_SALT || env.BOXSOKU_REPORT_SALT)
  );
}

export async function onRequestPost({ env, request }) {
  if (!configured(env)) {
    return json({ ok: false, message: "報告機能が未設定です。" }, 503);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "報告内容が大きすぎます。" }, 413);
  }

  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin) {
    return json({ ok: false, message: "許可されていない送信元です。" }, 403);
  }

  let input;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, message: "報告内容が大きすぎます。" }, 413);
    }
    input = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "報告内容が正しくありません。" }, 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ ok: false, message: "報告内容が正しくありません。" }, 400);
  }

  if (String(input.website || "").trim()) {
    return json({ ok: true, message: "報告を受け付けました。" }, 201);
  }

  const fighterId = String(input.fighterId || "");
  const fieldName = String(input.fieldName || "");
  const proposedValue = cleanText(input.proposedValue, MAX_PROPOSED_VALUE);
  const evidenceUrl = cleanText(input.evidenceUrl, 1000);
  const comment = cleanText(input.comment, MAX_COMMENT);

  if (
    !isUuid(fighterId) ||
    !REPORT_FIELDS.has(fieldName) ||
    !proposedValue ||
    !/^https?:\/\//i.test(evidenceUrl)
  ) {
    return json({ ok: false, message: "必須項目を正しく入力してください。" }, 422);
  }

  try {
    const hash = await reporterHash(request, fighterId, env);
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/submit_boxer_report`, {
      method: "POST",
      headers: supabaseHeaders(env),
      body: JSON.stringify({
        p_fighter_id: fighterId,
        p_field_name: fieldName,
        p_proposed_value: proposedValue,
        p_evidence_url: evidenceUrl,
        p_comment: comment,
        p_reporter_hash: hash,
        p_server_token: String(env.BOXSOKU_SERVER_TOKEN)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      if (/duplicate boxer report/i.test(detail)) {
        return json({ ok: false, message: "同じ項目の報告は15分以内に送信できません。" }, 429);
      }
      throw new Error(`Boxer report insert failed: ${response.status}`);
    }

    return json({ ok: true, message: "報告を受け付けました。管理者が確認します。" }, 201);
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "報告を送信できませんでした。" }, 500);
  }
}

export function onRequestGet() {
  return json({ ok: false, message: "このURLではGETを受け付けていません。" }, 405);
}
