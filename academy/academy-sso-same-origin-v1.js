(() => {
  "use strict";

  const LEGACY_SSO = "https://kinecheck-clinico.emmanuelkine.chatgpt.site/api/license/sso";
  const SAME_ORIGIN_SSO = "/api/license/sso";
  const originalSubmit = HTMLFormElement.prototype.submit;

  function normalize(url) {
    try {
      return new URL(url, window.location.href).toString();
    } catch {
      return String(url || "");
    }
  }

  function rewrite(form) {
    if (!(form instanceof HTMLFormElement)) return;
    if (normalize(form.action) === LEGACY_SSO) {
      form.action = SAME_ORIGIN_SSO;
    }
  }

  HTMLFormElement.prototype.submit = function submit() {
    rewrite(this);
    return originalSubmit.call(this);
  };

  document.addEventListener("submit", (event) => {
    rewrite(event.target);
  }, true);

  window.KINECHECK_SSO_ENDPOINT = SAME_ORIGIN_SSO;
})();
