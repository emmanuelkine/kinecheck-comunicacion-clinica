import { createClient } from "npm:@supabase/supabase-js@2";

function json(
  request: Request,
  payload: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/*
 * Eventos que conceden o mantienen el acceso.
 */
const ACTIVE_EVENTS = new Set([
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",

  // Compatibilidad con posibles formatos antiguos.
  "APPROVED",
  "COMPLETE",
]);

/*
 * Eventos que bloquean el acceso.
 */
const REVOKE_EVENTS = new Set([
  "PURCHASE_CANCELED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_EXPIRED",
  "PURCHASE_REFUNDED",
  "PURCHASE_DELAYED",

  // Compatibilidad con nombres alternativos.
  "CANCELED",
  "CANCELLED",
  "CHARGEBACK",
  "EXPIRED",
  "REFUNDED",
  "DELAYED",
]);

/*
 * Una cancelación de suscripción evita cobros futuros,
 * pero no siempre significa que el período ya pagado terminó.
 * Se registra, pero no se revoca automáticamente aquí.
 */
const SUBSCRIPTION_EVENTS = new Set([
  "SUBSCRIPTION_CANCELLATION",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_CANCELED",
]);

function asText(value: unknown): string {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function asPositiveNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0
    ? numeric
    : 0;
}

function parseEventDate(value: unknown): string {
  const raw = value ?? Date.now();
  const numeric = Number(raw);

  const parsed = Number.isFinite(numeric)
    ? new Date(
        numeric < 10_000_000_000
          ? numeric * 1000
          : numeric,
      )
    : new Date(String(raw));

  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function extract(payload: Record<string, any>) {
  const data =
    payload.data && typeof payload.data === "object"
      ? payload.data
      : {};

  const purchase =
    data.purchase ||
    payload.purchase ||
    {};

  const buyer =
    data.buyer ||
    payload.buyer ||
    purchase.buyer ||
    {};

  const product =
    data.product ||
    payload.product ||
    purchase.product ||
    {};

  const subscription =
    data.subscription ||
    payload.subscription ||
    {};

  const event = asText(
    payload.event ||
    payload.event_name ||
    payload.status ||
    purchase.status,
  ).toUpperCase();

  const transactionId = asText(
    purchase.transaction ||
    purchase.transaction_id ||
    data.transaction ||
    payload.transaction ||
    payload.transaction_id ||
    subscription.subscriber_code ||
    subscription.subscription_code,
  );

  const productId = asPositiveNumber(
    product.id ||
    product.product_id ||
    data.product_id ||
    payload.prod ||
    payload.product_id,
  );

  const buyerEmail = asText(
    buyer.email ||
    purchase.buyer_email ||
    data.email ||
    payload.email,
  ).toLowerCase();

  const buyerName = asText(
    buyer.name ||
    purchase.buyer_name ||
    data.name ||
    payload.name,
  );

  const eventId = asText(
    payload.id ||
    payload.event_id ||
    payload.eventId,
  );

  const purchasedAt =
    purchase.approved_date ||
    purchase.order_date ||
    purchase.purchase_date ||
    payload.purchase_date ||
    null;

  const eventAt = parseEventDate(
    payload.creation_date ||
    payload.creationDate ||
    payload.event_date ||
    Date.now(),
  );

  return {
    event,
    eventId,
    transactionId,
    productId,
    buyerEmail,
    buyerName,
    purchasedAt,
    eventAt,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(
      request,
      { message: "Método no permitido." },
      405,
    );
  }

  const expectedHottok =
    Deno.env.get("HOTMART_HOTTOK") || "";

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !expectedHottok ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return json(
      request,
      { message: "Webhook incompleto." },
      503,
    );
  }

  const payload =
    await request.json().catch(() => null);

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return json(
      request,
      { message: "JSON no válido." },
      400,
    );
  }

  const receivedHottok =
    request.headers.get("x-hotmart-hottok") ||
    request.headers.get("hottok") ||
    asText(payload.hottok);

  /*
   * Comparación estricta del Hottok.
   * Nunca se registra el valor recibido.
   */
  if (
    !receivedHottok ||
    receivedHottok !== expectedHottok
  ) {
    return json(
      request,
      { message: "Webhook no autorizado." },
      401,
    );
  }

  const event = extract(payload);

  /*
   * Hotmart puede enviar una prueba sin producto real.
   */
  const isHotmartTest =
    event.productId === 0 &&
    Boolean(event.transactionId) &&
    Boolean(event.buyerEmail);

  if (isHotmartTest) {
    return json(request, {
      ok: true,
      status: "test",
      event: event.event,
    });
  }

  /*
   * La cancelación de una suscripción no revoca
   * inmediatamente el período que ya fue pagado.
   */
  if (SUBSCRIPTION_EVENTS.has(event.event)) {
    return json(request, {
      ok: true,
      status: "subscription-cancellation-received",
      event: event.event,
      message:
        "Cancelación registrada. El acceso no se revoca inmediatamente.",
    });
  }

  if (!event.eventId) {
    event.eventId = [
      event.event || "UNKNOWN",
      event.transactionId || "NO_TRANSACTION",
      event.productId || "NO_PRODUCT",
      event.eventAt,
    ].join(":");
  }

  if (
    !event.event ||
    !event.transactionId ||
    !event.productId ||
    !event.buyerEmail
  ) {
    console.error("invalid-hotmart-event", {
      event: event.event,
      hasTransaction:
        Boolean(event.transactionId),
      productId: event.productId,
      hasBuyerEmail:
        Boolean(event.buyerEmail),
    });

    return json(
      request,
      {
        message:
          "Evento sin comprador, producto, transacción o nombre de evento.",
      },
      422,
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  let status = "";

  if (ACTIVE_EVENTS.has(event.event)) {
    status = "active";
  } else if (REVOKE_EVENTS.has(event.event)) {
    status = "revoked";
  }

  /*
   * Los eventos que no cambian acceso se aceptan
   * para evitar reintentos innecesarios de Hotmart.
   */
  if (!status) {
    return json(request, {
      ok: true,
      status: "ignored",
      event: event.event,
    });
  }

  const {
    data: result,
    error: processError,
  } = await admin.rpc(
    "process_hotmart_event",
    {
      p_event_id: event.eventId,
      p_event_name: event.event,
      p_transaction_id:
        event.transactionId,
      p_product_id: event.productId,
      p_buyer_email: event.buyerEmail,
      p_buyer_name: event.buyerName,
      p_status: status,
      p_purchased_at: event.purchasedAt,
      p_event_at: event.eventAt,
    },
  );

  if (processError) {
    console.error(
      "process-hotmart-event",
      {
        code: processError.code,
        message: processError.message,
        event: event.event,
        productId: event.productId,
      },
    );

    return json(
      request,
      {
        message:
          "No fue posible actualizar el acceso.",
      },
      500,
    );
  }

  return json(request, {
    ok: true,
    status,
    event: event.event,
    duplicate: result === "duplicate",
  });
});
