(() => {
  "use strict";

  if (window.__KINECHECK_COMMUNICATION_UI_CLEANUP_V1__) return;
  window.__KINECHECK_COMMUNICATION_UI_CLEANUP_V1__ = true;

  const SESSION_KEY = "kinecheck_secure_session_v1";
  const NOTES_PREFIX = "kinecheck_communication_notes_v1";
  const nativePrompt = window.prompt.bind(window);

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function sessionScope() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      return String(session?.user?.id || "device").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "device";
    } catch {
      return "device";
    }
  }

  function notesKey() {
    return `${NOTES_PREFIX}:${sessionScope()}`;
  }

  function readNotes() {
    try {
      const value = JSON.parse(localStorage.getItem(notesKey()) || "[]");
      return Array.isArray(value) ? value.filter((item) => item && Number(item.slide) > 0 && typeof item.text === "string") : [];
    } catch {
      return [];
    }
  }

  function writeNote(slide, text) {
    const cleanText = String(text || "").trim();
    const slideNumber = Math.max(1, Math.floor(Number(slide) || 0));
    if (!slideNumber) return;
    const notes = readNotes().filter((item) => Number(item.slide) !== slideNumber);
    if (cleanText) {
      notes.push({ slide: slideNumber, text: cleanText, updatedAt: new Date().toISOString() });
      notes.sort((a, b) => Number(a.slide) - Number(b.slide));
    }
    try { localStorage.setItem(notesKey(), JSON.stringify(notes)); } catch {}
    updateNotesButton();
  }

  function installNoteCapture() {
    if (window.__KINECHECK_COMMUNICATION_NOTE_CAPTURE_V1__) return;
    window.__KINECHECK_COMMUNICATION_NOTE_CAPTURE_V1__ = true;
    window.prompt = (message, defaultValue) => {
      const result = nativePrompt(message, defaultValue);
      const match = String(message || "").match(/nota\s+para\s+la\s+diapositiva\s*(\d+)/i);
      if (match && result !== null) writeNote(match[1], result);
      return result;
    };
  }

  function ensureRc1Styles() {
    if (document.getElementById("kc-communication-rc1-styles")) return;
    const style = document.createElement("style");
    style.id = "kc-communication-rc1-styles";
    style.textContent = `
      #root [data-kc-rc1-light-card="true"] {
        background:#fff7ef!important;
        border-color:#d97955!important;
      }
      #root [data-kc-rc1-light-card="true"],
      #root [data-kc-rc1-light-card="true"] * {
        color:#102f37!important;
        -webkit-text-fill-color:#102f37!important;
        text-shadow:none!important;
        opacity:1!important;
      }
      #root [data-kc-rc1-light-card="true"] a {
        color:#075f69!important;
        -webkit-text-fill-color:#075f69!important;
        text-decoration-color:currentColor!important;
      }
      #root [data-kc-rc1-disabled-route="true"]{
        opacity:.62!important;
        cursor:not-allowed!important;
        pointer-events:none!important;
      }
      #root .kc-rc1-notes-button{margin-left:.35rem!important}
      #kc-rc1-notes-dialog[hidden]{display:none!important}
      #kc-rc1-notes-dialog{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(2,12,17,.78);backdrop-filter:blur(7px)}
      #kc-rc1-notes-dialog .kc-notes-panel{width:min(620px,100%);max-height:min(78vh,720px);overflow:auto;padding:22px;border:1px solid rgba(88,218,207,.30);border-radius:20px;background:#082832;color:#f5fbfc;box-shadow:0 28px 90px rgba(0,0,0,.45)}
      #kc-rc1-notes-dialog .kc-notes-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      #kc-rc1-notes-dialog h2{margin:0;color:#fff;font-size:1.35rem}
      #kc-rc1-notes-dialog .kc-notes-close{min-width:42px;min-height:42px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-size:1.15rem;cursor:pointer}
      #kc-rc1-notes-dialog .kc-note-item{padding:13px 0;border-top:1px solid rgba(255,255,255,.10)}
      #kc-rc1-notes-dialog .kc-note-item:first-of-type{border-top:0}
      #kc-rc1-notes-dialog .kc-note-item strong{display:block;margin-bottom:5px;color:#72e1d3}
      #kc-rc1-notes-dialog .kc-note-item p{margin:0;color:#e2eff1;line-height:1.5;white-space:pre-wrap}
      #kc-rc1-notes-dialog .kc-notes-empty{margin:0;color:#b9cdd1}
      @media(max-width:640px){
        #root,#root *{max-width:100%;box-sizing:border-box}
        #root h1,#root h2,#root h3{overflow-wrap:anywhere;word-break:normal;hyphens:auto}
        #kc-rc1-notes-dialog{padding:10px;align-items:end}
        #kc-rc1-notes-dialog .kc-notes-panel{max-height:82vh;border-radius:20px 20px 10px 10px}
      }
    `;
    document.head.appendChild(style);
  }

  function hideMisleadingEcosystemButton() {
    const root = document.querySelector("#root");
    if (!root) return;

    root.querySelectorAll("a,button").forEach((control) => {
      if (normalizeText(control.textContent) !== "ecosistema") return;

      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      control.setAttribute("tabindex", "-1");
      control.style.setProperty("display", "none", "important");
    });
  }

  function parseRgb(value) {
    const match = String(value || "").match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/i);
    if (!match) return null;
    return { r:Number(match[1]), g:Number(match[2]), b:Number(match[3]), a:match[4] == null ? 1 : Number(match[4]) };
  }

  function findLightContainer(node, root) {
    let current = node instanceof Element ? node : node?.parentElement;
    let fallback = current;
    for (let depth = 0; current && current !== root && depth < 7; depth += 1, current = current.parentElement) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= 180 && rect.height >= 60) fallback = current;
      const rgb = parseRgb(getComputedStyle(current).backgroundColor);
      if (!rgb || rgb.a < 0.15) continue;
      const luminance = (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
      if (luminance >= 155) return current;
    }
    return fallback;
  }

  function repairLightCardContrast() {
    const root = document.querySelector("#root");
    if (!root) return;
    const phrase = "clase completa, no resumen";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!normalizeText(node.nodeValue).includes(phrase)) continue;
      const container = findLightContainer(node, root);
      if (container) container.setAttribute("data-kc-rc1-light-card", "true");
    }
  }

  function hideInertDotLaunchers() {
    const root = document.querySelector("#root");
    if (!root) return;
    const dotLabels = new Set(["...", "•••", "⋯", "···"]);
    root.querySelectorAll("button").forEach((button) => {
      const label = normalizeText(button.textContent);
      if (!dotLabels.has(label)) return;
      const style = getComputedStyle(button);
      const unlabeled = !button.getAttribute("aria-label") && !button.getAttribute("aria-controls") && !button.getAttribute("title");
      if (style.position !== "fixed" || !unlabeled) return;
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.setAttribute("tabindex", "-1");
      button.style.setProperty("display", "none", "important");
    });
  }

  function repairEcosystemRoutes() {
    const root = document.querySelector("#root");
    if (!root) return;

    root.querySelectorAll("a,button").forEach((control) => {
      const label = normalizeText(control.textContent);
      const card = control.closest("article,section,.card,.route-card,div");
      const cardText = normalizeText(card?.textContent);

      if (label === "abrir ruta" && cardText.includes("kinecheck masterclass msk")) {
        const route = "/kinecheck-clinico-curso/?course=kinecheck-clinico-curso&v=20260906-rc1c";
        control.dataset.kcRc1Route = route;
        if (control.tagName === "A") control.setAttribute("href", route);
      }

      if (label === "enlace pendiente") {
        control.textContent = "Próximamente";
        control.setAttribute("aria-disabled", "true");
        control.setAttribute("data-kc-rc1-disabled-route", "true");
        control.removeAttribute("href");
        if ("disabled" in control) control.disabled = true;
      }
    });
  }

  function findSlideJumpInput(button) {
    let current = button?.parentElement;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const input = current.querySelector('input[type="number"], input[inputmode="numeric"], input[type="text"]');
      if (input && /ir\s+a/i.test(String(current.textContent || ""))) return input;
    }
    return null;
  }

  function repairSlideJumpControls() {
    const root = document.querySelector("#root");
    if (!root) return;
    root.querySelectorAll("button").forEach((button) => {
      if (normalizeText(button.textContent) !== "abrir") return;
      const input = findSlideJumpInput(button);
      if (!input) return;
      button.dataset.kcRc1SlideJump = "true";
      button.textContent = "Ir";
      button.setAttribute("aria-label", "Ir a la diapositiva indicada");
      input.setAttribute("aria-label", input.getAttribute("aria-label") || "Número de diapositiva");
      if (input.dataset.kcRc1SlideJumpWired === "true") return;
      input.dataset.kcRc1SlideJumpWired = "true";
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        button.click();
      });
    });
  }

  function primeSlideJump(button) {
    const input = findSlideJumpInput(button);
    if (!input) return;
    const value = String(input.value || "").trim();
    if (!/^\d+$/.test(value)) return;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function normalizeSourceLinks() {
    const root = document.querySelector("#root");
    if (!root) return;
    root.querySelectorAll('a[href]').forEach((link) => {
      let url;
      try { url = new URL(link.href, location.href); } catch { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin !== location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    });
  }

  function notesButton() {
    return document.querySelector("#root .kc-rc1-notes-button");
  }

  function updateNotesButton() {
    const button = notesButton();
    if (!button) return;
    const count = readNotes().length;
    button.textContent = count ? `Mis notas (${count})` : "Mis notas";
    button.setAttribute("aria-label", count ? `Abrir mis notas, ${count} guardadas` : "Abrir mis notas");
  }

  function ensureNotesAccess() {
    const root = document.querySelector("#root");
    if (!root || notesButton()) return;
    const addButton = [...root.querySelectorAll("button,a")]
      .find((control) => normalizeText(control.textContent) === "añadir nota");
    if (!addButton) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${addButton.className || ""} kc-rc1-notes-button`.trim();
    button.textContent = "Mis notas";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openNotesDialog();
    });
    addButton.insertAdjacentElement("afterend", button);
    updateNotesButton();
  }

  function openNotesDialog() {
    let dialog = document.getElementById("kc-rc1-notes-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "kc-rc1-notes-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "kc-rc1-notes-title");
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target.closest(".kc-notes-close")) closeNotesDialog();
      });
      document.body.appendChild(dialog);
    }
    const notes = readNotes();
    dialog.innerHTML = `
      <div class="kc-notes-panel">
        <div class="kc-notes-head"><h2 id="kc-rc1-notes-title">Mis notas</h2><button class="kc-notes-close" type="button" aria-label="Cerrar notas">×</button></div>
        ${notes.length
          ? notes.map((note) => `<article class="kc-note-item"><strong>Diapositiva ${Number(note.slide)}</strong><p>${escapeHtml(note.text)}</p></article>`).join("")
          : '<p class="kc-notes-empty">Todavía no has guardado notas en este dispositivo.</p>'}
      </div>`;
    dialog.hidden = false;
    dialog.querySelector(".kc-notes-close")?.focus();
  }

  function closeNotesDialog() {
    const dialog = document.getElementById("kc-rc1-notes-dialog");
    if (dialog) dialog.hidden = true;
    notesButton()?.focus();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
    })[character]);
  }

  function repair() {
    ensureRc1Styles();
    hideMisleadingEcosystemButton();
    repairLightCardContrast();
    hideInertDotLaunchers();
    repairEcosystemRoutes();
    repairSlideJumpControls();
    normalizeSourceLinks();
    ensureNotesAccess();
  }

  function start() {
    const root = document.querySelector("#root");
    if (!root) return;

    installNoteCapture();
    repair();

    root.addEventListener("click", (event) => {
      const route = event.target instanceof Element ? event.target.closest("[data-kc-rc1-route]") : null;
      if (route) {
        event.preventDefault();
        event.stopImmediatePropagation();
        location.assign(route.dataset.kcRc1Route);
        return;
      }
      const slideJump = event.target instanceof Element ? event.target.closest("[data-kc-rc1-slide-jump]") : null;
      if (slideJump) primeSlideJump(slideJump);
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.getElementById("kc-rc1-notes-dialog")?.hidden) closeNotesDialog();
    });

    const observer = new MutationObserver(() => {
      repair();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });
  }

  installNoteCapture();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
