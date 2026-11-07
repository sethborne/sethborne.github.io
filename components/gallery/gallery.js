// Image gallery: a grid of thumbs (mini cards: image + name) with a
// column control, opening into a lightbox with arrows, swipe, keys, and a
// position bar you can drag along (or dots). Data from gallery() in
// content/helpers.js, which lists every setting; titles and captions come
// from the page's doc (Gallery field). Settings become classes and
// custom properties on the root, so most looks live in gallery.css.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';
import ui from '../../content/ui.js';

// The column choice lasts for the tab's session and is shared by every
// gallery (like scroll memory): a new tab starts from the default
const STORE_KEY = 'gallery-columns';
const SWIPE_PX = 40;
const SVG_NS = 'http://www.w3.org/2000/svg';

// ----- Pure helpers -----

const filesOf = ({base, widths}, {name}) => ({base: `${base}${name}`, widths});
const fullOf = ({base}, {name}) => `${base}${name}_full.jpg`;
// No title in the doc yet: the file name stands in ('plaza_dusk' -> 'plaza dusk')
const titleOf = ({title, name}) => title ?? name.replaceAll('_', ' ');
// Alt text: the title, plus the caption when there is one
const altOf = (image) => (image.text ? `${titleOf(image)}. ${image.text}` : titleOf(image));
// Where image i sits along the bar, in %: first at the left end, last at
// the right. The knob and the ticks both use it, so they always line up.
const spotOf = (i, count) => (count > 1 ? (i / (count - 1)) * 100 : 50);
// Image i nearest a spot along the bar (0 to 1)
const indexAt = (fraction, count) => Math.round(Math.min(Math.max(fraction, 0), 1) * (count - 1));
// The grid's share of the screen, for picking a thumb file
const thumbSizes = (columns, phoneColumns) =>
  `(min-width: 600px) ${Math.ceil(100 / columns)}vw, ${Math.ceil(100 / phoneColumns)}vw`;

const readColumns = (choices, fallback) => {
  try {
    const saved = Number(sessionStorage.getItem(STORE_KEY));
    return choices.includes(saved) ? saved : fallback;
  } catch {
    return fallback; // storage blocked (some private modes)
  }
};
const saveColumns = (n) => {
  try {
    sessionStorage.setItem(STORE_KEY, String(n));
  } catch {
    // The choice just isn't remembered
  }
};

// Little grid drawing for the 'icons' column control: n columns, two rows
const gridIcon = (n) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 18 14');
  svg.setAttribute('aria-hidden', 'true');
  const width = (18 - (n - 1) * 2) / n;
  for (let col = 0; col < n; col++) {
    for (const y of [0, 7.5]) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      const attrs = {x: col * (width + 2), y, width, height: 6.5, rx: 1};
      for (const [key, value] of Object.entries(attrs)) rect.setAttribute(key, value);
      svg.append(rect);
    }
  }
  return svg;
};

// ----- Column control (tablets and up; gallery.css hides it on phones) -----

const createColumnControl = ({choices, look, onPick}) => {
  const labelId = `gallery-cols-${Math.random().toString(36).slice(2, 8)}`;
  const buttons = choices.map((n) => {
    const text = String(n);
    const button =
      look === 'tabs'
        ? el('button', {type: 'button', class: 'view-tab', 'data-label': text}, el('span', {}, text))
        : el('button', {type: 'button', class: 'gallery-col-icon', 'aria-label': `${n} columns`}, gridIcon(n));
    button.addEventListener('click', () => onPick(n));
    return button;
  });
  const element = el(
    'div',
    {class: `gallery-columns look-${look}`},
    el('span', {class: 'gallery-columns-label', id: labelId}, ui.gallery.columns),
    el('div', {class: look === 'tabs' ? 'view-tab-list' : 'gallery-col-icons', role: 'group', 'aria-labelledby': labelId}, buttons),
  );
  const set = (n) => buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(choices[i] === n)));
  return {element, set};
};

