// Live demo: an AGOL app in an iframe, loaded only on click.
// The fallback (screenshot, or a placeholder box) always shows first, so
// a broken or expired embed never leaves a blank frame. A cross-origin
// iframe can't report failure, so there's nothing to detect; the data
// decides instead (ARCHITECTURE.md → Embeds).
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

// emptyText fills the box when there's no screenshot yet
const renderFallback = (fallback, emptyText) =>
  fallback
    ? el('img', {
        class: 'embed-fallback',
        src: fallbackFor(fallback),
        srcset: srcsetFor(fallback),
        // Container width (1080 max minus 2 × 24px padding), else full width
        sizes: '(min-width: 1080px) 1032px, 100vw',
        alt: fallback.alt ?? '',
        loading: 'lazy',
        decoding: 'async',
      })
    : el('div', {class: 'embed-placeholder map-grid'}, el('span', {}, emptyText));

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

// Link text when content.openLabel isn't given. The ↗ is always added.
const OPEN_LABEL = 'Open in new tab';

// Takes a node's title plus its content fields. embed is either
//   'https://…'                   live: Load button + new-tab link
//   {placeholder: 'eb-external'}  pending() in site.js: not public yet
//   missing                       license ended: fallback only
export const createEmbed = ({
  title,
  embed,
  fallback,
  tryThis,
  openLabel = OPEN_LABEL,
}) => {
  const live = typeof embed === 'string';
  const frame = el(
    'div',
    {class: 'embed-frame'},
    renderFallback(fallback, live ? 'Screenshot coming' : 'Live demo coming soon'),
  );

  if (live) {
    const button = el(
      'button',
      {class: 'btn btn-primary embed-load', type: 'button'},
      'Load live demo',
    );
    button.addEventListener('click', () => {
      const iframe = renderIframe(embed, title);
      frame.replaceChildren(iframe);
      // The button just left the page; without this, focus falls back
      // to <body> and keyboard users lose their place.
      iframe.focus();
    });
    frame.append(button);
  }

  const caption =
    (tryThis || live) &&
    el(
      'figcaption',
      {class: 'embed-caption'},
      tryThis &&
        el('p', {class: 'embed-try'}, el('strong', {}, 'Try this: '), tryThis),
      live &&
        el(
          'a',
          {class: 'embed-open', href: embed, target: '_blank', rel: 'noopener'},
          // Opens the app at its own AGOL/Portal URL, not a bigger frame here
          openLabel,
          el('span', {'aria-hidden': 'true'}, ' ↗'),
        ),
    );

  // data-placeholder marks it for swapping, like placeholder links
  return el(
    'figure',
    {class: 'embed', 'data-placeholder': embed?.placeholder},
    frame,
    caption,
  );
};
