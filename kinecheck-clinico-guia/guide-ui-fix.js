(() => {
  "use strict";

  const form = document.querySelector("#guide-form");
  const anon = document.querySelector("#anon-confirm");
  const copyButton = document.querySelector("#copy-summary");
  const printButton = document.querySelector("#print-guide");
  const resetButton = document.querySelector("#reset-guide");

  function syncAnonymityState() {
    if (!form || !anon) return;
    const enabled = Boolean(anon.checked);
    form.querySelectorAll("input, textarea, select").forEach((control) => {
      control.disabled = !enabled;
      control.setAttribute("aria-disabled", String(!enabled));
    });
    form.setAttribute("aria-disabled", String(!enabled));
  }

  anon?.addEventListener("change", () => window.requestAnimationFrame(syncAnonymityState));

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#copy-summary, #print-guide, #reset-guide");
    if (!button) return;

    if (button === copyButton) {
      button.setAttribute("aria-busy", "true");
      const original = button.textContent;
      button.textContent = "Copiando…";
      window.setTimeout(() => {
        button.removeAttribute("aria-busy");
        button.textContent = original;
      }, 650);
    }

    if (button === printButton) {
      button.setAttribute("aria-busy", "true");
      const original = button.textContent;
      button.textContent = "Preparando impresión…";
      window.setTimeout(() => {
        button.removeAttribute("aria-busy");
        button.textContent = original;
      }, 900);
    }

    if (button === resetButton) {
      window.setTimeout(() => {
        syncAnonymityState();
        if (!anon?.checked) anon?.focus({ preventScroll: true });
      }, 0);
    }
  });

  if (form) {
    new MutationObserver(syncAnonymityState).observe(form, { childList: true, subtree: true });
  }

  window.addEventListener("afterprint", () => {
    printButton?.removeAttribute("aria-busy");
    if (printButton) printButton.textContent = "Imprimir o guardar PDF";
  });

  syncAnonymityState();
})();
