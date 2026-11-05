// Live demo: an AGOL app in an iframe, loaded only on click.
// The fallback (screenshot, or a placeholder box) always shows first, so
// a broken or expired embed never leaves a blank frame. A cross-origin
// iframe can't report failure, so there's nothing to detect; the data
// decides instead (ARCHITECTURE.md → Embeds).
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';
import ui from '../../content/ui.js';

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

// Under the frame: the Try This line, plus anything else (the new-tab
// link beside a live embed)
const renderCaption = (tryThis, ...more) =>
  el(
    'figcaption',
    {class: 'embed-caption'},
    tryThis && el('p', {class: 'embed-try'}, el('strong', {}, `${ui.embed.tryThis}: `), tryThis),
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

// For an app that doesn't work well in a frame (it picks a cramped
// layout, or opens its own tabs): the screenshot is a link to the app in
// a new tab, the browser's normal behavior. No iframe, nothing to break.
const renderLinkFrame = ({url, title, fallback, openLabel}) =>
  el(
    'a',
    {class: 'embed-frame embed-link', href: url, target: '_blank', rel: 'noopener'},
    renderFallback(fallback, ui.embed.screenshotComing),
    el('span', {class: 'btn btn-primary embed-load'}, openText(openLabel)),
    el('span', {class: 'visually-hidden'}, ` ${title} (opens in a new tab)`),
  );

// Takes a node's title plus its content fields. One of:
//   link: 'https://…'             screenshot that opens the app in a new tab
//   embed: 'https://…'            live: Load button + new-tab link
//   embed: {placeholder: 'textile-contacts/public-map'}  pendingEmbed() (content/helpers.js): not public yet
//   neither, with a fallback      license ended: fallback only
export const createEmbed = ({
  title,
  embed,
  link,
  fallback,
  tryThis,
  openLabel = ui.embed.open,
}) => {
  if (link) {
    return el(
      'figure',
      {class: 'embed'},
      renderLinkFrame({url: link, title, fallback, openLabel}),
      tryThis && renderCaption(tryThis),
    );
  }

  const live = typeof embed === 'string';
  const frame = el(
    'div',
    {class: 'embed-frame'},
    renderFallback(fallback, live ? ui.embed.screenshotComing : ui.embed.comingSoon),
  );

  if (live) {
    const button = el(
      'button',
      {class: 'btn btn-primary embed-load', type: 'button'},
      ui.embed.load,
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
    renderCaption(
      tryThis,
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
    caption,
  );
};
