import {
  authorizeEventRequest,
  configuredEventAutomation,
  jsonResponse,
  supabaseHeaders
} from "../_shared/event-auth.js";

async function readJson(response) {
  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function restRows(env, resource, query, token) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${resource}?${query}`, {
    headers: supabaseHeaders(env, token)
  });
  return readJson(response);
}

async function callReviewRpc(env, body, token) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/review_event_update_candidate`,
    {
      method: "POST",
      headers: supabaseHeaders(env, token, { "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    }
  );
  return readJson(response);
}

export async function onRequestGet({ env, request }) {
  if (!configuredEventAutomation(env)) {
    return jsonResponse({ ok: false, message: "興行自動更新が未設定です。" }, 503);
  }
  const authorization = await authorizeEventRequest({
    env,
    request,
    allowServerToken: false
  });
  if (!authorization.ok) {
    return jsonResponse({ ok: false, message: authorization.message }, authorization.status);
  }
  try {
    const [sources, runs, candidates, articles] = await Promise.all([
      restRows(env, "event_source_configs", "select=*&order=source_key.asc", authorization.token),
      restRows(env, "event_fetch_runs", "select=*&order=fetched_at.desc&limit=30", authorization.token),
      restRows(env, "event_update_candidates", "select=*&order=discovered_at.desc&limit=100", authorization.token),
      restRows(
        env,
        "articles",
        "select=id,slug,title,status,published_at&order=published_at.desc.nullslast&limit=200",
        authorization.token
      )
    ]);
    return jsonResponse({ ok: true, sources, runs, candidates, articles });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: "候補一覧を取得できませんでした。" }, 502);
  }
}

export async function onRequestPost({ env, request }) {
  if (!configuredEventAutomation(env)) {
    return jsonResponse({ ok: false, message: "興行自動更新が未設定です。" }, 503);
  }
  const authorization = await authorizeEventRequest({
    env,
    request,
    allowServerToken: false
  });
  if (!authorization.ok) {
    return jsonResponse({ ok: false, message: authorization.message }, authorization.status);
  }
  let input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32 * 1024) {
      return jsonResponse({ ok: false, message: "リクエストが大きすぎます。" }, 413);
    }
    input = JSON.parse(raw);
  } catch {
    return jsonResponse({ ok: false, message: "リクエスト形式が正しくありません。" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonResponse({ ok: false, message: "リクエスト形式が正しくありません。" }, 400);
  }
  const candidateId = String(input.candidateId || "");
  const action = String(input.action || "");
  const articleId = input.articleId ? String(input.articleId) : null;
  const reviewNote = String(input.reviewNote || "").trim().slice(0, 1000);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId) ||
    !["approved", "published", "rejected", "needs_review"].includes(action) ||
    (articleId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(articleId))
  ) {
    return jsonResponse({ ok: false, message: "候補操作の内容が正しくありません。" }, 422);
  }
  try {
    const result = await callReviewRpc(
      env,
      {
        p_candidate_id: candidateId,
        p_action: action,
        p_article_id: articleId,
        p_review_note: reviewNote || null
      },
      authorization.token
    );
    return jsonResponse({ ok: true, candidate: result });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: "候補を処理できませんでした。" }, 422);
  }
}
