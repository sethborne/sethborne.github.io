// Home hero: intro text over a background photo, or a slideshow of them.
// Fills <section id="home"> and returns {ready} for the spinner.
// Settings live in content/hero.js (SLIDESHOW, SLIDE_SECONDS, TRANSITION).
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

// How one photo gives way to the next. Each name becomes a class on the
// photo layer (.is-fade, ...), and its look lives in hero.css. Pick one
// with TRANSITION in content/hero.js.
//   fade   the next photo fades in over the current one (1s crossfade)
//   slide  the next photo pushes in from the right and the current one
//          moves out left (0.8s); going back (a lower dot, Left arrow,
//          swipe right) runs the other way
//   zoom   a crossfade, plus a slow push-in (to 108%) that lasts the
//          whole time a photo shows, so the hero is never quite still
//   none   an instant cut, no animation
// Adding one: its name here, plus a CSS block in hero.css.
const TRANSITIONS = ['fade', 'slide', 'zoom', 'none'];
const DEFAULT_TRANSITION = 'fade';

// A swipe shorter than this is a tap or a wobble, not a swipe
const SWIPE_MIN = 50;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ['Web developer', 'building'] -> Web developer<br>building
const withBreaks = (lines) =>
  lines.flatMap((line, i) => (i ? [el('br'), line] : [line]));

// Give a photo its files. Only the first photo gets them up front; the
// rest get them when they're next in line, so a five-photo hero doesn't
// download five large photos on first load.
const load = (img, slide) => {
  if (img.hasAttribute('src')) return;
  img.srcset = srcsetFor(slide);
  img.src = fallbackFor(slide);
};

const renderSlide = (slide) => {
  const img = el('img', {
    class: 'hero-img',
    sizes: '100vw', // full-bleed: always the viewport's width
    alt: slide.alt ?? '',
    decoding: 'async',
  });
  if (slide.position) img.style.objectPosition = slide.position;
  return img;
};

// Slideshow controls and timing. State lives in this closure:
//   current  index of the photo showing
//   paused   the pause button (stays until pressed again)
//   holds    temporary reasons to wait (hover, focus, off screen, tab
//            hidden); each clears itself, and play resumes when none remain
const createSlideshow = ({root, imgs, slides, ms}) => {
  const count = imgs.length;
  const broken = new Set();
  const holds = new Set();
  let current = 0;
  // Reduced motion: never starts on its own (Play still works)
  let paused = reducedMotion();
  let timer = null;

  // Next photo in a direction, skipping any that failed to load
  const stepFrom = (i, dir) => {
    for (let n = 1; n < count; n += 1) {
      const j = (i + (dir === 'next' ? n : -n) + count) % count;
      if (!broken.has(j)) return j;
    }
    return i;
  };

  const pauseBtn = el('button', {type: 'button', class: 'hero-pause'});
  const dots = imgs.map((_, i) =>
    el('button', {
      type: 'button',
      class: 'hero-dot',
      'aria-label': `Show slide ${i + 1} of ${count}`,
    }),
  );
  const controls = el(
    'div',
    {class: 'hero-controls', role: 'group', 'aria-label': 'Slideshow'},
    pauseBtn,
    el('div', {class: 'hero-dots'}, dots),
  );

  const renderPause = () => {
    pauseBtn.classList.toggle('is-paused', paused);
    pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
  };

  const playing = () => !paused && holds.size === 0;

  // Every change restarts the full wait, so a photo never flips right
  // after it was picked
  const schedule = () => {
    clearTimeout(timer);
    if (playing()) timer = setTimeout(() => go(stepFrom(current, 'next'), 'next'), ms);
  };

  const setHold = (reason, on) => {
    if (on) holds.add(reason);
    else holds.delete(reason);
    schedule();
  };

  // Show photo `to`. `dir` says which side it enters from ('slide').
  const go = (to, dir) => {
    if (to === current) return schedule();
    const incoming = imgs[to];
    const outgoing = imgs[current];
    load(incoming, slides[to]);
    // Park the incoming photo on its entry side with no animation, make
    // the browser apply that (reading a size forces it), then let both
    // photos animate to their new places
    incoming.classList.add('is-parked');
    incoming.dataset.pos = dir === 'next' ? 'right' : 'left';
    incoming.getBoundingClientRect();
    incoming.classList.remove('is-parked');
    incoming.dataset.pos = 'center';
    outgoing.dataset.pos = dir === 'next' ? 'left' : 'right';
    outgoing.classList.remove('is-current');
    incoming.classList.add('is-current');

    dots[current].removeAttribute('aria-current');
    dots[to].setAttribute('aria-current', 'true');
    current = to;
    // Fetch the one after, so it's ready when its turn comes
    const after = stepFrom(to, 'next');
    load(imgs[after], slides[after]);
    schedule();
  };

  const step = (dir) => go(stepFrom(current, dir), dir);

  // Broken photo: drop it from the rotation and hide its dot. If it was
  // showing, move on.
  imgs.forEach((img, i) =>
    img.addEventListener('error', () => {
      console.warn(`Hero image couldn't load: ${img.currentSrc || img.src}`);
      broken.add(i);
      dots[i].hidden = true;
      if (i === current) step('next');
    }),
  );

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    renderPause();
    schedule();
  });

  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => go(i, i > current ? 'next' : 'prev')),
  );

  // Arrow keys while focus is on a control
  controls.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step('next');
    else if (e.key === 'ArrowLeft') step('prev');
  });

  // Holds. Hover counts over the controls only: the hero fills the
  // screen, so on desktop the pointer is over it most of the time.
  controls.addEventListener('mouseenter', () => setHold('hover', true));
  controls.addEventListener('mouseleave', () => setHold('hover', false));
  // Focus anywhere in the hero holds it (W3C carousel pattern), except
  // the pause button: pressing Play there should play.
  root.addEventListener('focusin', (e) => setHold('focus', e.target !== pauseBtn));
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) setHold('focus', false);
  });
  new IntersectionObserver(([entry]) =>
    setHold('offscreen', !entry.isIntersecting),
  ).observe(root);
  document.addEventListener('visibilitychange', () =>
    setHold('hidden', document.hidden),
  );

  // Swipe: mostly sideways and long enough. Passive listeners, so
  // vertical scrolling is never blocked.
  let start = null;
  root.addEventListener(
    'touchstart',
    (e) => {
      const {clientX: x, clientY: y} = e.touches[0];
      start = {x, y};
    },
    {passive: true},
  );
  root.addEventListener(
    'touchend',
    (e) => {
      if (!start) return;
      const {clientX: x, clientY: y} = e.changedTouches[0];
      const dx = x - start.x;
      const dy = y - start.y;
      start = null;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 'next' : 'prev');
      }
    },
    {passive: true},
  );

  dots[0].setAttribute('aria-current', 'true');
  renderPause();
  // Second photo starts loading once the first is up
  imgs[0].decode().then(() => load(imgs[1], slides[1]), () => {});
  schedule();

  return {controls};
};

