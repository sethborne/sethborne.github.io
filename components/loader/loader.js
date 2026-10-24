// First-load spinner: markup and styles live in index.html so it shows
// before any JS runs. This module only takes it away.

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hideFirstLoad = () => {
  const loader = document.getElementById('loader');
  if (!loader) return;

  if (prefersReducedMotion()) {
    loader.remove();
    return;
  }

  loader.classList.add('is-done');
  loader.addEventListener('transitionend', () => loader.remove(), {
    once: true,
  });
  // Backup: if the CSS safety net already hid it, no transition runs
  // and transitionend never fires.
  setTimeout(() => loader.remove(), 600);
};
