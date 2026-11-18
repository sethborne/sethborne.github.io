// Frame slideshow: two or more screenshots in a page frame (a `fallback`
// list), with ‹ › arrows, dots, swipe and arrow keys. Autoplay by default
// (5 s, a pause button); manual is a setting (SLIDES_DEFAULTS in content/helpers.js, mocked in
// _mockups/frame-slideshow/). embed.js puts the frame's own piece (the
// Load Live Demo button, or the link over a linked screenshot) in `over`:
// above the images, under the controls, so autoplay holds while the
// pointer is on it too.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const SWIPE_PX = 40;

// Where image i sits along the bar (0 to 100%), for the knob and ticks
const spotOf = (i, count) => `${(i / (count - 1)) * 100}%`;

export const createSlides = ({images, settings, over}) => {
  const {controls, arrows, arrowLook, transition, autoplay, seconds, progress} = settings;
  const count = images.length;
  const has = (part) => controls.split('-').includes(part);
  let index = 0;
  let paused = false;
  let timer = null;
  // Reasons autoplay waits (pointer over, focus inside, off screen, tab
  // hidden); it runs only while the set is empty
  const holds = new Set();

  const pictures = images.map((image, i) =>
    el('img', {
      class: `embed-fallback${i === 0 ? ' is-current' : ''}`,
      src: fallbackFor(image),
      srcset: srcsetFor(image),
      sizes: '(min-width: 1080px) 1032px, 100vw',
      alt: image.alt ?? '',
      'aria-hidden': i === 0 ? null : 'true',
      loading: 'lazy',
      decoding: 'async',
      draggable: 'false',
    }),
  );
  const track = el('div', {class: 'embed-slides-track'}, pictures);
  const live = el('div', {class: 'visually-hidden', 'aria-live': 'polite'});

  const button = (cls, label, ...kids) => el('button', {type: 'button', class: cls, 'aria-label': label}, ...kids);
  const glyph = arrowLook !== 'disc';
  // Parts a setting leaves out are null, not false: `?.` below skips
  // null, but false?.addEventListener() still throws
  const prev = has('arrows') ? button('embed-slides-arrow embed-slides-prev', 'Previous screenshot', glyph ? '‹' : null) : null;
  const next = has('arrows') ? button('embed-slides-arrow embed-slides-next', 'Next screenshot', glyph ? '›' : null) : null;
  const pause = autoplay ? button('embed-slides-pause', 'Pause slideshow') : null;
  const dots = has('dots') ? images.map((_, i) => button('embed-slides-dot', `Screenshot ${i + 1} of ${count}`)) : [];
  const fill = el('span', {class: 'embed-slides-fill'});
  const knob = el('span', {class: 'embed-slides-knob'});
  const bar =
    has('bar') &&
    el(
      'div',
      {class: 'embed-slides-bar', role: 'slider', tabindex: '0', 'aria-label': 'Screenshot', 'aria-valuemin': '1', 'aria-valuemax': String(count)},
      images.map((_, i) => el('span', {class: 'embed-slides-tick', style: `left: ${spotOf(i, count)}`})),
      fill,
      knob,
    );
  const counter = has('count') && el('span', {class: 'embed-slides-count'});
  const line = autoplay && progress === 'line' && el('span', {class: 'embed-slides-progress'});

  const root = el(
    'div',
    {
      class: [
        'embed-slides',
        `embed-slides--${transition}`,
        `embed-slides--arrows-${arrowLook}`,
        arrows === 'hover' && 'embed-slides--arrows-hover',
      ].filter(Boolean).join(' '),
      role: 'region',
      'aria-roledescription': 'carousel',
      'aria-label': 'Screenshots',
    },
    track,
    over,
    el('div', {class: 'embed-slides-controls'}, pause, dots, bar, counter),
    prev,
    next,
    line,
    live,
  );

  // Autoplay: one timeout per image, and the line counts the same time.
  // Reset the line with no transition first, or it would shrink back over
  // the old duration; reading offsetWidth applies the 0 before it grows.
  const ms = () => seconds * 1000;
  const schedule = () => {
    clearTimeout(timer);
    if (line) {
      line.style.transition = 'none';
      line.style.width = '0';
    }
    if (!autoplay || paused || holds.size || REDUCED.matches) return;
    if (line) {
      void line.offsetWidth;
      line.style.transition = `width ${ms()}ms linear`;
      line.style.width = '100%';
    }
    timer = setTimeout(() => {
      // The frame was replaced (Load Live Demo): stop for good
      if (!root.isConnected) return;
      go(index + 1, 1);
    }, ms());
  };

  const sync = () => {
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    if (bar) {
      knob.style.left = spotOf(index, count);
      fill.style.width = spotOf(index, count);
      bar.setAttribute('aria-valuenow', String(index + 1));
      bar.setAttribute('aria-valuetext', `Screenshot ${index + 1} of ${count}`);
    }
    if (counter) counter.textContent = `${index + 1} / ${count}`;
    if (pause) {
      pause.classList.toggle('is-paused', paused);
      pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    }
    schedule();
  };

  // dir: 1 = forward, -1 = back. For 'slide', the new image starts on the
  // side it comes from (placed there with no transition), then slides in
  // while the old one leaves the other way.
  const go = (i, dir = i > index ? 1 : -1) => {
    const to = (i + count) % count;
    if (to === index) return sync();
    const from = pictures[index];
    const incoming = pictures[to];
    pictures.forEach((picture, k) => {
      if (k !== to && k !== index) picture.classList.toggle('is-before', dir > 0);
    });
    incoming.style.transition = 'none';
    incoming.classList.toggle('is-before', dir < 0);
    void incoming.offsetWidth;
    incoming.style.transition = '';
    from.classList.remove('is-current');
    from.classList.toggle('is-before', dir > 0);
    from.setAttribute('aria-hidden', 'true');
    incoming.classList.remove('is-before');
    incoming.classList.add('is-current');
    incoming.removeAttribute('aria-hidden');
    index = to;
    live.textContent = `Screenshot ${index + 1} of ${count}`;
    sync();
  };

  prev?.addEventListener('click', () => go(index - 1, -1));
  next?.addEventListener('click', () => go(index + 1, 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  pause?.addEventListener('click', () => {
    paused = !paused;
    sync();
  });

  // Bar: tap or drag along it to pick an image
  if (bar) {
    const pick = (event) => {
      const box = bar.getBoundingClientRect();
      const at = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      go(Math.round(at * (count - 1)));
    };
    bar.addEventListener('pointerdown', (event) => {
      bar.setPointerCapture(event.pointerId);
      pick(event);
    });
    bar.addEventListener('pointermove', (event) => {
      if (bar.hasPointerCapture(event.pointerId)) pick(event);
    });
  }

  // Arrow keys on any control (not on the Load button or the link)
  root.addEventListener('keydown', (event) => {
    if (!event.target.closest('.embed-slides-controls, .embed-slides-arrow')) return;
    if (event.key === 'ArrowLeft') go(index - 1, -1);
    else if (event.key === 'ArrowRight') go(index + 1, 1);
    else return;
    event.preventDefault();
  });

  // Swipe on the image (and on the link over it). A swipe over a link
  // must not also open it, so the click that follows is swallowed.
  let downX = null;
  let swiped = false;
  root.addEventListener('pointerdown', (event) => {
    swiped = false;
    downX = event.target.closest('.embed-slides-controls, .embed-slides-arrow, .embed-load') ? null : event.clientX;
  });
  root.addEventListener('pointerup', (event) => {
    if (downX === null) return;
    const dx = event.clientX - downX;
    downX = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    swiped = true;
    go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  root.addEventListener('click', (event) => {
    if (!swiped) return;
    swiped = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // Autoplay holds, like the hero's: pointer over, focus inside (except
  // on the pause button), off screen, tab hidden
  if (autoplay) {
    const hold = (reason, on) => {
      if (on) holds.add(reason);
      else holds.delete(reason);
      schedule();
    };
    root.addEventListener('pointerenter', () => hold('pointer', true));
    root.addEventListener('pointerleave', () => hold('pointer', false));
    root.addEventListener('focusin', (event) => hold('focus', event.target !== pause));
    root.addEventListener('focusout', (event) => {
      if (!root.contains(event.relatedTarget)) hold('focus', false);
    });
    new IntersectionObserver(([entry]) => hold('offscreen', !entry.isIntersecting)).observe(root);
    document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
  }

  sync();
  return root;
};
