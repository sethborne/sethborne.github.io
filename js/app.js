// Boot: wait until the first view is ready, then hide the first-load spinner.
import {hideFirstLoad} from '../components/loader/loader.js';
import {createRouter} from './router.js';
import {loadContent, findNode, collectLeaves} from './content.js';

// Never hold the spinner longer than this, even if something is slow.
const TIMEOUT_MS = 5000;

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Fetched once; the spinner and every route change share this promise.
const contentReady = loadContent();

// Everything the first view needs before the spinner can go.
// Later PLAN items add their steps to this list.
const whenReady = () =>
  Promise.all([
    document.fonts.ready,
    contentReady,
    // heroImage.decode(),  hero: image decoded
  ]);

// Temporary until the page component exists: home and its sections are
// static markup, so just scroll. Other views only log lookups for now.
const showRoute = async (route) => {
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
    router.start();
    await Promise.race([whenReady(), delay(TIMEOUT_MS)]);
  } catch (err) {
    console.warn(err);
  } finally {
    hideFirstLoad();
  }
  // The spinner must hide even if a readiness step throws.
};

boot();
