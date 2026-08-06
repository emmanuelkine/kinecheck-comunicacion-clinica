(() => {
  "use strict";

  const destination = new URL("../academy/", location.href);
  const current = new URL(location.href);
  current.searchParams.forEach((value, key) => destination.searchParams.set(key, value));
  destination.searchParams.set("v", "20260806-unified1");
  destination.hash = current.hash;
  location.replace(destination.toString());
})();
