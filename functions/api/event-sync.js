import { getEventSourceAdapter } from "../_shared/event-sources.js";
import {
  authorizeEventRequest,
  configuredEventAutomation,
  jsonResponse,
  supabaseHeaders
} from "../_shared/event-auth.js";

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function rpcUrl(env, name) {
  return `${env.SUPABASE_URL}/rest/v1/rpc/${name}`;
}

async function readResponseDetail(response) {
  const detail = await response.text().catch(() => "");
  return detail.slice(0, 2000);
}

async function callRpc(env, name, body, accessToken) {
  const response = await fetch(rpcUrl(env, name), {
    method: "POST",
    headers: supabaseHeaders(env, accessToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${name} failed (${response.status}): ${await readResponseDetail(response)}`);
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} returned invalid JSON`);
  }
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || "")).byteLength;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function timeoutError() {
  const error = new Error("source request timed out");
  error.code = "timeout";
  return error;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSource(config, begin, env) {
  let retryCount = 0;
  let lastError = null;
  for (let attempt = 0; attempt <= Number(begin.max_retries || 0); attempt += 1) {
    try {
      const headers = {
        Accept: "text/html,application/xhtml+xml,application/json,application/ld+json"
      };
      if (begin.last_etag) headers["If-None-Match"] = begin.last_etag;
      if (begin.last_modified) headers["If-Modified-Since"] = begin.last_modified;
      const response = await fetchWithTimeout(
        begin.source_url,
        { method: "GET", headers, redirect: "follow" },
        Math.min(30000, Math.max(1000, Number(begin.timeout_ms || config.timeout_ms || 10000)))
      );
      if (response.status >= 500 && response.status <= 599 && attempt < Number(begin.max_retries || 0)) {
        retryCount += 1;
        await delay(100);
        continue;
      }
      return { response, retryCount };
    } catch (error) {
      lastError = error;
      if (attempt >= Number(begin.max_retries || 0)) break;
      retryCount += 1;
      await delay(100);
    }
  }
  const error = lastError || new Error("source request failed");
  error.retryCount = retryCount;
  throw error;
}

function responseIsSafe(response, requestedUrl) {
  try {
    const finalUrl = new URL(response.url || requestedUrl);
    return finalUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function contentTypeIsSupported(response) {
  const value = String(response.headers.get("content-type") || "").toLowerCase();
  if (!value) return true;
  return ["text/html", "application/xhtml+xml", "application/json", "application/ld+json", "text/plain"]
    .some((type) => value.includes(type));
}

async function finishRun(env, begin, accessToken, values) {
  return callRpc(
    env,
    "finish_event_source_run",
    {
      p_run_id: begin.run_id,
      p_http_status: values.httpStatus ?? null,
      p_outcome: values.outcome,
      p_extracted_count: values.extractedCount || 0,
      p_updated_count: values.updatedCount || 0,
      p_retry_count: values.retryCount || 0,
      p_error_code: values.errorCode || null,
      p_error_message: values.errorMessage || null,
      p_etag: values.etag || null,
      p_last_modified: values.lastModified || null,
      p_server_token: env.BOXSOKU_SERVER_TOKEN
    },
    accessToken
  );
}

function resultError(error) {
  return {
    code: String(error?.code || "source_error").slice(0, 80),
    message: String(error?.message || "source request failed").slice(0, 500)
  };
}

async function syncOneSource(config, env, accessToken, authorizationKind) {
  const begin = await callRpc(
    env,
    "begin_event_source_run",
    {
      p_source_key: config.source_key,
      p_now: new Date().toISOString(),
      p_server_token: env.BOXSOKU_SERVER_TOKEN,
      p_manual: authorizationKind === "admin"
    },
    accessToken
  );
  if (!begin?.started) {
    return {
      sourceKey: config.source_key,
      started: false,
      reason: begin?.reason || "not_due",
      externalRequests: 0,
      candidates: 0
    };
  }

  let fetched;
  try {
    fetched = await fetchSource(config, begin, env);
  } catch (error) {
    const detail = resultError(error);
    await finishRun(env, begin, accessToken, {
      httpStatus: null,
      outcome: "failed",
      retryCount: error.retryCount || Number(begin.max_retries || 0),
      errorCode: detail.code,
      errorMessage: detail.message
    });
    return {
      sourceKey: config.source_key,
      started: true,
      outcome: "failed",
      externalRequests: 1,
      candidates: 0,
      error: detail
    };
  }

  const response = fetched.response;
  const headers = response.headers;
  const common = {
    sourceKey: config.source_key,
    started: true,
    httpStatus: response.status,
    retryCount: fetched.retryCount,
    externalRequests: 1,
    candidates: 0
  };

  if (response.status === 304) {
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "not_modified",
      retryCount: fetched.retryCount,
      etag: headers.get("etag"),
      lastModified: headers.get("last-modified")
    });
    return { ...common, outcome: "not_modified" };
  }

  if (response.status === 403 || response.status === 429) {
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "blocked",
      errorCode: `http_${response.status}`,
      errorMessage: response.status === 429 ? "source rate limited; automation stopped" : "source denied automation",
      etag: headers.get("etag"),
      lastModified: headers.get("last-modified")
    });
    return {
      ...common,
      outcome: "blocked",
      error: { code: `http_${response.status}`, message: "source automation stopped" }
    };
  }

  if (!responseIsSafe(response, begin.source_url)) {
    const error = { code: "unsafe_redirect", message: "source redirected to a non-HTTPS URL" };
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "failed",
      errorCode: error.code,
      errorMessage: error.message
    });
    return { ...common, outcome: "failed", error };
  }

  if (!response.ok) {
    const error = { code: `http_${response.status}`, message: `source returned HTTP ${response.status}` };
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "failed",
      errorCode: error.code,
      errorMessage: error.message,
      etag: headers.get("etag"),
      lastModified: headers.get("last-modified")
    });
    return { ...common, outcome: "failed", error };
  }

  if (!contentTypeIsSupported(response)) {
    const error = { code: "unsupported_content_type", message: "source content type is not HTML or JSON" };
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "failed",
      errorCode: error.code,
      errorMessage: error.message
    });
    return { ...common, outcome: "failed", error };
  }

  const html = await response.text();
  if (byteLength(html) > MAX_RESPONSE_BYTES) {
    const error = { code: "response_too_large", message: "source response exceeded the 1MB limit" };
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "failed",
      errorCode: error.code,
      errorMessage: error.message
    });
    return { ...common, outcome: "failed", error };
  }

  const adapter = getEventSourceAdapter(begin.adapter_key);
  if (!adapter) {
    const error = { code: "adapter_missing", message: "source adapter is not configured" };
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "failed",
      errorCode: error.code,
      errorMessage: error.message
    });
    return { ...common, outcome: "failed", error };
  }

  let parsed;
  try {
    parsed = adapter.parse(config.source_key, html, {
      sourceUrl: begin.source_url,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    const detail = resultError(error);
    await finishRun(env, begin, accessToken, {
      ...common,
      outcome: "needs_review",
      errorCode: "parser_error",
      errorMessage: detail.message
    });
    return { ...common, outcome: "needs_review", error: detail };
  }

  let savedCount = 0;
  const events = Array.isArray(parsed?.events) ? parsed.events : [];
  for (const item of events) {
    try {
      const saved = await callRpc(
        env,
        "save_event_update_candidate",
        {
          p_source_key: config.source_key,
          p_canonical_key: item.event.canonical_key,
          p_normalized_data: item.event,
          p_diff: {},
          p_validation_errors: item.validationErrors || [],
          p_fetched_at: new Date().toISOString(),
          p_server_token: env.BOXSOKU_SERVER_TOKEN
        },
        accessToken
      );
      if (Array.isArray(saved) && saved.length) savedCount += 1;
    } catch (error) {
      const detail = resultError(error);
      await finishRun(env, begin, accessToken, {
        ...common,
        outcome: "failed",
        extractedCount: events.length,
        updatedCount: savedCount,
        retryCount: fetched.retryCount,
        errorCode: "candidate_save_failed",
        errorMessage: detail.message
      });
      return { ...common, outcome: "failed", error: detail };
    }
  }

  const validationCount = events.filter(
    (item) => Array.isArray(item.validationErrors) && item.validationErrors.length
  ).length;
  const extractedCount = Number(parsed?.extractedCount || events.length);
  const outcome = extractedCount === 0 || validationCount > 0 ? "needs_review" : "success";
  await finishRun(env, begin, accessToken, {
    ...common,
    outcome,
    extractedCount,
    updatedCount: savedCount,
    retryCount: fetched.retryCount,
    errorCode: outcome === "needs_review" ? "parser_review" : null,
    errorMessage:
      outcome === "needs_review"
        ? String(parsed?.parserWarnings?.join(", ") || "抽出結果を確認してください。")
        : null,
    etag: headers.get("etag"),
    lastModified: headers.get("last-modified")
  });
  return {
    ...common,
    outcome,
    extractedCount,
    candidates: savedCount,
    validationCount
  };
}

async function parseBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) throw new Error("request too large");
  const text = await request.text();
  if (byteLength(text) > MAX_REQUEST_BYTES) throw new Error("request too large");
  if (!text.trim()) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid request body");
  return value;
}