// ----- Lightbox -----

const createLightbox = ({title, gallery, onClose}) => {
  const {images, position, barFill, ticks} = gallery;
  const count = images.length;
  // Mouse and trackpad: clicking the big image opens the full-size file
  const canOpen = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let index = 0;

  const img = el('img', {class: 'gallery-lb-img', alt: '', sizes: '100vw', draggable: 'false'});
  const name = el('h2', {class: 'gallery-lb-title'});
  const caption = el('p', {class: 'gallery-lb-caption'});
  const live = el('span', {class: 'visually-hidden', 'aria-live': 'polite'});
  const full = el(
    'a',
    {class: 'gallery-lb-full', target: '_blank', rel: 'noopener'},
    ui.gallery.fullSize,
    el('span', {'aria-hidden': 'true'}, ' ↗'),
    el('span', {class: 'visually-hidden'}, ' (opens in a new tab)'),
  );
  const button = (cls, label, glyph) =>
    el('button', {type: 'button', class: `gallery-lb-btn ${cls}`, 'aria-label': label}, el('span', {'aria-hidden': 'true'}, glyph));
  const close = button('gallery-lb-close', 'Close', '×');
  const prev = button('gallery-lb-prev', 'Previous image', '‹');
  const next = button('gallery-lb-next', 'Next image', '›');

  // Position: a bar (track, fill, ticks, knob) or one dot per image
  const fill = barFill && el('span', {class: 'gallery-bar-fill'});
  const knob = el('span', {class: 'gallery-bar-knob'});
  const tickMarks = ticks
    ? images.map((_, i) => el('span', {class: 'gallery-bar-tick', style: `left: ${spotOf(i, count)}%`}))
    : [];
  const bar = el('div', {class: 'gallery-bar', 'aria-hidden': 'true'}, el('span', {class: 'gallery-bar-rail'}, fill, tickMarks, knob));
  const dots = images.map((image, i) => {
    const dot = el('button', {type: 'button', class: 'gallery-dot', 'aria-label': `Image ${i + 1}: ${titleOf(image)}`});
    dot.addEventListener('click', () => show(i));
    return dot;
  });
  const positionEl = position === 'dots' ? el('div', {class: 'gallery-dots', role: 'group', 'aria-label': 'Choose an image'}, dots) : bar;

  const dialog = el(
    'dialog',
    {class: 'gallery-lightbox', 'aria-label': title},
    el(
      'div',
      {class: 'gallery-lb'},
      el('div', {class: 'gallery-lb-stage'}, img),
      el('div', {class: 'gallery-lb-meta'}, el('div', {class: 'gallery-lb-text'}, name, caption, live), full),
      positionEl,
    ),
    close,
    prev,
    next,
  );
  dialog.classList.toggle('can-open', canOpen);

  // Warm the neighbors so the arrows feel instant
  const preload = (i) => {
    const files = filesOf(gallery, images[(i + count) % count]);
    Object.assign(new Image(), {sizes: '100vw', srcset: srcsetFor(files)});
  };

  const show = (i) => {
    index = (i + count) % count;
    const image = images[index];
    const files = filesOf(gallery, image);
    img.srcset = srcsetFor(files);
    img.src = fallbackFor(files);
    img.alt = altOf(image);
    name.textContent = titleOf(image);
    // Empty caption = no caption line (:empty hides the <p>)
    caption.textContent = image.text ?? '';
    live.textContent = `${ui.gallery.position(index + 1, count)}. ${altOf(image)}`;
    full.href = fullOf(gallery, image);
    const spot = `${spotOf(index, count)}%`;
    knob.style.left = spot;
    if (fill) fill.style.width = spot;
    tickMarks.forEach((tick, k) => tick.classList.toggle('is-past', k < index));
    dots.forEach((dot, k) => dot.setAttribute('aria-current', String(k === index)));
    preload(index + 1);
    preload(index - 1);
  };

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => onClose(index));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1);
    else if (event.key === 'ArrowLeft') show(index - 1);
  });
  img.addEventListener('click', () => canOpen && window.open(full.href, '_blank', 'noopener'));
  // A click on the dark area around the image closes
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.classList.contains('gallery-lb-stage')) dialog.close();
  });

  // Scrub: press on the bar and drag (touch or mouse). A tap lands
  // roughly, but the image changes as the finger slides, so being one off
  // is fixed by sliding a little. Pointer capture keeps the moves coming
  // when the finger drifts off the bar.
  let scrubbing = false;
  const scrubTo = (event) => {
    const box = bar.getBoundingClientRect();
    const i = indexAt((event.clientX - box.left) / box.width, count);
    if (i !== index) show(i);
  };
  bar.addEventListener('pointerdown', (event) => {
    scrubbing = true;
    bar.setPointerCapture(event.pointerId);
    scrubTo(event);
  });
  bar.addEventListener('pointermove', (event) => scrubbing && scrubTo(event));
  const endScrub = () => {
    scrubbing = false;
  };
  bar.addEventListener('pointerup', endScrub);
  bar.addEventListener('pointercancel', endScrub);

  // Swipe on touch (not on the bar: a drag there scrubs)
  let startX = null;
  dialog.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' && !bar.contains(event.target)) startX = event.clientX;
  });
  dialog.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE_PX) show(index + (dx < 0 ? 1 : -1));
  });

  const open = (i) => {
    show(i);
    dialog.showModal();
    // Focus starts on ×, not on the first dot (showModal's own pick).
    // Set here rather than with the autofocus attribute, which the page
    // would also try on load while the dialog is closed.
    close.focus();
  };
  return {element: dialog, open};
};

