(() => {
  if (window.__KINECHECK_NETWORK_GUARD__) return;
  window.__KINECHECK_NETWORK_GUARD__ = true;

  const nativeFetch = window.fetch.bind(window);
  const TIMEOUT_MS = 15000;

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const isSupabaseRequest = url.includes(".supabase.co");

    if (!isSupabaseRequest || init.signal) {
      return nativeFetch(input, init);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await nativeFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("La conexión tardó demasiado. Revisa tu señal o Wi-Fi y vuelve a intentar.");
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  };
})();
