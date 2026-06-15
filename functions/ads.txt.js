function publisherId(value) {
  const match = String(value || "")
    .trim()
    .match(/^(?:ca-)?pub-(\d{16})$/);
  return match ? `pub-${match[1]}` : "";
}

export function onRequestGet({ env }) {
  const id = publisherId(
    env.ADSENSE_PUBLISHER_ID || env.ADSENSE_CLIENT || ""
  );
  const body = id
    ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`
    : "# AdSense承認後にCloudflare PagesのADSENSE_PUBLISHER_IDを設定してください。\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
