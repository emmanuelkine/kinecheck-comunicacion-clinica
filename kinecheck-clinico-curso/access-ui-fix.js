(() => {
  "use strict";

  const form = document.querySelector("#auth-form");
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const message = document.querySelector("#auth-message");
  const progress = document.querySelector("#access-progress");
  const tabs = document.querySelector(".auth-tabs");
  const loginTab = document.querySelector("#login-tab");
  const signupTab = document.querySelector("#signup-tab");
  const submit = document.querySelector("#auth-submit");
  const signOut = document.querySelector("#sign-out");
  const root = document.querySelector("#root");

  function showValidation(text, target) {
    if (progress) progress.hidden = true;
    if (form) form.hidden = false;
    if (tabs) tabs.hidden = false;
    if (signOut) signOut.hidden = true;
    if (message) {
      message.textContent = text;
      message.className = "notice notice-error";
      message.hidden = false;
    }
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form?.addEventListener("submit", (event) => {
    const emailValid = Boolean(email?.value.trim()) && Boolean(email?.checkValidity());
    const passwordValid = (password?.value || "").length >= 8;
    if (emailValid && passwordValid) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!emailValid) {
      showValidation("Ingresa un correo válido asociado a tu compra.", email);
      return;
    }
    showValidation("La contraseña debe tener al menos 8 caracteres.", password);
  }, true);

  [email, password].forEach((input) => {
    input?.addEventListener("input", () => {
      if (message?.classList.contains("notice-error")) message.hidden = true;
    });
  });

  function syncBusyState() {
    const busy = Boolean(progress && !progress.hidden);
    if (tabs) tabs.hidden = busy;
    [loginTab, signupTab, submit, email, password].forEach((control) => {
      if (control) control.disabled = busy;
    });
    form?.setAttribute("aria-busy", String(busy));
    submit?.setAttribute("aria-busy", String(busy));
  }

  if (progress) {
    new MutationObserver(syncBusyState).observe(progress, { attributes: true, attributeFilter: ["hidden"] });
  }
  syncBusyState();

  function syncCourseControls() {
    const sidebar = root?.querySelector("[data-sidebar]");
    const toggle = root?.querySelector("[data-toggle-sidebar]");
    const actions = root?.querySelector(".kc-top-actions");

    if (sidebar && !sidebar.id) sidebar.id = "kc-course-sidebar";
    if (toggle) {
      toggle.setAttribute("aria-controls", sidebar?.id || "kc-course-sidebar");
      toggle.setAttribute("aria-expanded", String(Boolean(sidebar?.classList.contains("open"))));
      toggle.setAttribute("aria-label", sidebar?.classList.contains("open") ? "Cerrar temario" : "Abrir temario");
    }

    if (actions && signOut && signOut.parentElement !== actions) {
      signOut.textContent = "Cerrar sesión";
      signOut.classList.add("kc-sign-out");
      actions.appendChild(signOut);
    }

    root?.querySelectorAll("[data-open-module]").forEach((button) => {
      const active = button.classList.contains("active");
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    root?.querySelectorAll("button").forEach((button) => {
      if (button.disabled) button.setAttribute("aria-disabled", "true");
      else button.removeAttribute("aria-disabled");
    });
  }

  root?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-sidebar]");
    const navigation = event.target.closest("[data-open-module], [data-module-step]");
    if (toggle || navigation) window.requestAnimationFrame(syncCourseControls);
  }, true);

  signOut?.addEventListener("click", () => {
    signOut.disabled = true;
    signOut.setAttribute("aria-busy", "true");
    signOut.textContent = "Cerrando…";
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const sidebar = root?.querySelector("[data-sidebar]");
    if (!sidebar?.classList.contains("open")) return;
    sidebar.classList.remove("open");
    syncCourseControls();
    root?.querySelector("[data-toggle-sidebar]")?.focus();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 940) {
      root?.querySelector("[data-sidebar]")?.classList.remove("open");
      syncCourseControls();
    }
  });

  if (root) {
    new MutationObserver(syncCourseControls).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "hidden"],
    });
  }
  syncCourseControls();
})();
