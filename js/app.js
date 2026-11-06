// Boot: wait until the first view is ready, then hide the first-load spinner.
import {hideFirstLoad} from '../components/loader/loader.js';
import {createHeader} from '../components/header/header.js';
import {createFooter} from '../components/footer/footer.js';
import {createHero} from '../components/hero/hero.js';
import {createAbout} from '../components/about/about.js';
import {createPage} from '../components/page/page.js';
import {createProjects} from '../components/projects/projects.js';
import {createRouter, FILTER_KEYS, parseHash, SECTIONS, toRoute} from './router.js';
import {loadContent} from './content.js';
import {createScrollMemory} from './scroll-memory.js';
import profile from '../content/profile.js';
import heroContent from '../content/hero.js';
import aboutContent from '../content/about.js';
import projectsSection from '../content/projects-section.js';
import ui from '../content/ui.js';

// Created in boot(); routes update its highlighted link.
let header = null;

// Mouse/touch clicks shouldn't leave focus on a link or button, or the
// next key press (any key) draws a focus ring on it. Keyboard clicks
// (Enter/Space) report detail 0, so keyboard users keep their place.
document.addEventListener('click', (e) => {
  if (e.detail === 0) return;
  e.target.closest('a, button')?.blur();
});

// Never hold the spinner longer than this, even if something is slow.
const TIMEOUT_MS = 5000;

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Fetched once; the spinner and every route change share this promise.
const contentReady = loadContent();

// Everything the first view needs before the spinner can go.
// Components created in boot() pass their own ready promises in.
const whenReady = (...extra) =>
  Promise.all([document.fonts.ready, contentReady, ...extra]);

// {tool: ['a', 'b']} -> '#/?tool=a&tool=b'; {view: ['all']} -> '#/?view=all';
// {} (the Projects view) -> '#/projects'
const filterHash = (query) => {
  const params = new URLSearchParams();
  for (const [facet, ids] of Object.entries(query)) {
    for (const id of ids) params.append(facet, id);
  }
  const search = params.toString();
  return search ? `#/?${search}` : '#/projects';
};

// Home Projects section: filter bar + cards. A chip click only changes
// the URL; the route that follows does the rendering, so a shared link
// and a click take the same path. replace() swaps the history entry
// instead of adding one, so Back leaves the filtered view in one step.
// `projects` is null until content loads; home routes before then have
// nothing to reset, and filter routes wait on projectsReady.
let projects = null;
const projectsReady = contentReady.then((tree) => {
  projects = createProjects(document.getElementById('projectsBody'), {
    tree,
    section: projectsSection,
    facets: FILTER_KEYS,
    onChange: (query) => window.location.replace(filterHash(query)),
  });
  projects.show({});
  return projects;
});

// One view shows at a time. Home is hidden, never rebuilt, so the
// header's section observer keeps its elements.
const homeView = document.getElementById('homeView');
const pageView = document.getElementById('pageView');
const SITE_TITLE = document.title;

// Returns the scroll behavior to use: a jump if the view just changed
// (smooth-scrolling through swapped content looks broken), otherwise
// 'auto', which follows the CSS (smooth, or instant under reduced motion).
const showView = (view) => {
  const changed = view.hidden;
  homeView.hidden = view !== homeView;
  pageView.hidden = view !== pageView;
  return changed ? 'instant' : 'auto';
};

// The view of the route before this one, to tell entering filter mode
// (scroll to Projects) from toggling chips inside it (stay put).
let lastView = null;

// Back, Forward and reload get their saved position back (see
// scroll-memory.js); everything else scrolls as each view decides.
const memory = createScrollMemory();
const jumpTo = (top) => window.scrollTo({top, behavior: 'instant'});

// Restores jump, not scroll: Back should feel instant. Waits for fonts
// and anything else that changes the page's height (the home cards on
// a reload), or the spot would be out of reach or off by a few lines.
const restoreTo = async (top, ...waitFor) => {
  await Promise.all([document.fonts.ready, ...waitFor]);
  jumpTo(top);
};

