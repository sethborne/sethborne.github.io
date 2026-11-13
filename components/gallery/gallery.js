// Image gallery: a grid of thumbs (mini cards: image + name) with a
// column control, opening into a lightbox with arrows, swipe, keys, and a
// position bar you can drag along (or dots). Data from gallery() in
// content/helpers.js, which lists every setting; titles and captions come
// from the page's doc (Gallery field). Settings become classes and
// custom properties on the root, so most looks live in gallery.css.
// With `filter: true`, chip rows above the grid (filter.js) narrow it.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';
import ui from '../../content/ui.js';
import {GALLERY_FACETS} from '../../content/gallery-tags.js';
import {createCompare} from './compare.js';
import {createGalleryFilter} from './filter.js';

// Video items (gallery() in content/helpers.js): a poster in the grid,
// a <video> in the lightbox. Nothing moves by itself under reduced motion.
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// The column choice lasts for the tab's session and is shared by every
// gallery (like scroll memory): a new tab starts from the default
// Phones keep their own choice: 2 columns there isn't 2 on a desktop
const STORE_KEYS = {wide: 'gallery-columns', phone: 'gallery-columns-phone'};
const SWIPE_PX = 40;
const SVG_NS = 'http://www.w3.org/2000/svg';

// ----- Pure helpers -----

const filesOf = ({base, widths}, {name}) => ({base: `${base}${name}`, widths});
const fullOf = ({base}, {name}) => `${base}${name}_full.jpg`;
// A video item's files: the MP4 and its poster (img/video/, npm run video)
const videoFileOf = ({videoBase, videoWidth}, {name}) => `${videoBase}${name}_${videoWidth}.mp4`;
const posterOf = ({videoBase, posterWidths}, {name}) => ({base: `${videoBase}${name}_poster`, widths: posterWidths});
// What a thumb or the lightbox shows for an item: its poster or its image
const picOf = (gallery, image) => (image.video ? posterOf(gallery, image) : filesOf(gallery, image));
// A muted, looping, inline video: all three are needed for a video to
// start by itself (phones also go fullscreen without playsinline). The
// property, not just the attribute, is what browsers check for muted.
const loopVideo = (src, poster) => {
  const video = el('video', {class: 'gallery-video', src, poster, muted: true, loop: true, playsinline: true, preload: 'none'});
  video.muted = true;
  return video;
};
// No title in the doc yet: the file name stands in ('plaza_dusk' -> 'plaza dusk')
const titleOf = ({title, name}) => title ?? name.replaceAll('_', ' ');
// Alt text: the title, plus the caption when there is one
const altOf = (image) => (image.text ? `${titleOf(image)}. ${image.text}` : titleOf(image));
// A compare image's bottom picture: `compare` names its file
const pairOf = (image) => ({name: image.compare});
// A compare image's two layer names: its own (the doc line's "| A | B"),
// else the gallery's compareLabels, else Before / After (ui.js)
const labelsOf = (gallery, image) => image.labels ?? gallery.compareLabels ?? ui.gallery.compareLabels;
const splitOf = (gallery, image) => image.split ?? gallery.compareSplit;
// A variant card's images in button order (the one it shows first, then
// the others), and a label for each: the doc line's, else "Version 2"
const variantsOf = (image) => [image.name, ...(image.variants ?? [])];
const variantLabelsOf = (image) => variantsOf(image).map((_, i) => image.labels?.[i] ?? ui.gallery.variantLabel(i + 1));
// How long a version change runs (the CSS transition, plus a little)
const VARIANT_MS = 400;
// Where image i sits along the bar, in %: first at the left end, last at
// the right. The knob and the ticks both use it, so they always line up.
const spotOf = (i, count) => (count > 1 ? (i / (count - 1)) * 100 : 50);
// Image i nearest a spot along the bar (0 to 1)
const indexAt = (fraction, count) => Math.round(Math.min(Math.max(fraction, 0), 1) * (count - 1));
// A thumb's framing: `focus` slides the crop (object-position) and is
// the point `zoom` scales toward, so that spot stays put as it zooms
const thumbStyle = ({focus, zoom}) =>
  [focus && `object-position: ${focus}; transform-origin: ${focus}`, zoom && `--zoom: ${zoom}`].filter(Boolean).join('; ') || null;
