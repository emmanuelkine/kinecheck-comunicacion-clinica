(() => {
  const LAYER_ID = "kinecheck-dynamic-watermark";
  const REFRESH_INTERVAL_MS = 30000;
  let activeProfile = null;
  let refreshTimer = 0;
  let resizeTimer = 0;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function maskPart(value, visibleStart = 2, visibleEnd = 1) {
    const text = String(value || "");
    if (text.length <= visibleStart + visibleEnd) {
      return `${text.slice(0, 1)}${"*".repeat(Math.max(2, text.length - 1))}`;
    }
    const tail = visibleEnd > 0 ? text.slice(-visibleEnd) : "";
    return `${text.slice(0, visibleStart)}${"*".repeat(Math.max(3, text.length - visibleStart - visibleEnd))}${tail}`;
  }

  function maskEmail(value) {
    const email = normalizeEmail(value);
    const [local = "", domain = ""] = email.split("@");
    const domainParts = domain.split(".");
    const host = domainParts.shift() || "";
    const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
    return `${maskPart(local, 2, 1)}@${maskPart(host, 2, 0)}${suffix}`;
  }

  function fallbackDigest(value) {
    let first = 2166136261;
    let second = 2246822519;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619);
      second = Math.imul(second ^ code, 3266489917);
    }
    const seed = `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
    return seed.toUpperCase();
  }

  async function digest(value) {
    if (!window.crypto?.subtle || typeof TextEncoder === "undefined") {
      return fallbackDigest(value);
    }
    const bytes = new TextEncoder().encode(value);
    const result = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(result))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  async function createLicenseId(user, licenseScopes) {
    const email = normalizeEmail(user?.email);
    const userId = String(user?.id || "").trim();
    const scopes = [...new Set((licenseScopes || []).map((scope) => String(scope || "").trim()).filter(Boolean))]
      .sort();

    if (!userId || !email || !scopes.length) {
      throw new Error("No fue posible identificar una licencia validada.");
    }

    const fingerprint = await digest(
      ["kinecheck-license-v1", userId, email, ...scopes].join("|"),
    );
    return `KC-${fingerprint.slice(0, 4)}-${fingerprint.slice(4, 8)}-${fingerprint.slice(8, 12)}-${fingerprint.slice(12, 16)}`;
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function formatDateTime(date = new Date()) {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function toBase64(value) {
    if (typeof TextEncoder === "undefined") {
      return window.btoa(window.unescape(encodeURIComponent(value)));
    }
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }

  function buildPattern(profile) {
    const compact = window.matchMedia("(max-width: 640px)").matches;
    const width = compact ? 560 : 700;
    const height = compact ? 330 : 390;
    const centerX = width / 2;
    const centerY = height / 2;
    const lines = [
      { value: "KineCheck", size: compact ? 12 : 14, weight: 800 },
      { value: profile.maskedEmail, size: compact ? 10 : 12, weight: 650 },
      ...(profile.accessLabel ? [{ value: profile.accessLabel, size: compact ? 10 : 12, weight: 850 }] : []),
      { value: `Licencia: ${profile.licenseId}`, size: compact ? 9 : 11, weight: 700 },
      { value: formatDateTime(), size: compact ? 9 : 10, weight: 650 },
      { value: "Uso personal — Prohibida su distribución", size: compact ? 8 : 10, weight: 750 },
    ];
    const lineHeight = compact ? 15 : 18;
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    const text = lines.map((line, index) => (
      `<text x="${centerX}" y="${startY + index * lineHeight}" font-size="${line.size}" font-weight="${line.weight}">${escapeXml(line.value)}</text>`
    )).join("");
    const fillOpacity = compact ? "0.10" : "0.12";
    const strokeOpacity = compact ? "0.05" : "0.07";

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<g transform="rotate(-24 ${centerX} ${centerY})" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" fill="#3d9f9b" fill-opacity="${fillOpacity}" stroke="#173b45" stroke-opacity="${strokeOpacity}" stroke-width="0.35" paint-order="stroke fill">`,
      text,
      "</g>",
      "</svg>",
    ].join("");

    return {
      image: `url("data:image/svg+xml;base64,${toBase64(svg)}")`,
      size: `${width}px ${height}px`,
    };
  }

  function setImportant(element, property, value) {
    element.style.setProperty(property, value, "important");
  }

  function ensureLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = LAYER_ID;
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("data-kinecheck-protection", "buyer-watermark");
      (document.body || document.documentElement).appendChild(layer);
    }

    setImportant(layer, "position", "fixed");
    setImportant(layer, "inset", "0");
    setImportant(layer, "width", "100vw");
    setImportant(layer, "height", "100vh");
    setImportant(layer, "margin", "0");
    setImportant(layer, "padding", "0");
    setImportant(layer, "border", "0");
    setImportant(layer, "display", "block");
    setImportant(layer, "visibility", "visible");
    setImportant(layer, "opacity", "1");
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "user-select", "none");
    setImportant(layer, "-webkit-user-select", "none");
    setImportant(layer, "touch-action", "none");
    setImportant(layer, "overflow", "hidden");
    setImportant(layer, "background-repeat", "repeat");
    setImportant(layer, "background-position", "center");
    setImportant(layer, "z-index", "2147483647");
    return layer;
  }

  function render() {
    if (!activeProfile) return;
    const layer = ensureLayer();
    const pattern = buildPattern(activeProfile);
    setImportant(layer, "background-image", pattern.image);
    setImportant(layer, "background-size", pattern.size);
  }

  function startRefreshTimer() {
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(render, REFRESH_INTERVAL_MS);
  }

  async function showVerifiedBuyer({ user, licenseScopes, accessLabel = "" }) {
    const email = normalizeEmail(user?.email);
    if (!user?.id || !email) {
      throw new Error("La identidad de la sesión no está validada.");
    }

    activeProfile = {
      maskedEmail: maskEmail(email),
      licenseId: await createLicenseId(user, licenseScopes),
      accessLabel: ["PROPIETARIO", "PRUEBA"].includes(String(accessLabel).toUpperCase())
        ? String(accessLabel).toUpperCase()
        : "",
    };
    render();
    startRefreshTimer();
    return { ...activeProfile };
  }

  function hide() {
    activeProfile = null;
    window.clearInterval(refreshTimer);
    window.clearTimeout(resizeTimer);
    document.getElementById(LAYER_ID)?.remove();
  }

  window.addEventListener("resize", () => {
    if (!activeProfile) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(render, 150);
  }, { passive: true });

  document.addEventListener("fullscreenchange", () => {
    if (!activeProfile) return;
    const layer = ensureLayer();
    const fullscreenElement = document.fullscreenElement;
    const canContainOverlay = fullscreenElement
      && !["VIDEO", "IFRAME", "IMG"].includes(fullscreenElement.tagName);
    const target = canContainOverlay ? fullscreenElement : (document.body || document.documentElement);
    if (layer.parentElement !== target) target.appendChild(layer);
    render();
  });

  window.KineCheckWatermark = Object.freeze({
    showVerifiedBuyer,
    hide,
    getStatus() {
      return activeProfile
        ? { visible: Boolean(document.getElementById(LAYER_ID)), ...activeProfile }
        : { visible: false };
    },
  });

})();
