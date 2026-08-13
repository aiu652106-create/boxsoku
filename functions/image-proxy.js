import { securityHeaders } from "./_shared/security.js";

const allowedImageHost = "boxmob.jp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const targetValue = requestUrl.searchParams.get("url") || "";

  let target;
  try {
    target = new URL(targetValue);
  } catch {
    return new Response("Invalid image URL", {
      status: 400,
      headers: securityHeaders({ "Content-Type": "text/plain; charset=UTF-8" })
    });
  }

  if (
    target.protocol !== "https:" ||
    target.hostname !== allowedImageHost ||
    !target.pathname.startsWith("/sp/img/boxer/")
  ) {
    return new Response("Image host is not allowed", {
      status: 403,
      headers: securityHeaders({ "Content-Type": "text/plain; charset=UTF-8" })
    });
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" }
    });
  } catch {
    return new Response("Image unavailable", {
      status: 502,
      headers: securityHeaders({ "Content-Type": "text/plain; charset=UTF-8" })
    });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("Image unavailable", {
      status: 502,
      headers: securityHeaders({ "Content-Type": "text/plain; charset=UTF-8" })
    });
  }

  const contentType = String(upstream.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (!allowedImageTypes.has(contentType) || contentLength > MAX_IMAGE_BYTES) {
    return new Response("Image type or size is not allowed", {
      status: 415,
      headers: securityHeaders({ "Content-Type": "text/plain; charset=UTF-8" })
    });
  }

  const headers = securityHeaders({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
  });
  if (contentLength > 0) {
    return new Response(upstream.body, { headers });
  }

  let streamedBytes = 0;
  const limitedBody = upstream.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        streamedBytes += chunk.byteLength;
        if (streamedBytes > MAX_IMAGE_BYTES) {
          controller.error(new Error("Image is too large"));
          return;
        }
        controller.enqueue(chunk);
      }
    })
  );
  return new Response(limitedBody, { headers });
}
