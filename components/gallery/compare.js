// Before/after compare: two aligned images in one box, the top one cut
// at a line you drag (or move with the arrow keys once the handle has
// focus). The gallery lightbox shows one for an image with `compare`;
// gallery.css styles it. Only clip-path moves, so the two images stay
// lined up at any size.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

const STEP = 5; // % per arrow key
const BIG_STEP = 20; // with Shift
// The hint: the line slides 50 -> 40 -> 60 -> 50 once, so it reads as
// draggable. [ms after the images are in, % or null = done]
const HINT = [
  [150, 40],
  [500, 60],
  [850, 50],
  [1200, null],
];

// A layer's name hides once its image is all but gone (within EDGE % of
// the side), so a tag never sits on the other image
const EDGE = 3;

const clamp = (n) => Math.min(Math.max(n, 0), 100);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// bottom, top: {base, widths} files; split 'x' (line upright, drag left
// and right) or 'y' (line across, drag up and down); labels [before,
// after]: before is the bottom image, showing left of the line (x) or
// below it (y); after shows right of it (x) or above it (y);
// handle 'circle' | 'solid' | 'pill' | 'arrows'; line 'white' | 'accent'
export const createCompare = ({bottom, top, split, labels: [before, after], alt, hint, handle: look = 'circle', line = 'white'}) => {
  const across = split === 'y';
  const picture = (files, cls, label) =>
    el('img', {class: cls, src: fallbackFor(files), srcset: srcsetFor(files), sizes: '100vw', alt: `${label}: ${alt}`, draggable: 'false'});
  const bottomImg = picture(bottom, 'gallery-compare-img', before);
  const topImg = picture(top, 'gallery-compare-img gallery-compare-top', after);

  const handle = el('span', {
    class: 'gallery-compare-handle',
    role: 'slider',
    tabindex: '0',
    'aria-label': `${before} and ${after}`,
    'aria-orientation': across ? 'vertical' : 'horizontal',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
  });
  const beforeTag = el('span', {class: 'gallery-compare-label gallery-compare-label--before', 'aria-hidden': 'true'}, before);
  const afterTag = el('span', {class: 'gallery-compare-label gallery-compare-label--after', 'aria-hidden': 'true'}, after);
  const box = el('div', {class: 'gallery-compare-box'}, bottomImg, topImg, beforeTag, afterTag, el('span', {class: 'gallery-compare-line'}, handle));
  const classes = ['gallery-compare', `gallery-compare--${across ? 'y' : 'x'}`, `gallery-compare--handle-${look}`, `gallery-compare--line-${line}`];
  const element = el('div', {class: classes.join(' ')}, box);

  const set = (pos) => {
    const value = Math.round(clamp(pos));
    box.style.setProperty('--pos', `${value}%`);
    handle.setAttribute('aria-valuenow', value);
    handle.setAttribute('aria-valuetext', `${value}% ${after}`);
    // x: line at the left edge = only after shows, at the right = only
    // before. y: after is on top, so the line at the top = only before
    const [low, high] = across ? [afterTag, beforeTag] : [beforeTag, afterTag];
    low.classList.toggle('is-gone', value <= EDGE);
    high.classList.toggle('is-gone', value >= 100 - EDGE);
    return value;
  };
  let pos = set(50);

  // The box takes the bottom image's shape once it's in
  bottomImg.addEventListener('load', () => {
    box.style.setProperty('--ratio', `${bottomImg.naturalWidth} / ${bottomImg.naturalHeight}`);
  });

  let timers = [];
  const stopHint = () => {
    timers.forEach(clearTimeout);
    timers = [];
    element.classList.remove('is-hinting');
  };
  if (hint && !reducedMotion()) {
    Promise.all([bottomImg.decode(), topImg.decode()])
      .then(() => {
        element.classList.add('is-hinting');
        timers = HINT.map(([ms, to]) => setTimeout(() => (to === null ? stopHint() : (pos = set(to))), ms));
      })
      .catch(() => {}); // an image failed: no hint, the frame still shows
  }

  // Drag anywhere on the box. stopPropagation keeps the lightbox's own
  // swipe (next/previous) from starting; a swipe on the dark area still does.
  let dragging = false;
  const moveTo = (event) => {
    const rect = box.getBoundingClientRect();
    pos = set(across ? ((event.clientY - rect.top) / rect.height) * 100 : ((event.clientX - rect.left) / rect.width) * 100);
  };
  box.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    stopHint();
    dragging = true;
    box.setPointerCapture(event.pointerId);
    moveTo(event);
  });
  box.addEventListener('pointermove', (event) => dragging && moveTo(event));
  const endDrag = () => {
    dragging = false;
  };
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);

  // With the handle focused, every arrow moves the line, not the image
  const KEYS = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1};
  handle.addEventListener('keydown', (event) => {
    let to = null;
    if (event.key in KEYS) to = pos + KEYS[event.key] * (event.shiftKey ? BIG_STEP : STEP);
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = 100;
    if (to === null) return;
    event.preventDefault();
    event.stopPropagation();
    stopHint();
    pos = set(to);
  });

  return {element, destroy: stopHint};
};
