(() => {
  const styles = document.querySelectorAll('link[data-deferred-style]');
  const activate = (link) => {
    link.media = 'all';
    link.removeAttribute('data-deferred-style');
  };

  styles.forEach((link) => {
    if (link.sheet) {
      activate(link);
      return;
    }
    link.addEventListener('load', () => activate(link), { once: true });
    link.addEventListener('error', () => link.remove(), { once: true });
  });
})();
