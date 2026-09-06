(() => {
  'use strict';

  // RC1: preserve the reader's position while a quiz answer re-renders the app.
  let restoreY = null;
  let armedUntil = 0;
  let restoring = false;
  let clearTimer = 0;

  const quizContext = (target) => {
    if (!(target instanceof Element) || !target.closest('#app')) return null;
    const direct = target.closest('input[type="radio"], input[type="checkbox"]');
    if (direct) return direct;
    const label = target.closest('label');
    if (label?.querySelector('input[type="radio"], input[type="checkbox"]')) return label;
    const button = target.closest('button,[role="radio"],[role="checkbox"]');
    if (!button) return null;
    const signature = `${button.id} ${button.className} ${button.getAttribute('data-testid') || ''} ${button.getAttribute('aria-label') || ''}`.toLowerCase();
    const container = button.closest('[class*="quiz"],[class*="question"],[class*="answer"],[class*="option"],[id*="quiz"],[id*="question"]');
    return /(quiz|question|answer|option|respuesta|pregunta)/.test(signature) || container ? button : null;
  };

  const arm = (event) => {
    if (!quizContext(event.target)) return;
    if (event.type !== 'pointerdown' && restoreY !== null && Date.now() < armedUntil) return;
    restoreY = Math.max(0, window.scrollY);
    armedUntil = Date.now() + 3200;
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      restoreY = null;
      armedUntil = 0;
    }, 3400);
  };

  const restoreIfJumped = () => {
    if (restoring || restoreY === null || Date.now() > armedUntil) return;
    if (window.scrollY >= restoreY - 140) return;
    restoring = true;
    window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => { restoring = false; });
  };

  const scheduleRestores = () => {
    [0, 40, 120, 260, 520, 900, 1500, 2300].forEach((delay) => {
      window.setTimeout(restoreIfJumped, delay);
    });
  };

  document.addEventListener('pointerdown', arm, true);
  document.addEventListener('change', arm, true);
  document.addEventListener('click', arm, true);
  window.addEventListener('scroll', restoreIfJumped, { passive: true });

  const startObserver = () => {
    const app = document.getElementById('app');
    if (!app) return window.setTimeout(startObserver, 80);
    const observer = new MutationObserver(scheduleRestores);
    observer.observe(app, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'checked', 'aria-checked', 'aria-selected'],
    });
  };

  startObserver();
})();
