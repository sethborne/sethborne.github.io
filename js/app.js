// Boot: wait until the first view is ready, then hide the first-load spinner.
import {hideFirstLoad} from '../components/loader/loader.js';

// Never hold the spinner longer than this, even if something is slow.
const TIMEOUT_MS = 5000;

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Everything the first view needs before the spinner can go.
// Later PLAN items add their steps to this list.
const whenReady = () =>
  Promise.all([
    document.fonts.ready,
    // content.js: site.json loaded
    // loadContent(),
    // renderFirstView(),   router.js: first route rendered
    // heroImage.decode(),  hero: image decoded
  ]);

const boot = async () => {
  // wait for whenReady() or delay(TIMEOUT_MS), whichever
  // finishes first, then call hideFirstLoad(). catch the error
  try {
    await Promise.race([whenReady(), delay(TIMEOUT_MS)]);
  } catch (err) {
    console.warn(err);
  } finally {
    hideFirstLoad();
  }
  // The spinner must hide even if a readiness step throws.
};

boot();
