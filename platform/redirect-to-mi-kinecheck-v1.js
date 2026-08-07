(() => {
  "use strict";

  const destination = new URL("../academy/", location.href);
  const current = new URL(location.href);
  current.searchParams.forEach((value, key) => {
    if (key !== "v") destination.searchParams.set(key, value);
  });
  destination.hash = current.hash;
  location.replace(destination.toString());
})();
