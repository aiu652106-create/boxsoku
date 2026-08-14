import { securityHeaders } from "../_shared/security.js";

const visitorCookieName = "boxsoku_visitor";
const ownerTrafficCookieName = "boxsoku_owner_traffic";
const MAX_REQUEST_BYTES = 4 * 1024;
const ALLOWED_SERVICES = new Set([
  "a8",
  "amazon",
  "lemino",
  "rakuten",
  "wowow"
]);
const JSON_HEADERS = securityHeaders({
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
});

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function readCookie(header, name) {
  const item = String(header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!item) return "";
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return "";
  }
}

async function hashVisitorToken(token, salt) {
  const input = new TextEncoder().encode(`${salt}:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function cleanSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
}

function cleanPagePath(value) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 300) {
    return "";
  }
  return path.replace(/[\u0000-\u001f\u007f]/g, "");
}

function cleanKey(value, maximumLength) {
  const key = String(value || "").trim().toLowerCase();
  return new RegExp(`^[a-z0-9][a-z0-9-]{0,${maximumLength - 1}}$`).test(key)
    ? key
    : "";
}

function checkEnvironment(env) {
  return Boolean(
    env.SUPABASE_URL &&
      env.SUPABASE_ANON_KEY &&
      env.VISITOR_ID_SALT &&
      env.BOXSOKU_SERVER_TOKEN
  );
}

export async function onRequestPost({ env, request }) {
  const requestUrl = new URL(request.url);
  if (
    requestUrl.searchParams.get("boxsoku_verify") === "1" ||
    request.headers.get("X-Boxsoku-Verify") === "1"
  ) {
    return json({ ok: true, recorded: false });
  }

  if (readCookie(request.headers.get("Cookie"), ownerTrafficCookieName) === "1") {
    return json({ ok: true, recorded: false });
  }

  if (!checkEnvironment(env)) {
    return json({ ok: false, message: "収益導線の計測が未設定です。" }, 503);
  }

  if (request.headers.get("Origin") !== requestUrl.origin) {
    return json({ ok: false, message: "許可されていない送信元です。" }, 403);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "送信内容が大きすぎます。" }, 413);
  }

  let input;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, message: "送信内容が大きすぎます。" }, 413);
    }
    input = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "送信内容が正しくありません。" }, 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ ok: false, message: "送信内容が正しくありません。" }, 400);
  }

  const articleSlug = cleanSlug(input.articleSlug);
  const pagePath = cleanPagePath(input.pagePath);
  const service = cleanKey(input.service, 32);
  const placement = cleanKey(input.placement, 64);
  const item = input.item ? cleanKey(input.item, 100) : "";
  if (
    !pagePath ||
    !ALLOWED_SERVICES.has(service) ||
    !placement ||
    (input.item && !item)
  ) {
    return json({ ok: false, message: "送信内容が正しくありません。" }, 422);
  }

  const existingVisitorToken = readCookie(
    request.headers.get("Cookie"),
    visitorCookieName
  );
  const visitorToken = existingVisitorToken || crypto.randomUUID();
  const visitorHash = await hashVisitorToken(
    visitorToken,
    String(env.VISITOR_ID_SALT)
  );

  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rpc/record_affiliate_click`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_article_slug: articleSlug || null,
          p_page_path: pagePath,
          p_service: service,
          p_placement: placement,
          p_item: item,
          p_visitor_hash: visitorHash,
          p_server_token: String(env.BOXSOKU_SERVER_TOKEN)
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Affiliate click record failed: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "クリックを記録できませんでした。" }, 500);
  }

  const headers = existingVisitorToken
    ? {}
    : {
        "Set-Cookie": `${visitorCookieName}=${encodeURIComponent(
          visitorToken
        )}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`
      };
  return json({ ok: true, recorded: true }, 201, headers);
}
