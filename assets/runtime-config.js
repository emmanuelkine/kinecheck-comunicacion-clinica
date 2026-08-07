(() => {
  const hostname = location.hostname.toLowerCase();
  const environment = hostname === "kinecheck.cl" || hostname === "www.kinecheck.cl" ? "production" : "preview";

  window.KINECHECK_RUNTIME = Object.freeze({
    version: "2026.08.07.1",
    environment,
    canonicalOrigin: "https://kinecheck.cl",
    supportEmail: "soporte.kinecheck@gmail.com",
    endpoints: Object.freeze({
      health: "/api/health",
      ready: "/api/ready",
    }),
    features: Object.freeze({
      publicProfileRecommendations: true,
      academyEvidenceAlerts: true,
      labClinico: false,
    }),
  });
})();
