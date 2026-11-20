const PUBLIC_ASSETS = new Set([
  "/academy-validation-panel/app.js",
  "/academy-validation-panel/styles.css",
]);

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  if (PUBLIC_ASSETS.has(pathname)) return context.next();
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
