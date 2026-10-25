// Boot: wait until the first view is ready, then hide the first-load spinner.
import {hideFirstLoad} from '../components/loader/loader.js';
import {createHeader} from '../components/header/header.js';
import {createFooter} from '../components/footer/footer.js';
import {createHero} from '../components/hero/hero.js';
import {createRouter, SECTIONS} from './router.js';
import {loadContent, findNode, collectLeaves} from './content.js';
import profile from '../content/profile.js';
import heroContent from '../content/hero.js';

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

// Temporary until the page component exists: home and its sections are
// static markup, so just scroll. Other views only log lookups for now.
const showRoute = async (route) => {
  header?.setRoute(route);

  if (route.view === 'home') {
    const target =
      route.section && document.getElementById(route.section);
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
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
    const node = findNode(tree, route.path);
    console.info(
      node
        ? `Found: ${node.title}`
        : `Not found: ${route.path.join('/')}`,
    );
  } else if (route.view === 'filter') {
    const leaves = collectLeaves(tree);
    console.info(`Filter: ${leaves.length} leaves before filtering`, route.query);
  }
};

const router = createRouter({onRoute: showRoute});

const boot = async () => {
  // wait for whenReady() or delay(TIMEOUT_MS), whichever
  // finishes first, then call hideFirstLoad(). catch the error
  try {
    // Set up the first view while the spinner still covers the page.
    // Hero first: the header's highlighting watches the #home section.
    const hero = createHero(document.getElementById('home'), {
      hero: heroContent,
    });
    header = createHeader(document.getElementById('siteNav'), {
      name: profile.name,
      sections: SECTIONS,
    });
    createFooter(document.getElementById('siteFooter'), {profile});
    router.start();
    await Promise.race([whenReady(hero.ready), delay(TIMEOUT_MS)]);
  } catch (err) {
    console.warn(err);
  } finally {
    hideFirstLoad();
  }
  // The spinner must hide even if a readiness step throws.
};

boot();
