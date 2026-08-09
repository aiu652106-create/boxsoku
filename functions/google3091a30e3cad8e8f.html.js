const verificationText =
  "google-site-verification: google3091a30e3cad8e8f.html\n";

export async function onRequest() {
  return new Response(verificationText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
