(() => {
  'use strict';

  // RC1: preserve the reader's position when a quiz answer re-renders the app.
  let restoreY = null;
  let armedAt = 0;

  const isQuizControl = (target) => {
    if (!(target instanceof Element)) return false;
    if (!target.closest('#app')) return false;
    return Boolean(target.closest('input[type="radio"], input[type="checkbox"], button, label'));
  };

  const arm = (event) => {
    if (!isQuizControl(event.target)) return;
    restoreY = window.scrollY;
    armedAt = Date.now();
  };

  const restoreIfJumped = () => {
    if (restoreY === null || Date.now() - armedAt > 1200) return;
    const delta = restoreY - window.scrollY;
    if (delta > 160) window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
  };

  document.addEventListener('pointerdown', arm, true);
  document.addEventListener('change', arm, true);
  document.addEventListener('click', arm, true);

  const app = document.getElementById('app');
  if (app) {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        restoreIfJumped();
        setTimeout(restoreIfJumped, 40);
        setTimeout(restoreIfJumped, 140);
      });
    });
    observer.observe(app, { childList: true, subtree: true });
  }
})();