export const createHero = (root, {hero}) => {
  const {eyebrow, title, summary, tags, ctas, media = {}} = hero;
  const {slideshow = false, seconds = 7, slides: allSlides = []} = media;
  const transition = TRANSITIONS.includes(media.transition)
    ? media.transition
    : DEFAULT_TRANSITION;
  if (media.transition && transition !== media.transition) {
    console.warn(`Unknown hero transition "${media.transition}", using "${transition}"`);
  }

  // Off, or a single photo: the first photo only, no controls
  const slides = slideshow ? allSlides : allSlides.slice(0, 1);
  const imgs = slides.map(renderSlide);
  const first = imgs[0];
  if (first) {
    first.setAttribute('fetchpriority', 'high'); // largest thing on first load
    first.classList.add('is-current');
    first.dataset.pos = 'center';
    load(first, slides[0]);
  }

  const layer = first
    ? el(
        'div',
        {class: `hero-media is-${transition}`, style: `--slide-ms: ${seconds * 1000}ms`},
        imgs,
        el('div', {class: 'hero-wash'}),
      )
    : null;

  const show =
    imgs.length > 1 &&
    createSlideshow({root, imgs, slides, ms: seconds * 1000});

  root.replaceChildren(
    ...(layer ? [layer] : []),
    el(
      'div',
      {class: 'container'},
      el(
        'div',
        {class: 'hero-inner'},
        // null (SHOW_EYEBROW off) is skipped by el()
        eyebrow && el('span', {class: 'hero-eyebrow'}, eyebrow),
        el(
          'h1',
          {},
          withBreaks(title.lead),
          ' ',
          el('span', {class: 'accent'}, title.accent),
        ),
        el('p', {class: 'hero-sub'}, summary),
        el(
          'div',
          {class: 'hero-tags badges'},
          tags.map((tag) => el('span', {class: 'badge'}, tag)),
        ),
        el(
          'div',
          {class: 'hero-cta'},
          ctas.map(({label, href, variant}) =>
            el('a', {href, class: `btn btn-${variant}`}, label),
          ),
        ),
      ),
    ),
    // replaceChildren() would print `false` as text, so spread a list
    ...(show ? [show.controls] : []),
  );

  // Resolves once the first photo is decoded. Never rejects. A single
  // photo that fails drops the photo layer; in a slideshow the error
  // handler skips to the next photo instead.
  const ready = first
    ? first.decode().catch(() => {
        if (!show) {
          console.warn(`Hero image couldn't load: ${first.currentSrc || first.src}`);
          layer.remove();
        }
      })
    : Promise.resolve();

  return {ready};
};
