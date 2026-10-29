// Home hero: intro text over a background photo.
// Fills <section id="home"> and returns {ready} for the spinner.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

// ['Web developer', 'building'] -> Web developer<br>building
const withBreaks = (lines) =>
  lines.flatMap((line, i) => (i ? [el('br'), line] : [line]));

const renderMedia = (slide) => {
  const img = el('img', {
    class: 'hero-img',
    src: fallbackFor(slide),
    srcset: srcsetFor(slide),
    sizes: '100vw', // full-bleed: always the viewport's width
    alt: slide.alt ?? '',
    decoding: 'async',
    fetchpriority: 'high', // largest thing on first load
  });
  const layer = el('div', {class: 'hero-media'}, img, el('div', {class: 'hero-wash'}));
  return {img, layer};
};

export const createHero = (root, {hero}) => {
  const {eyebrow, title, summary, tags, ctas, media} = hero;
  const slide = media?.slides?.[0]; // image mode: first slide only
  const {img, layer} = slide ? renderMedia(slide) : {};

  root.replaceChildren(
    ...(layer ? [layer] : []),
    el(
      'div',
      {class: 'container'},
      el(
        'div',
        {class: 'hero-inner'},
        el('span', {class: 'hero-name'}, eyebrow),
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
  );

  // Resolves once the photo is decoded. Never rejects: a missing or
  // broken image just drops the photo layer, so the spinner isn't held.
  const ready = img
    ? img.decode().catch(() => {
        console.warn(`Hero image couldn't load: ${img.currentSrc || img.src}`);
        layer.remove();
      })
    : Promise.resolve();

  return {ready};
};
