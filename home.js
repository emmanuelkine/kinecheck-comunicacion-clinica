(() => {
  "use strict";

  const scripts = [
    "./home-core-20260806.js?v=20260806-commercial-proof1",
    "./home-commercial-proof-v1.js?v=20260806-commercial-proof1",
  ];

  function load(index) {
    if (index >= scripts.length) return;
    const source = new URL(scripts[index], location.href).toString();
    if ([...document.scripts].some((script) => script.src === source)) {
      load(index + 1);
      return;
    }
    const script = document.createElement("script");
    script.src = source;
    script.async = false;
    script.onload = () => load(index + 1);
    script.onerror = () => {
      console.error(`No fue posible cargar ${scripts[index]}`);
      load(index + 1);
    };
    document.head.appendChild(script);
  }

  load(0);
})();
