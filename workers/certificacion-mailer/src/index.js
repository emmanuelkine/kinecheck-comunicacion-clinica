const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/send" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }
    if (!env.EMAIL?.send) return json({ error: "Email binding unavailable" }, 503);

    let details;
    try {
      details = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    if (!details || typeof details.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email) || details.email.length > 160 ||
        typeof details.replyHtml !== "string" || details.replyHtml.length > 8000 ||
        typeof details.replyText !== "string" || details.replyText.length > 4000) {
      return json({ error: "Invalid request" }, 400);
    }

    try {
      const sent = await env.EMAIL.send({
        from: { email: "certificacion@kinecheck.cl", name: "KineCheck" },
        to: details.email,
        subject: "Información sobre certificación — KineCheck",
        html: details.replyHtml,
        text: details.replyText,
      });
      if (!sent?.messageId) {
        console.error("Certification email send returned no messageId");
        return json({ error: "Email send unconfirmed" }, 502);
      }
      return json({ messageId: sent.messageId });
    } catch (error) {
      console.error("Certification email send failed", error?.code || "unknown");
      return json({ error: "Email send failed" }, 502);
    }
  },
};
