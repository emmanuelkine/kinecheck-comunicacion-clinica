const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const nombre = String(body.nombre || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const curso = String(body.curso || "").trim();
  if (body.website) return json({ message: "Solicitud recibida." });
  if (!nombre || nombre.length > 100 || !email || email.length > 160 || !curso || curso.length > 120 || !body.consentimiento) {
    return json({ error: "Completa todos los campos obligatorios." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Ingresa un correo electrónico válido." }, 400);
  }
  if (!env.CERT_EMAIL_SERVICE) {
    return json({ error: "El envío de correo no está disponible en este momento. Inténtalo más tarde." }, 503);
  }

  const details = {
    nombre, email, curso, fecha: new Date().toISOString(),
    subject: "Información sobre certificación — KineCheck",
    replyHtml: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#102c33"><h1>Información sobre certificación</h1><p>Hola ${escapeHtml(nombre)},</p><p>Recibimos tu solicitud de información sobre certificación para <strong>${escapeHtml(curso)}</strong>.</p><p>Los recursos gratuitos de KineCheck no incluyen certificación. En cursos seleccionados, quienes adquieren la formación podrán acceder a certificación de sus horas de estudio a través de una OTEC, según las condiciones específicas del curso.</p><p>Las horas certificables, requisitos, entidad emisora y eventuales costos se informarán para cada curso antes de solicitar la certificación.</p><p>Este mensaje informativo no constituye por sí mismo la emisión de un certificado ni una inscripción.</p><p><strong>KineCheck</strong><br>Educación, evidencia científica y razonamiento clínico musculoesquelético.</p></div>`,
    replyText: `Información sobre certificación\n\nHola ${nombre},\n\nRecibimos tu solicitud de información sobre certificación para ${curso}.\n\nLos recursos gratuitos de KineCheck no incluyen certificación. En cursos seleccionados, quienes adquieren la formación podrán acceder a certificación de sus horas de estudio a través de una OTEC, según las condiciones específicas del curso.\n\nLas horas certificables, requisitos, entidad emisora y eventuales costos se informarán para cada curso antes de solicitar la certificación.\n\nEste mensaje informativo no constituye por sí mismo la emisión de un certificado ni una inscripción.\n\nKineCheck — Educación, evidencia científica y razonamiento clínico musculoesquelético.`,
  };

  try {
    const result = await env.CERT_EMAIL_SERVICE.fetch("https://certificacion.kinecheck.internal/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(details),
    });
    if (!result.ok) {
      console.error("Certification email service rejected the request", result.status);
      return json({ error: "No pudimos enviar el correo. Inténtalo nuevamente." }, 502);
    }
  } catch (error) {
    console.error("Certification email service unavailable", error);
    return json({ error: "No pudimos enviar el correo. Inténtalo nuevamente." }, 502);
  }

  if (env.CERT_REQUESTS) {
    try {
      await env.CERT_REQUESTS.put("cert:" + Date.now() + ":" + crypto.randomUUID(), JSON.stringify(details), { expirationTtl: 7776000 });
    } catch (error) {
      console.error("Certification request history unavailable", error);
    }
  }
  return json({ message: "Solicitud recibida. Te enviamos la información disponible a tu correo." });
}

export function onRequestGet() {
  return json({ error: "Método no permitido." }, 405);
}
