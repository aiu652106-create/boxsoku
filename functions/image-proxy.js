const allowedImageHost = "boxmob.jp";

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const targetValue = requestUrl.searchParams.get("url") || "";

  let target;
  try {
    target = new URL(targetValue);
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }

  if (
    target.protocol !== "https:" ||
    target.hostname !== allowedImageHost ||
    !target.pathname.startsWith("/sp/img/boxer/")
  ) {
    return new Response("Image host is not allowed", { status: 403 });
  }

  const upstream = await fetch(target.href, {
    headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" }
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Image unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "image/jpeg"
  );
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return new Response(upstream.body, { headers });
}