// ----- Gallery -----

export const createGallery = ({title, gallery}) => {
  const {images, columnChoices, phoneColumns, aspect, columnControl, thumbHover, position, barFill, ticks, tickShape, tickSize} = gallery;
  let columns = readColumns(columnChoices, gallery.columns);

  const thumbs = images.map((image, i) => {
    const files = filesOf(gallery, image);
    const pic = el('img', {
      src: fallbackFor(files),
      srcset: srcsetFor(files),
      sizes: thumbSizes(columns, phoneColumns),
      // The button's label names the image, so the img is decorative
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      style: image.focus && `object-position: ${image.focus}`,
    });
    const item = el(
      'button',
      {type: 'button', class: 'gallery-item', 'aria-label': `${altOf(image)} (open larger)`},
      el('span', {class: 'gallery-thumb'}, pic),
      el('span', {class: 'gallery-name', 'aria-hidden': 'true'}, titleOf(image)),
    );
    item.addEventListener('click', () => lightbox.open(i));
    return {item, pic};
  });

  // Closing returns focus to the thumb of the image last shown
  const lightbox = createLightbox({title, gallery, onClose: (i) => thumbs[i].item.focus()});

  const grid = el('ul', {class: 'gallery-grid'}, thumbs.map(({item}) => el('li', {}, item)));
  const control = createColumnControl({choices: columnChoices, look: columnControl, onPick: (n) => setColumns(n, true)});

  const setColumns = (n, save) => {
    columns = n;
    if (save) saveColumns(n);
    grid.style.setProperty('--cols', n);
    control.set(n);
    thumbs.forEach(({pic}) => pic.setAttribute('sizes', thumbSizes(n, phoneColumns)));
  };

  const classes = [
    'gallery',
    `gallery--hover-${thumbHover}`,
    `gallery--position-${position}`,
    `gallery--ticks-${tickShape}`,
    !barFill && 'gallery--no-fill',
    !ticks && 'gallery--no-ticks',
  ].filter(Boolean);
  const element = el(
    'div',
    {
      class: classes.join(' '),
      style: `--phone-cols: ${phoneColumns}; --thumb-aspect: ${aspect}; --tick: ${tickSize}px`,
    },
    control.element,
    grid,
    lightbox.element,
  );
  setColumns(columns, false);
  return element;
};