export async function onRequestPost({ env, request }) {
  if (!configuredEventAutomation(env)) {
    return jsonResponse({ ok: false, message: "興行自動更新が未設定です。" }, 503);
  }
  const authorization = await authorizeEventRequest({ env, request });
  if (!authorization.ok) {
    return jsonResponse({ ok: false, message: authorization.message }, authorization.status);
  }

  let input;
  try {
    input = await parseBody(request);
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message === "request too large" ? "リクエストが大きすぎます。" : "リクエスト形式が正しくありません。" }, error.message === "request too large" ? 413 : 400);
  }
  const requestedSource = String(input.sourceKey || "").trim().toLowerCase();

  try {
    const configs = await callRpc(
      env,
      "list_event_source_configs",
      { p_server_token: env.BOXSOKU_SERVER_TOKEN },
      authorization.token
    );
    const selected = (Array.isArray(configs) ? configs : []).filter(
      (config) => !requestedSource || config.source_key === requestedSource
    );
    if (requestedSource && selected.length === 0) {
      return jsonResponse({ ok: false, message: "指定された公式ソースが見つかりません。" }, 422);
    }
    const results = [];
    for (const config of selected) {
      results.push(
        await syncOneSource(config, env, authorization.token, authorization.kind)
      );
    }
    const failed = results.filter((result) => ["failed", "blocked"].includes(result.outcome));
    return jsonResponse({
      ok: failed.length === 0,
      sourceCount: selected.length,
      externalRequests: results.reduce((sum, result) => sum + Number(result.externalRequests || 0), 0),
      candidateCount: results.reduce((sum, result) => sum + Number(result.candidates || 0), 0),
      results
    }, failed.length ? 502 : 200);
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: "興行情報の同期に失敗しました。" }, 502);
  }
}

async function adminRows(env, resource, query, token) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${resource}?${query}`, {
    headers: supabaseHeaders(env, token)
  });
  if (!response.ok) throw new Error(`${resource} failed (${response.status})`);
  return response.json();
}

export async function onRequestGet({ env, request }) {
  if (!configuredEventAutomation(env)) {
    return jsonResponse({ ok: false, message: "興行自動更新が未設定です。" }, 503);
  }
  const authorization = await authorizeEventRequest({ env, request, allowServerToken: false });
  if (!authorization.ok) {
    return jsonResponse({ ok: false, message: authorization.message }, authorization.status);
  }
  try {
    const [sources, runs] = await Promise.all([
      adminRows(env, "event_source_configs", "select=*&order=source_key.asc", authorization.token),
      adminRows(env, "event_fetch_runs", "select=*&order=fetched_at.desc&limit=30", authorization.token)
    ]);
    return jsonResponse({ ok: true, sources, runs });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: "同期状態を取得できませんでした。" }, 502);
  }
}
