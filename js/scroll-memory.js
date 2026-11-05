// Scroll memory: Back, Forward and reload return to where you were;
// link clicks start fresh (top, or their section).
//
// How it tells them apart: history.state is data stored on one history
// entry. A link click (or a chip's location.replace()) makes an entry
// with empty state, while Back, Forward and reload return to an entry
// whose state is still there. So an entry without a key is a fresh
// visit, and one with a key is a revisit.

const STORE_KEY = 'scrollMemory';
const SAVE_DELAY_MS = 150;

// sessionStorage survives a reload and clears when the tab closes. It
// can also be blocked (privacy settings); then positions last for this
// page load only, which still covers Back and Forward.
const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const store = (positions) => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(positions));
  } catch {
    // Blocked or full: keep the in-memory copy
  }
};

const newKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createScrollMemory = () => {
  // The browser tries to restore scroll on its own, then app.js renders
  // the page and overrides it. 'manual' tells it to stand down.
  history.scrollRestoration = 'manual';

  const positions = load();
  const currentKey = () => history.state?.scrollKey;

  // Save while scrolling, not on leaving: hashchange fires after the URL
  // has changed, when history.state already belongs to the next entry.
  // The key is read at event time, so each position lands on its own entry.
  let saveTimer = null;
  window.addEventListener(
    'scroll',
    () => {
      const key = currentKey();
      if (!key) return;
      positions[key] = Math.round(window.scrollY);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => store(positions), SAVE_DELAY_MS);
    },
    {passive: true},
  );
  // Closing or reloading inside the debounce window still saves
  window.addEventListener('pagehide', () => store(positions));

  // Call first thing on every route. Returns the saved scroll position
  // for a revisit, or null for a fresh visit (and tags the entry, so a
  // later Back to it is a revisit). `fresh` forces a fresh visit: a click
  // on a link to the current URL makes no new entry.
  const arrive = ({fresh = false} = {}) => {
    const key = currentKey();
    if (key && !fresh) return positions[key] ?? null;
    if (!key) {
      // No URL argument: the URL stays as it is
      history.replaceState({...history.state, scrollKey: newKey()}, '');
    }
    return null;
  };

  return {arrive};
};
