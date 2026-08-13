import { securityHeaders } from "../_shared/security.js";

const JSON_HEADERS = securityHeaders({
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
});

const MAX_COMMENT_REQUEST_BYTES = 32 * 1024;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    ...extra
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function cleanName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, 24);
}

function cleanBody(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, 1000);
}

function publicComment(row, index = 0) {
  return {
    id: row.id,
    number: index + 1,
    displayName: row.display_name,
    body: row.body,
    visitorId: row.visitor_id,
    createdAt: row.created_at
  };
}

async function visitorId(request, articleId, env) {
  const ip =
    request.headers.get("CF-Connecting-IP") || "unknown";
  const salt = String(env.COMMENT_ID_SALT || "");
  const bytes = new TextEncoder().encode(`${ip}|${articleId}|${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 5)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 9);
}

async function fetchComments(env, articleId) {
  const select = encodeURIComponent(
    "id,article_id,display_name,body,visitor_id,created_at"
  );
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/comments?select=${select}&article_id=eq.${encodeURIComponent(
      articleId
    )}&order=created_at.asc,id.asc`,
    { headers: supabaseHeaders(env) }
  );
  if (!response.ok) throw new Error(`Supabase comments failed: ${response.status}`);
  return response.json();
}

function checkEnvironment(env) {
  return Boolean(
    env.SUPABASE_URL &&
      env.SUPABASE_ANON_KEY &&
      env.COMMENT_ID_SALT &&
      env.BOXSOKU_SERVER_TOKEN
  );
}

export async function onRequestGet({ env, request }) {
  if (!checkEnvironment(env)) {
    return json({ ok: false, message: "コメント機能が未設定です。" }, 503);
  }

  const articleId = new URL(request.url).searchParams.get("article");
  if (!isUuid(articleId)) {
    return json({ ok: false, message: "記事IDが正しくありません。" }, 400);
  }

  try {
    const rows = await fetchComments(env, articleId);
    return json({
      ok: true,
      comments: rows.map(publicComment)
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "コメントを読み込めませんでした。" }, 500);
  }
}

export async function onRequestPost({ env, request }) {
  if (!checkEnvironment(env)) {
    return json({ ok: false, message: "コメント機能が未設定です。" }, 503);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_COMMENT_REQUEST_BYTES) {
    return json({ ok: false, message: "投稿内容が大きすぎます。" }, 413);
  }

  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin) {
    return json({ ok: false, message: "許可されていない送信元です。" }, 403);
  }

  let input;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_COMMENT_REQUEST_BYTES) {
      return json({ ok: false, message: "投稿内容が大きすぎます。" }, 413);
    }
    input = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "投稿内容が正しくありません。" }, 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ ok: false, message: "Invalid request body" }, 400);
  }

  const articleId = String(input.articleId || "");
  const name = cleanName(input.name);
  const body = cleanBody(input.body);

  if (String(input.website || "")) {
    return json({ ok: true, comments: [] }, 201);
  }
  if (!isUuid(articleId) || !name || !body) {
    return json(
      { ok: false, message: "名前とコメントを入力してください。" },
      422
    );
  }

  try {
    const id = await visitorId(request, articleId, env);
    const recentSince = new Date(Date.now() - 10_000).toISOString();
    const recentResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/comments?select=id&article_id=eq.${encodeURIComponent(
        articleId
      )}&visitor_id=eq.${encodeURIComponent(
        id
      )}&created_at=gte.${encodeURIComponent(recentSince)}&limit=1`,
      { headers: supabaseHeaders(env) }
    );
    if (!recentResponse.ok) throw new Error("Comment rate check failed");
    if ((await recentResponse.json()).length) {
      return json(
        { ok: false, message: "連続投稿は10秒空けてください。" },
        429
      );
    }

    const insertResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rpc/submit_comment`,
      {
        method: "POST",
        headers: supabaseHeaders(env, {
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          p_article_id: articleId,
          p_display_name: name,
          p_body: body,
          p_visitor_id: id,
          p_server_token: String(env.BOXSOKU_SERVER_TOKEN)
        })
      }
    );
    if (!insertResponse.ok) {
      throw new Error(`Comment insert failed: ${insertResponse.status}`);
    }

    const insertedRows = await insertResponse.json();
    const inserted = Array.isArray(insertedRows) ? insertedRows[0] : null;
    if (!inserted) throw new Error("Comment insert returned no row");
    const rows = await fetchComments(env, articleId);
    const comments = rows.map(publicComment);
    const number = rows.findIndex((row) => row.id === inserted.id) + 1;

    return json(
      {
        ok: true,
        comment: publicComment(inserted, Math.max(0, number - 1)),
        comments
      },
      201
    );
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "コメントを投稿できませんでした。" }, 500);
  }
}
