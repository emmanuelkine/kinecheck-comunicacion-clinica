import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

const allowedOrigins = new Set([
  "https://kinecheck.cl",
  "https://www.kinecheck.cl",
  "https://emmanuelkine.github.io",
]);

const products = new Set([
  "kinecheck-clinico",
  "kinecheck-estudiante",
  "kinecheck-recupera",
  "comunicacion-clinica",
  "mas-alla-del-dolor",
  "evidencia-aplicada",
  "traumatologia-ortopedia-clinica",
  "pack-estudiante",
  "general",
]);

const categories = new Set([
  "access",
  "purchase",
  "refund",
  "technical",
  "privacy",
  "content",
  "other",
]);

function cors(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.has(origin) ? origin : "https://kinecheck.cl";
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "private, no-store, max-age=0",
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json(origin, { message: "Método no permitido." }, 405);
  if (origin && !allowedOrigins.has(origin)) return json(origin, { message: "Origen no permitido." }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    if (String(body.website || "").trim()) return json(origin, { ok: true });

    const email = String(body.email || "").trim().toLowerCase();
    const category = String(body.category || "other").trim();
    const productSlug = String(body.productSlug || "general").trim();
    const transactionId = String(body.transactionId || "").trim().slice(0, 180);
    const message = String(body.message || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(origin, { message: "Ingresa un correo válido." }, 400);
    }
    if (!categories.has(category)) return json(origin, { message: "Categoría no válida." }, 400);
    if (!products.has(productSlug)) return json(origin, { message: "Producto no válido." }, 400);
    if (message.length < 10 || message.length > 2000) {
      return json(origin, { message: "Describe el problema entre 10 y 2000 caracteres." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(origin, { message: "El soporte no está configurado." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Server-enforced, atomic rate limits for the public support form. Never store raw IPs/emails.
    const hashLimitKey = async (kind: string, value: string) => {
      const bytes = new TextEncoder().encode(`${serviceRoleKey}|support-request|${kind}|${value}`);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    };
    const checkLimit = async (kind: string, value: string, max: number) => {
      const keyHash = await hashLimitKey(kind, value);
      const { data, error } = await admin.rpc("kinecheck_try_public_rate_limit", {
        p_key_hash: keyHash, p_limit: max, p_window_seconds: 3600,
      });
      if (error) { console.error("support-request rate limit", error.code); return "unavailable"; }
      return data === true ? "allowed" : "limited";
    };
    const callerIp = String(req.headers.get("cf-connecting-ip") || "").trim().slice(0, 64);
    if (callerIp) {
      const ipLimit = await checkLimit("ip", callerIp, 50);
      if (ipLimit === "unavailable") return json(origin, { message: "Soporte no disponible temporalmente." }, 503);
      if (ipLimit === "limited") return json(origin, { message: "Demasiadas solicitudes recientes. Espera una hora." }, 429);
    }
    const emailLimit = await checkLimit("email", email, 8);
    if (emailLimit === "unavailable") return json(origin, { message: "Soporte no disponible temporalmente." }, 503);
    if (emailLimit === "limited") return json(origin, { message: "Demasiadas solicitudes recientes. Espera una hora." }, 429);

    let userId: string | null = null;
    const authorization = req.headers.get("authorization") || "";
    if (authorization.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await userClient.auth.getUser();
      if (String(data.user?.email || "").toLowerCase() === email) userId = data.user?.id || null;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from("kinecheck_support_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);
    if ((recentCount || 0) >= 5) {
      return json(origin, { message: "Ya recibimos varias solicitudes recientes. Espera una hora antes de enviar otra." }, 429);
    }

    let priority: "low" | "normal" | "high" | "urgent" = category === "privacy" ? "high" : "normal";
    let code = "manual_review";
    let initialMessage = "Recibimos tu solicitud y será revisada.";
    const diagnosis: Record<string, unknown> = { category, productSlug };

    // Fast-track: si el usuario no conoce el slug del producto pero entrega el código
    // de transacción, resolvemos la compra por la combinación exacta correo + transacción.
    // Nunca se concede acceso por el código por sí solo: cualquier corrección sigue pasando
    // por los registros de compra aprobados y el reconciliador existente.
    if (productSlug === "general" && transactionId && category === "access") {
      const purchaseLookup = await admin
        .from("hotmart_purchases")
        .select("transaction_id,product_id,status,event_name,last_event_at")
        .eq("buyer_email", email)
        .eq("transaction_id", transactionId)
        .maybeSingle();

      const transactionPurchase = purchaseLookup.data || null;
      diagnosis.transactionPurchase = transactionPurchase;

      if (!transactionPurchase) {
        code = "purchase_not_found";
        priority = "high";
        initialMessage = "No encontramos una compra con ese correo y código de transacción. Revisa ambos datos exactamente como aparecen en el correo de Hotmart.";
      } else if (transactionPurchase.status === "revoked") {
        code = "purchase_revoked";
        priority = "low";
        initialMessage = "La transacción registra una devolución, cancelación o reversa, por lo que el acceso no puede activarse.";
      } else if (transactionPurchase.status === "active") {
        const grantsQuery = await admin
          .from("hotmart_product_grants")
          .select("course_slug")
          .eq("product_id", transactionPurchase.product_id);
        const courseSlugs = [...new Set((grantsQuery.data || [])
          .map((item: { course_slug?: string }) => String(item.course_slug || "").trim())
          .filter(Boolean))];
        diagnosis.transactionCourseSlugs = courseSlugs;

        if (!courseSlugs.length) {
          code = "product_mapping_missing";
          priority = "urgent";
          initialMessage = "La compra está aprobada, pero el producto no tiene una ruta de acceso asociada. El caso quedó marcado como prioritario para revisión.";
        } else {
          await admin.rpc("kinecheck_reconcile_hotmart_access");
          const accessQuery = await admin
            .from("course_access")
            .select("course_slug,active,last_event,access_expires_at,transaction_id,access_source")
            .eq("email", email)
            .in("course_slug", courseSlugs);
          const accessRows = accessQuery.data || [];
          diagnosis.reconciledAccess = accessRows;

          const usable = accessRows.filter((row: any) => {
            const expired = row?.access_expires_at && new Date(row.access_expires_at).getTime() <= Date.now();
            return row?.active && !expired;
          });

          if (usable.length) {
            code = "auto_reconciled";
            priority = "low";
            initialMessage = "La compra aparece aprobada y el acceso ya está conciliado. Vuelve a KineCheck e ingresa con el mismo correo de compra.";
          } else {
            code = "sync_issue";
            priority = "urgent";
            initialMessage = "Encontramos una compra aprobada, pero el acceso todavía no quedó utilizable. El caso fue marcado como prioritario para revisión.";
          }
        }
      } else {
        code = "purchase_pending";
        priority = "low";
        initialMessage = "La transacción todavía no figura como compra activa en KineCheck. Espera la confirmación de Hotmart antes de solicitar activación.";
      }
    } else if (productSlug !== "general" && productSlug !== "pack-estudiante") {
      let { data: access } = await admin
        .from("course_access")
        .select("active,last_event,access_expires_at,transaction_id,hotmart_product_id,access_source")
        .eq("email", email)
        .eq("course_slug", productSlug)
        .maybeSingle();

      diagnosis.access = access || null;

      const { data: grants } = await admin
        .from("hotmart_product_grants")
        .select("product_id")
        .eq("course_slug", productSlug);
      const productIds = (grants || []).map((item: { product_id: number }) => item.product_id);

      let purchases: any[] = [];
      if (productIds.length) {
        const purchaseQuery = await admin
          .from("hotmart_purchases")
          .select("transaction_id,product_id,status,event_name,last_event_at")
          .eq("buyer_email", email)
          .in("product_id", productIds)
          .order("last_event_at", { ascending: false })
          .limit(5);
        purchases = purchaseQuery.data || [];
      }
      diagnosis.purchases = purchases;

      const activePurchase = purchases.find((item) => item.status === "active");
      const revokedPurchase = purchases.find((item) => item.status === "revoked");
      const expired = access?.access_expires_at && new Date(access.access_expires_at).getTime() <= Date.now();

      if (access?.active && !expired) {
        code = "license_active";
        priority = category === "technical" ? "normal" : "low";
        initialMessage = "La licencia aparece activa. Cierra sesión, vuelve a ingresar con el mismo correo y prueba nuevamente.";
      } else if (expired || String(access?.last_event || "").toUpperCase() === "ACCESS_TERM_EXPIRED") {
        code = "license_expired";
        priority = "low";
        initialMessage = "El período de acceso registrado ya finalizó. Revisa la vigencia o las opciones de renovación.";
      } else if (revokedPurchase || /REFUND|CANCEL|CHARGEBACK/.test(String(access?.last_event || "").toUpperCase())) {
        code = "purchase_revoked";
        priority = category === "refund" ? "normal" : "low";
        initialMessage = "La compra registra una devolución, cancelación o reversa, por lo que el acceso se encuentra desactivado.";
      } else if (activePurchase && !access?.active) {
        await admin.rpc("kinecheck_reconcile_hotmart_access");
        const refreshed = await admin
          .from("course_access")
          .select("active,last_event,access_expires_at,transaction_id")
          .eq("email", email)
          .eq("course_slug", productSlug)
          .maybeSingle();
        access = refreshed.data;
        diagnosis.reconciledAccess = access || null;
        if (access?.active) {
          code = "auto_reconciled";
          priority = "low";
          initialMessage = "Detectamos y corregimos automáticamente una desincronización. Vuelve a ingresar a KineCheck.";
        } else {
          code = "sync_issue";
          priority = "urgent";
          initialMessage = "Existe una compra activa sin licencia utilizable. El caso quedó marcado como prioritario.";
        }
      } else {
        code = "purchase_not_found";
        priority = category === "purchase" ? "high" : "normal";
        initialMessage = "No encontramos una compra activa para ese correo y producto. Verifica que sea exactamente el correo utilizado en Hotmart.";
      }
    } else if (category === "privacy") {
      code = "privacy_request";
      priority = "high";
      initialMessage = "Tu solicitud de privacidad quedó registrada con prioridad alta. Podemos pedir una verificación razonable de identidad.";
    }

    diagnosis.code = code;
    diagnosis.initialMessage = initialMessage;

    const { data: ticket, error: insertError } = await admin
      .from("kinecheck_support_requests")
      .insert({
        user_id: userId,
        email,
        category,
        product_slug: productSlug === "general" ? null : productSlug,
        transaction_id: transactionId || null,
        message,
        priority,
        automated_diagnosis: diagnosis,
      })
      .select("id,created_at,priority")
      .single();

    if (insertError || !ticket) throw insertError || new Error("No se creó el ticket.");

    await admin.from("kinecheck_notifications").insert({
      email,
      notification_type: "support_ticket_created",
      title: "Solicitud de soporte registrada",
      body: `${initialMessage} Código: ${ticket.id}`,
      action_url: "/soporte/",
      action_label: "Ver soporte",
      dedupe_key: `support-ticket:${ticket.id}`,
      metadata: { ticketId: ticket.id, priority, diagnosisCode: code },
    });

    return json(origin, {
      ok: true,
      ticketId: ticket.id,
      priority,
      diagnosisCode: code,
      message: initialMessage,
    });
  } catch (error) {
    console.error("support-request", error);
    return json(origin, { message: "No fue posible registrar la solicitud. Intenta nuevamente o escribe a soporte.kinecheck@gmail.com." }, 500);
  }
});
