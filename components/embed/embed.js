// Live demo: an AGOL app in an iframe, loaded only on click.
// The fallback (screenshot, or a placeholder box) always shows first, so
// a broken or expired embed never leaves a blank frame. A cross-origin
// iframe can't report failure, so there's nothing to detect; the data
// decides instead (ARCHITECTURE.md → Embeds).
import {el} from '../../js/dom.js';
import {fallbackFor, largestFor, srcsetFor} from '../../js/images.js';
import {SLIDES_DEFAULTS} from '../../content/helpers.js';
import ui from '../../content/ui.js';
import {createSlides} from './slides.js';

// `fallback` is one image or a list; two or more become a slideshow
const imagesOf = (fallback) => [fallback].flat().filter(Boolean);

// emptyText fills the box when there's no screenshot yet. `sizes` tells
// the browser how wide the image shows, so it picks the right file
const FRAME_SIZES = '(min-width: 1080px) 1032px, 100vw';
const PICTURE_SIZES = '(min-width: 768px) 720px, 100vw';

const renderFallback = (fallback, emptyText, sizes = FRAME_SIZES) =>
  fallback
    ? el('img', {
        class: 'embed-fallback',
        src: fallbackFor(fallback),
        srcset: srcsetFor(fallback),
        // Frames: container width (1080 max minus 2 × 24px padding);
        // pictures: the text column (--text-width)
        sizes,
        alt: fallback.alt ?? '',
        loading: 'lazy',
        decoding: 'async',
      })
    : el('div', {class: 'embed-placeholder map-grid'}, el('span', {}, emptyText));

// Under the frame: the Try This line or a plain caption, plus anything
// else (the new-tab link beside a live embed, View Full Size)
const renderCaption = ({tryThis, caption}, ...more) =>
  el(
    'figcaption',
    {class: 'embed-caption'},
    tryThis && el('p', {class: 'embed-try'}, el('strong', {}, `${ui.embed.tryThis}: `), tryThis),
    caption && el('p', {class: 'embed-note'}, caption),
    more,
  );

// No sandbox: Survey123 needs scripts, forms, popups and same-origin to
// submit, and a sandbox would block them.
const renderIframe = (src, title) =>
  el('iframe', {
    class: 'embed-iframe',
    src,
    title: `${title}: live demo`,
    allow: 'fullscreen; geolocation',
    allowfullscreen: true,
    referrerpolicy: 'strict-origin-when-cross-origin',
  });

// The button label: the page's Open Label, ↗ for sighted readers only
// (screen readers hear the label; the link says it opens a new tab)
const openText = (openLabel) => [openLabel, el('span', {'aria-hidden': 'true'}, ' ↗')];

// The link's inside: the button look plus the screen reader's words
const linkParts = (title, openLabel) => [
  el('span', {class: 'btn btn-primary embed-load'}, openText(openLabel)),
  el('span', {class: 'visually-hidden'}, ` ${title} (opens in a new tab)`),
];

// For an app that doesn't work well in a frame (it picks a cramped
// layout, or opens its own tabs): the screenshot is a link to the app in
// a new tab, the browser's normal behavior. No iframe, nothing to break.
// With a slideshow the frame can't be the link (its buttons can't sit
// inside a link), so the link covers the images, under the controls.
const renderLinkFrame = ({url, title, images, settings, openLabel}) => {
  const link = {href: url, target: '_blank', rel: 'noopener'};
  if (images.length > 1) {
    const cover = el('a', {class: 'embed-link embed-link-cover', ...link}, linkParts(title, openLabel));
    return el('div', {class: 'embed-frame'}, createSlides({images, settings, over: cover}));
  }
  return el(
    'a',
    {class: 'embed-frame embed-link', ...link},
    renderFallback(images[0], ui.embed.screenshotComing),
    linkParts(title, openLabel),
  );
};

// A picture with no app behind it (a photo, a slide): nothing will
// replace it, so it keeps its own shape instead of the 4:3 / 16:10 crop,
// and a click opens the largest file in a new tab, like a gallery's View
// Full Size. `aspect` ('16 / 9') holds its height before it loads, so
// scroll memory measures the page right.
const renderPicture = ({image, aspect}) => {
  const href = largestFor(image);
  const newTab = {href, target: '_blank', rel: 'noopener'};
  return {
    frame: el(
      'a',
      {class: 'embed-frame embed-picture', style: aspect && `aspect-ratio: ${aspect}`, ...newTab},
      renderFallback(image, null, PICTURE_SIZES),
      el('span', {class: 'visually-hidden'}, ` ${ui.embed.fullSize} (opens in a new tab)`),
    ),
    // The same link in words, for anyone who doesn't think to click the image
    full: el('a', {class: 'embed-open', ...newTab}, openText(ui.embed.fullSize)),
  };
};

// Takes a node's title plus its content fields. One of:
//   link: 'https://…'             screenshot that opens the app in a new tab
//   embed: 'https://…'            live: Load button + new-tab link
//   embed: {placeholder: 'textile-contacts/public-map'}  pendingEmbed() (content/helpers.js): not public yet
//   neither, with one image       a picture: own shape, opens full size
//   neither, with a list          a slideshow of screenshots, nothing to load
// `fallback` is one image or a list (pageImages()); two or more make a
// slideshow, set by `slides` over SLIDES_DEFAULTS (content/helpers.js).
export const createEmbed = ({
  title,
  embed,
  link,
  fallback,
  slides,
  tryThis,
  caption,
  aspect,
  openLabel = ui.embed.open,
}) => {
  const images = imagesOf(fallback);
  const settings = {...SLIDES_DEFAULTS, ...slides};
  const words = {tryThis, caption};

  if (!embed && !link && images.length === 1) {
    const {frame, full} = renderPicture({image: images[0], aspect});
    return el('figure', {class: 'embed'}, frame, renderCaption(words, full));
  }

  if (link) {
    return el(
      'figure',
      {class: 'embed'},
      renderLinkFrame({url: link, title, images, settings, openLabel}),
      (tryThis || caption) && renderCaption(words),
    );
  }

  const live = typeof embed === 'string';
  const button =
    live &&
    el(
      'button',
      {class: 'btn btn-primary embed-load', type: 'button'},
      ui.embed.load,
    );
  // A slideshow holds the button (above the images, under its controls);
  // one image sits beside it in the frame, as before
  const frame =
    images.length > 1
      ? el('div', {class: 'embed-frame'}, createSlides({images, settings, over: button}))
      : el(
          'div',
          {class: 'embed-frame'},
          renderFallback(images[0], live ? ui.embed.screenshotComing : ui.embed.comingSoon),
          button,
        );

  if (button) {
    button.addEventListener('click', () => {
      const iframe = renderIframe(embed, title);
      // Replaces the slideshow too, which stops its autoplay
      frame.replaceChildren(iframe);
      // The button just left the page; without this, focus falls back
      // to <body> and keyboard users lose their place.
      iframe.focus();
    });
  }

  const under =
    (tryThis || caption || live) &&
    renderCaption(
      words,
      live &&
        el(
          'a',
          {class: 'embed-open', href: embed, target: '_blank', rel: 'noopener'},
          // Opens the app at its own AGOL/Portal URL, not a bigger frame here
          openText(openLabel),
        ),
    );

  // data-placeholder marks it for swapping, like placeholder links
  return el(
    'figure',
    {class: 'embed', 'data-placeholder': embed?.placeholder},
    frame,
    under,
  );
};