// Home revisits wait for the cards. Back from a project page with the
// saved spot above the cards (part of the hero still showing) lands on
// the top of Projects instead: the visitor came back to pick another
// card. A reload keeps the exact spot, even in the hero.
const restoreHome = async (top, {fromPage}) => {
  await Promise.all([document.fonts.ready, projectsReady]);
  const projectsTop =
    document.getElementById('projects').getBoundingClientRect().top +
    window.scrollY;
  jumpTo(fromPage && top < projectsTop ? projectsTop : top);
};

const showRoute = async (route, {fresh} = {}) => {
  // First, before any await: history.state still belongs to this route
  const savedY = memory.arrive({fresh});
  header?.setRoute(route);
  const enteredFrom = lastView;
  lastView = route.view;

  if (route.view === 'home') {
    const behavior = showView(homeView);
    document.title = SITE_TITLE;
    // Home never has a filter: back to the project cards. Done before
    // scrolling, so sections below Projects don't move mid-scroll.
    projects?.show({});
    if (savedY !== null) {
      restoreHome(savedY, {fromPage: enteredFrom === 'node'});
      return;
    }
    const target =
      route.section && document.getElementById(route.section);
    if (target) target.scrollIntoView({behavior});
    else window.scrollTo({top: 0, behavior});
    return;
  }

  let tree;
  try {
    tree = await contentReady;
  } catch {
    // boot() already logged why; just say what couldn't be shown.
    console.warn('Content unavailable, cannot show route:', route);
    return;
  }

  if (route.view === 'node') {
    const {element, heading, title} = createPage({tree, path: route.path});
    pageView.replaceChildren(element);
    showView(pageView);
    document.title = `${title} | ${profile.name}`;
    // A new page starts at the top (a revisit, at its saved spot), and
    // focus moves to its heading the way a real page load would, so
    // screen readers announce it.
    if (savedY !== null) restoreTo(savedY);
    else jumpTo(0);
    heading.focus({preventScroll: true});
  } else if (route.view === 'filter') {
    const behavior = showView(homeView);
    document.title = SITE_TITLE;
    await projectsReady;
    projects.show(route.query);
    // Back or reload: the saved spot. Arriving from elsewhere (a shared
    // link, a chip clicked on home): bring Projects into view. Toggling
    // chips leaves the page where it is.
    if (savedY !== null) {
      restoreTo(savedY);
    } else if (enteredFrom !== 'filter') {
      document.getElementById('projects').scrollIntoView({behavior});
    }
  }
};

const router = createRouter({onRoute: showRoute});

const boot = async () => {
  // wait for whenReady() or delay(TIMEOUT_MS), whichever
  // finishes first, then call hideFirstLoad(). catch the error
  try {
    // Set up the first view while the spinner still covers the page.
    // Sections first: the header's highlighting watches their elements.
    const hero = createHero(document.getElementById('home'), {
      hero: heroContent,
    });
    createAbout(document.getElementById('about'), {
      about: aboutContent,
      profile,
    });
    header = createHeader(document.getElementById('siteNav'), {
      name: profile.name,
      sections: SECTIONS,
      labels: ui.nav,
    });
    createFooter(document.getElementById('siteFooter'), {profile});
    router.start();
    // The hero photo only matters when the first view shows it: home and
    // section routes. A deep link to a page (or a filter link, scrolled
    // past the hero) needs just fonts and content.
    const showsHero = toRoute(parseHash(window.location.hash)).view === 'home';
    const extra = showsHero ? [hero.ready, projectsReady] : [projectsReady];
    await Promise.race([whenReady(...extra), delay(TIMEOUT_MS)]);
  } catch (err) {
    console.warn(err);
  } finally {
    hideFirstLoad();
  }
  // The spinner must hide even if a readiness step throws.
};

boot();
