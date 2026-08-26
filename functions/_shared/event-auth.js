import { securityHeaders } from "./security.js";

export const EVENT_JSON_HEADERS = securityHeaders({
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
});

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...EVENT_JSON_HEADERS, ...extraHeaders }
  });
}

export function supabaseHeaders(env, accessToken = env.SUPABASE_ANON_KEY, extra = {}) {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    ...extra
  };
}

function bearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  return /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim() || "";
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

export function hasServerToken(request, env) {
  const configured = String(env.BOXSOKU_SERVER_TOKEN || "");
  if (!configured) return false;
  const headerToken = String(
    request.headers.get("X-Boxsoku-Event-Sync-Token") || ""
  ).trim();
  const authToken = bearerToken(request);
  return headerToken === configured || authToken === configured;
}

async function checkAdminToken(env, token) {
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: supabaseHeaders(env, token)
  });
  if (!userResponse.ok) return false;
  const user = await userResponse.json().catch(() => null);
  const userId = String(user?.id || "");
  if (!userId) return false;
  const query = `admin_users?select=user_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
  const adminResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: supabaseHeaders(env, token)
  });
  if (!adminResponse.ok) return false;
  const rows = await adminResponse.json().catch(() => []);
  return Array.isArray(rows) && rows.length === 1;
}

export async function authorizeEventRequest(
  { env, request, allowServerToken = true } = {}
) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, message: "Supabaseが未設定です。" };
  }

  if (allowServerToken && hasServerToken(request, env)) {
    return { ok: true, kind: "server", token: env.SUPABASE_ANON_KEY };
  }

  if (!sameOrigin(request)) {
    return { ok: false, status: 403, message: "許可されていない送信元です。" };
  }

  const token = bearerToken(request);
  try {
    if (await checkAdminToken(env, token)) {
      return { ok: true, kind: "admin", token };
    }
  } catch {
    return { ok: false, status: 502, message: "管理者認証を確認できませんでした。" };
  }
  return { ok: false, status: 401, message: "管理者権限が必要です。" };
}

export function configuredEventAutomation(env) {
  return Boolean(
    env?.SUPABASE_URL &&
      env?.SUPABASE_ANON_KEY &&
      env?.BOXSOKU_SERVER_TOKEN
  );
}
