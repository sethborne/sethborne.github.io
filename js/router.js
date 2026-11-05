// Hash router: turns the URL hash into a route descriptor.
// It only describes the route; content.js decides whether a path exists.

// Home sections get routes like #/about. They win over node ids,
// so no content group can share one of these names.
export const SECTIONS = ['projects', 'about'];

// A malformed escape like %E0 would make decodeURIComponent throw.
const safeDecode = (part) => {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};

// '#/textile-contacts/public-map?tool=a&tool=b'
//   -> { path: ['textile-contacts', 'public-map'], query: { tool: ['a', 'b'] } }
export const parseHash = (hash) => {
  const raw = hash.replace(/^#\/?/, '');
  const queryStart = raw.indexOf('?');
  const pathPart = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const queryPart =
    queryStart === -1 ? '' : raw.slice(queryStart + 1);

  const path = pathPart.split('/').filter(Boolean).map(safeDecode);
  const params = new URLSearchParams(queryPart);
  const query = Object.fromEntries(
    [...new Set(params.keys())].map((key) => [
      key,
      params.getAll(key),
    ]),
  );
  return {path, query};
};

// Route descriptors:
//   { view: 'home' }
//   { view: 'home', section: 'about' }
//   { view: 'node', path: ['textile-contacts', 'public-map'] }
//   { view: 'filter', query: { tool: [...], type: [...] } }
//   { view: 'filter', query: { view: ['all'] } }   every app and tool, no filter
export const FILTER_KEYS = ['tool', 'type'];
// Projects section's View tabs: ?view=all lists every app and tool
export const VIEW_KEY = 'view';

export const toRoute = ({path, query}) => {
  // 1. No path at all: home, or filter mode if a filter key (or the
  //    View tabs' key) is present
  if (path.length === 0) {
    const hasFilter = [...FILTER_KEYS, VIEW_KEY].some((key) => key in query);
    return hasFilter ? {view: 'filter', query} : {view: 'home'};
  }
  // 2. if view home and need a section
  // includes search if it exists and if path is something
  if (path.length === 1 && SECTIONS.includes(path[0])) {
    return {view: 'home', section: path[0]};
  }
  // 3. Anything else is a content node
  return {view: 'node', path};
  // return {view: 'home'};
};

// onRoute(route, {fresh}): `fresh` is true when a link to the current
// URL was clicked, so app.js treats it as a new visit, not a revisit.
export const createRouter = ({onRoute}) => {
  const current = () => toRoute(parseHash(window.location.hash));
  const handleChange = () => onRoute(current());

  // hashchange doesn't fire when a link points at the current hash,
  // so re-run the route ourselves (e.g. scroll back to a section).
  const handleClick = (event) => {
    const link = event.target.closest('a[href^="#/"]');
    if (link && link.getAttribute('href') === window.location.hash) {
      onRoute(current(), {fresh: true});
    }
  };

  const start = () => {
    window.addEventListener('hashchange', handleChange);
    document.addEventListener('click', handleClick);
    handleChange();
  };

  const stop = () => {
    window.removeEventListener('hashchange', handleChange);
    document.removeEventListener('click', handleClick);
  };

  return {start, stop};
};
