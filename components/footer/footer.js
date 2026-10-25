// Site footer: contact links and copyright. In normal page flow at the
// end of every page (not fixed).
import {el} from '../../js/dom.js';

export const createFooter = (root, {profile}) => {
  const links = profile.links.map(({label, href, placeholder}) =>
    el('li', {}, el('a', {href, 'data-placeholder': placeholder}, label)),
  );
  const year = new Date().getFullYear();

  root.replaceChildren(
    el(
      'div',
      {class: 'footer-inner'},
      // Copyright left, links right: mirrors the header's name + menu
      el(
        'p',
        {class: 'footer-copy'},
        `© ${year} ${profile.name}. All rights reserved.`,
      ),
      el('ul', {class: 'footer-links'}, links),
    ),
  );

  // Publish the footer's height as --footer-height, so the last home
  // section can fill exactly the rest of the screen (styles.css).
  // ResizeObserver re-measures when the links wrap at narrow widths.
  new ResizeObserver(([entry]) => {
    const height = entry.borderBoxSize[0].blockSize;
    document.documentElement.style.setProperty('--footer-height', `${height}px`);
  }).observe(root);
};