// The grid's share of the screen, for picking a thumb file
const thumbSizes = (columns, phoneColumns) =>
  `(min-width: 600px) ${Math.ceil(100 / columns)}vw, ${Math.ceil(100 / phoneColumns)}vw`;

const readColumns = (key, choices, fallback) => {
  try {
    const saved = Number(sessionStorage.getItem(key));
    return choices.includes(saved) ? saved : fallback;
  } catch {
    return fallback; // storage blocked (some private modes)
  }
};
const saveColumns = (key, n) => {
  try {
    sessionStorage.setItem(key, String(n));
  } catch {
    // The choice just isn't remembered
  }
};

// Filter picks live on the history entry (history.state), keyed by the
// gallery's place on the page, so Back, Forward and reload keep them and
// a link click (a new, empty entry) starts clean, like scroll memory.
const readPicks = (key) => history.state?.galleryPicks?.[key] ?? [];
const savePicks = (key, picks) => {
  const all = {...history.state?.galleryPicks, [key]: picks};
  // No URL argument: the URL stays as it is
  history.replaceState({...history.state, galleryPicks: all}, '');
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

// Compare badge icon: two images in plan, outlines only. The top one
// sits down and right, and hides the lines of the one below where they
// cross it: the lower one is drawn as just its visible edges (an open
// path), so no fill or mask is needed.
// A badge drawing: outlined shapes in currentColor, 16 x 14
const badgeIcon = (shapes) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 14');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'gallery-badge-icon');
  const stroke = {fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'};
  for (const [tag, attrs] of shapes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries({...stroke, ...attrs})) node.setAttribute(key, value);
    svg.append(node);
  }
  return svg;
};

// Lower image (1,1 to 11,9.5): its bottom and right edges stop where
// they meet the top image's outline
const compareIcon = () =>
  badgeIcon([
    ['path', {d: 'M5 9.5 H1 V1 H11 V4.5'}],
    ['rect', {x: 5, y: 4.5, width: 10, height: 8.5, rx: 1.2}],
  ]);

// Variants: a print with the top edges of two more peeking above it
const stackIcon = () =>
  badgeIcon([
    ['rect', {x: 1, y: 5, width: 14, height: 8, rx: 1.2}],
    ['path', {d: 'M2.5 3 H13.5'}],
    ['path', {d: 'M4 1 H12'}],
  ]);

// ----- Column control -----
// One per screen size: 'wide' (600px and up) and 'phone'; gallery.css
// shows the one that fits. No choices, no control.

const createColumnControl = ({size, choices, look, onPick}) => {
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
    {class: `gallery-columns gallery-columns--${size} look-${look}`, hidden: choices.length < 2},
    el('span', {class: 'gallery-columns-label', id: labelId}, ui.gallery.columns),
    el('div', {class: look === 'tabs' ? 'view-tab-list' : 'gallery-col-icons', role: 'group', 'aria-labelledby': labelId}, buttons),
  );
  const set = (n) => buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(choices[i] === n)));
  return {element, set};
};

// ----- Lightbox -----

