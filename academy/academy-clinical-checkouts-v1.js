(() => {
  "use strict";

  const existing = window.KINECHECK_CLINICAL_CHECKOUTS || {};

  window.KINECHECK_CLINICAL_CHECKOUTS = Object.freeze({
    ...existing,
    "kinecheck-escalas": "https://pay.hotmart.com/G107106119P",
  });
})();
