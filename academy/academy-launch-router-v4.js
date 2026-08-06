(() => {
  "use strict";
  if (window.__KINECHECK_OPEN_V6__ || document.querySelector('script[data-kc-open-v6]')) return;
  const script = document.createElement("script");
  script.src = "./academy-open-v6.js?v=20260806-final4";
  script.defer = true;
  script.dataset.kcOpenV6 = "true";
  document.head.appendChild(script);
})();