const createLightbox = ({title, gallery, onClose}) => {
  const {images, position, barFill, ticks, variantButtons, variantPlace, variantTransition} = gallery;
  const count = images.length;
  // Mouse and trackpad: clicking the big image opens the full-size file
  const canOpen = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let index = 0;
  // Which of the current card's variants is showing
  let variant = 0;

  const img = el('img', {class: 'gallery-lb-img', alt: '', sizes: '100vw', draggable: 'false'});
  const name = el('h2', {class: 'gallery-lb-title'});
  const caption = el('p', {class: 'gallery-lb-caption'});
  const live = el('span', {class: 'visually-hidden', 'aria-live': 'polite'});
  const fullLink = (label) =>
    el(
      'a',
      {class: 'gallery-lb-full', target: '_blank', rel: 'noopener'},
      el('span', {}, label),
      el('span', {'aria-hidden': 'true'}, ' ↗'),
      el('span', {class: 'visually-hidden'}, ' (opens in a new tab)'),
    );
  const full = fullLink(ui.gallery.fullSize);
  // A compare image links both files, one per label (set per image)
  const fullBefore = fullLink('');
  const fullAfter = fullLink('');
  const fullPair = el('span', {class: 'gallery-lb-full-pair', hidden: true}, fullBefore, fullAfter);
  const player = el('div', {class: 'gallery-lb-video', hidden: true});
  const stage = el('div', {class: 'gallery-lb-stage'}, img, player);
  let compare = null;
  const button = (cls, label, glyph) =>
    el('button', {type: 'button', class: `gallery-lb-btn ${cls}`, 'aria-label': label}, el('span', {'aria-hidden': 'true'}, glyph));
  const close = button('gallery-lb-close', 'Close', '×');
  const prev = button('gallery-lb-prev', 'Previous image', '‹');
  const next = button('gallery-lb-next', 'Next image', '›');
  // Variant buttons, filled per card; under the image or on its top edge
  const variantRow = el('div', {class: 'gallery-lb-variants', role: 'group', 'aria-label': ui.gallery.variants, hidden: true});
  if (variantPlace === 'over') stage.append(variantRow);

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
      stage,
      variantPlace === 'over' ? null : variantRow,
      el('div', {class: 'gallery-lb-meta'}, el('div', {class: 'gallery-lb-text'}, name, caption, live), full, fullPair),
      positionEl,
    ),
    close,
    prev,
    next,
  );
  dialog.classList.toggle('can-open', canOpen);
  dialog.classList.add(`gallery-lightbox--variants-${variantButtons}`, `gallery-lightbox--variants-${variantPlace}`, `gallery-lightbox--vt-${variantTransition}`);

  // A version change: the old picture stays on top as a copy (the
  // "ghost") and leaves by the transition while the new one arrives
  // underneath. dir: 1 = a later button (slide comes in from the right).
  const clearGhosts = () => stage.querySelectorAll('.gallery-lb-ghost').forEach((ghost) => ghost.remove());
  const swapPicture = (files, dir) => {
    const animate = variantTransition !== 'none' && !REDUCED.matches && !img.hidden;
    const ghost = animate && img.cloneNode();
    if (ghost) {
      ghost.classList.add('gallery-lb-ghost');
      ghost.alt = '';
      img.after(ghost);
      stage.style.setProperty('--dir', dir);
      img.classList.add('is-in-start');
    }
    img.srcset = srcsetFor(files);
    img.src = fallbackFor(files);
    if (!ghost) return;
    // Start once the new picture is ready, so the change shows it whole
    const go = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          img.classList.remove('is-in-start');
          ghost.classList.add('is-out');
          setTimeout(() => ghost.remove(), VARIANT_MS);
        }),
      );
    img.decode().then(go, go);
  };

  const showVariant = (image, k, dir = 1) => {
    variant = k;
    const name = variantsOf(image)[k];
    swapPicture(filesOf(gallery, {name}), dir);
    img.alt = `${altOf(image)} (${variantLabelsOf(image)[k]})`;
    full.href = fullOf(gallery, {name});
    variantRow.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
  };

  // One button per variant; a card without variants hides the row
  const renderVariants = (image) => {
    const names = variantsOf(image);
    const has = names.length > 1 && !image.compare && !image.video;
    variantRow.hidden = !has;
    variantRow.replaceChildren();
    if (!has) return;
    const buttons = variantLabelsOf(image).map((label, k) => {
      const b = el('button', {type: 'button', class: 'gallery-lb-variant', 'aria-pressed': String(k === 0)}, label);
      b.addEventListener('click', () => {
        if (k === variant) return;
        showVariant(image, k, k > variant ? 1 : -1);
        live.textContent = label;
      });
      return b;
    });
    variantRow.append(el('div', {class: 'gallery-lb-variant-list', style: `--steps: ${names.length}`}, buttons));
    // Warm the other versions so the first click is instant
    names.slice(1).forEach((name) => Object.assign(new Image(), {sizes: '100vw', srcset: srcsetFor(filesOf(gallery, {name}))}));
  };

  // Warm the neighbors so the arrows feel instant
  const preload = (i) => {
    const image = images[(i + count) % count];
    for (const one of image.compare ? [image, pairOf(image)] : [image]) {
      Object.assign(new Image(), {sizes: '100vw', srcset: srcsetFor(picOf(gallery, one))});
    }
  };

  // A compare image swaps the plain <img> for the compare box
  const showCompare = (image) => {
    compare?.destroy();
    compare?.element.remove();
    compare = image.compare
      ? createCompare({
          bottom: filesOf(gallery, pairOf(image)),
          top: filesOf(gallery, image),
          split: splitOf(gallery, image),
          labels: labelsOf(gallery, image),
          alt: altOf(image),
          hint: gallery.compareHint,
          handle: gallery.compareHandle,
          line: gallery.compareLine,
        })
      : null;
    if (compare) stage.append(compare.element);
    img.hidden = Boolean(compare);
    full.hidden = Boolean(compare);
    fullPair.hidden = !compare;
    if (compare) {
      const [before, after] = labelsOf(gallery, image);
      fullBefore.firstChild.textContent = before;
      fullAfter.firstChild.textContent = after;
      fullBefore.href = fullOf(gallery, pairOf(image));
      fullAfter.href = fullOf(gallery, image);
    }
  };

  // A video item swaps the <img> for a <video>. A loop plays muted with a
  // Pause button (motion over 5 seconds needs a way to stop it); a movie
  // gets sound and the browser's controls. Both start at once (the click
  // that opened them counts as the go-ahead), except a loop under
  // reduced motion, which waits for Play.
  const showVideo = (image) => {
    player.replaceChildren();
    player.hidden = !image.video;
    if (!image.video) return;
    img.hidden = true;
    full.hidden = true;
    const src = videoFileOf(gallery, image);
    const poster = fallbackFor(posterOf(gallery, image));
    if (image.video === 'loop') {
      const video = loopVideo(src, poster);
      video.preload = 'auto';
      video.setAttribute('aria-label', altOf(image));
      const pause = el('button', {type: 'button', class: 'gallery-lb-pause'});
      const label = () => (pause.textContent = video.paused ? `▶ ${ui.video.resume}` : `❚❚ ${ui.video.pause}`);
      pause.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
      video.addEventListener('play', label);
      video.addEventListener('pause', label);
      player.append(video, pause);
      label();
      if (!REDUCED.matches) video.play().catch(() => {});
    } else {
      const video = el('video', {class: 'gallery-video', src, poster, controls: true, playsinline: true, preload: 'auto', 'aria-label': altOf(image)});
      // A property, not an attribute: HTML has no volume attribute
      video.volume = gallery.videoVolume ?? 1;
      player.append(video);
      video.play().catch(() => {});
    }
  };

  const show = (i) => {
    index = (i + count) % count;
    variant = 0;
    clearGhosts();
    img.classList.remove('is-in-start');
    const image = images[index];
    const files = picOf(gallery, image);
    showCompare(image);
    showVideo(image);
    img.srcset = srcsetFor(files);
    img.src = fallbackFor(files);
    img.alt = altOf(image);
    name.textContent = titleOf(image);
    // Empty caption = no caption line (:empty hides the <p>)
    caption.textContent = image.text ?? '';
    live.textContent = `${ui.gallery.position(index + 1, count)}. ${altOf(image)}`;
    full.href = fullOf(gallery, image);
    renderVariants(image);
    if (!variantRow.hidden) img.alt = `${altOf(image)} (${variantLabelsOf(image)[0]})`;
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
  dialog.addEventListener('close', () => {
    compare?.destroy();
    clearGhosts();
    // Removing the <video> stops it (and its sound)
    player.replaceChildren();
    onClose(index);
  });
  dialog.addEventListener('keydown', (event) => {
    // On a movie's controls the arrows seek, as the browser intends
    if (event.target.tagName === 'VIDEO') return;
    if (event.key === 'ArrowRight') show(index + 1);
    else if (event.key === 'ArrowLeft') show(index - 1);
  });
  img.addEventListener('click', () => canOpen && window.open(full.href, '_blank', 'noopener'));
  // A click on the dark area around the image closes
  dialog.addEventListener('click', (event) => {
    const {classList} = event.target;
    if (event.target === dialog || classList.contains('gallery-lb-stage') || classList.contains('gallery-compare')) dialog.close();
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

// lead: an optional node at the left of the column control's row; the
// filter's status line goes there when the gallery has no lead of its own.
// key: the gallery's place on its page (a section id, or 'content'), for
// keeping filter picks on the history entry.
export const createGallery = ({title, gallery, lead, key = 'content'}) => {
  const {images, columnChoices, phoneColumnChoices, aspect, columnControl, thumbHover, position, barFill, ticks, tickShape, tickSize, compareThumb, compareBadge, filteredMark, videoGrid, videoBadge, variantBadge} = gallery;
  const choices = {wide: columnChoices, phone: phoneColumnChoices};
  const columns = {
    wide: readColumns(STORE_KEYS.wide, choices.wide, gallery.columns),
    phone: readColumns(STORE_KEYS.phone, choices.phone, gallery.phoneColumns),
  };

  const thumbPic = (image, cls) => {
    const files = picOf(gallery, image);
    return el('img', {
      class: cls,
      src: fallbackFor(files),
      srcset: srcsetFor(files),
      sizes: thumbSizes(columns.wide, columns.phone),
      // The button's label names the image, so the img is decorative
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      style: thumbStyle(image),
    });
  };

  // A compare thumb: 'badge' (the top image + a Compare tag) or 'split'
  // (both images, cut at a line in the middle)
  // A video thumb: the poster, the play badge (videoBadge), and for a loop
  // with videoGrid 'hover' or 'always', the loop itself over the poster
  const videoThumbOf = (image) => {
    const loop = image.video === 'loop' && videoGrid !== 'poster' ? loopVideo(videoFileOf(gallery, image), '') : null;
    const badge = [
      el('span', {class: 'gallery-play', 'aria-hidden': 'true'}),
      el('span', {class: 'gallery-pill', 'aria-hidden': 'true'}, image.video === 'loop' ? ui.video.loop : ui.video.movie),
    ];
    return {pics: [thumbPic(image)], extra: [loop, badge], loop};
  };

  // A variant thumb: the first image + a tag (variantBadge): the stack
  // drawing and how many ('count'), the drawing alone, or "3 Versions"
  const variantThumbOf = (image) => {
    const n = variantsOf(image).length;
    const badge = el(
      'span',
      {class: `gallery-badge gallery-badge--variant${variantBadge === 'icon' ? ' gallery-badge--icon' : ''}`},
      variantBadge !== 'text' && stackIcon(),
      variantBadge === 'count' && el('span', {}, String(n)),
      variantBadge === 'text' && el('span', {}, ui.gallery.variantCount(n)),
    );
    return {pics: [thumbPic(image)], extra: badge};
  };

  const thumbOf = (image) => {
    if (image.video) return videoThumbOf(image);
    if (image.variants?.length && !image.compare) return variantThumbOf(image);
    if (!image.compare) return {pics: [thumbPic(image)]};
    if (compareThumb === 'split') {
      return {
        pics: [thumbPic({...image, name: image.compare}), thumbPic(image, 'gallery-thumb-top')],
        extra: el('span', {class: 'gallery-thumb-line'}),
        cls: `gallery-thumb--split gallery-thumb--${splitOf(gallery, image)}`,
      };
    }
    const badge = el(
      'span',
      {class: `gallery-badge gallery-badge--${compareBadge}`},
      compareBadge !== 'text' && compareIcon(),
      compareBadge !== 'icon' && el('span', {}, ui.gallery.compare),
    );
    return {pics: [thumbPic(image)], extra: badge};
  };

  // Loops in the grid: 'hover' plays one while the mouse is over its card,
  // 'always' plays each while it's on screen. The poster stays underneath,
  // so the card looks the same before a loop has loaded.
  const playLoop = (video) =>
    !REDUCED.matches && video.play().then(() => video.classList.add('is-on')).catch(() => {});
  const stopLoop = (video) => {
    video.pause();
    video.classList.remove('is-on');
  };
  const onScreen =
    videoGrid === 'always' &&
    new IntersectionObserver(
      (entries) => entries.forEach(({target, isIntersecting}) => (isIntersecting ? playLoop(target) : stopLoop(target))),
      {threshold: 0.4},
    );
  const watchLoop = (item, video) => {
    if (onScreen) onScreen.observe(video);
    if (videoGrid !== 'hover') return;
    item.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && playLoop(video));
    item.addEventListener('pointerleave', () => stopLoop(video));
  };

  const thumbs = images.map((image, i) => {
    const {pics, extra, cls, loop} = thumbOf(image);
    const [before, after] = labelsOf(gallery, image);
    const label = image.compare
      ? `${altOf(image)}, ${before} and ${after}`
      : image.variants?.length
        ? `${altOf(image)}, ${ui.gallery.variantCount(variantsOf(image).length)}`
        : altOf(image);
    const action = {loop: 'play muted loop', movie: 'play video with sound'}[image.video] ?? 'open larger';
    const item = el(
      'button',
      {type: 'button', class: 'gallery-item', 'aria-label': `${label} (${action})`},
      el('span', {class: cls ? `gallery-thumb ${cls}` : 'gallery-thumb'}, pics, extra),
      el('span', {class: 'gallery-name', 'aria-hidden': 'true'}, titleOf(image)),
    );
    // The lightbox holds the visible images only, so a thumb opens at its
    // place among them
    item.addEventListener('click', () => lightbox.open(visible.indexOf(i)));
    if (loop) watchLoop(item, loop);
    return {item, pics, cell: el('li', {}, item)};
  });

  // The images the filter lets through (all of them without a filter).
  // The lightbox is built for exactly those, so its arrows, bar and ticks
  // step through the filtered set; closing returns focus to the thumb.
  let visible = images.map((_, i) => i);
  const buildLightbox = () =>
    createLightbox({
      title,
      gallery: {...gallery, images: visible.map((i) => images[i])},
      onClose: (j) => thumbs[visible[j]].item.focus(),
    });
  let lightbox = buildLightbox();

  // Hide the others in place; the chips can't change while the lightbox
  // is open, so swapping it for a new one here is safe. iltered (any
  // chip picked) marks the grid (filteredMark), even when a pick matches
  // every image
  const showOnly = (indexes, filtered) => {
    visible = indexes;
    element.classList.toggle('is-filtered', filtered);
    const shown = new Set(indexes);
    thumbs.forEach(({cell}, i) => (cell.hidden = !shown.has(i)));
    const next = buildLightbox();
    lightbox.element.replaceWith(next.element);
    lightbox = next;
  };

  const filter = gallery.filter
    ? createGalleryFilter({
        images,
        facets: gallery.facets ?? GALLERY_FACETS,
        counts: gallery.counts,
        rowLines: gallery.rowLines,
        start: readPicks(key),
        onChange: (indexes, picks) => {
          savePicks(key, picks);
          showOnly(indexes, picks.length > 0);
        },
      })
    : null;

  const grid = el('ul', {class: 'gallery-grid'}, thumbs.map(({cell}) => cell));
  const controls = Object.fromEntries(
    ['wide', 'phone'].map((size) => [
      size,
      createColumnControl({size, choices: choices[size], look: columnControl, onPick: (n) => setColumns(size, n, true)}),
    ]),
  );
  const CSS_VAR = {wide: '--cols', phone: '--phone-cols'};

  const setColumns = (size, n, save) => {
    columns[size] = n;
    if (save) saveColumns(STORE_KEYS[size], n);
    grid.style.setProperty(CSS_VAR[size], n);
    controls[size].set(n);
    thumbs.forEach(({pics}) => pics.forEach((pic) => pic.setAttribute('sizes', thumbSizes(columns.wide, columns.phone))));
  };

  const classes = [
    'gallery',
    `gallery--hover-${thumbHover}`,
    `gallery--position-${position}`,
    `gallery--ticks-${tickShape}`,
    !barFill && 'gallery--no-fill',
    !ticks && 'gallery--no-ticks',
    filter && `gallery--mark-${filteredMark}`,
    `gallery--badge-${videoBadge}`,
  ].filter(Boolean);
  const element = el(
    'div',
    {
      class: classes.join(' '),
      style: `--thumb-aspect: ${aspect}; --tick: ${tickSize}px`,
    },
    filter?.element,
    el('div', {class: 'gallery-toolbar'}, lead ?? filter?.status, controls.wide.element, controls.phone.element),
    grid,
    lightbox.element,
  );
  setColumns('wide', columns.wide, false);
  setColumns('phone', columns.phone, false);
  // Picks kept on this history entry (Back, reload): match them before
  // the page is shown, so scroll memory measures the filtered height
  if (filter?.startFiltered) showOnly(filter.startVisible, true);
  return element;
};
