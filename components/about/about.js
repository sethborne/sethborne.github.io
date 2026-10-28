// About section: bio, optional photo, grouped skills.
// Fills the existing <section id="about"> from content/about.js.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

// false hides the photo column; the text then runs full width.
const SHOW_PHOTO = true;

// Placeholder until the portrait exists, or if it fails to load
const placeholder = () =>
  el('div', {class: 'about-photo-empty map-grid'}, el('span', {}, 'Photo coming'));

const renderPhoto = (photo) => {
  if (!photo) return placeholder();
  const img = el('img', {
    class: 'about-photo-img',
    src: fallbackFor(photo),
    srcset: srcsetFor(photo),
    // Shown at most ~320px wide, so the browser can pick a small file
    sizes: '320px',
    alt: photo.alt ?? '',
    loading: 'lazy',
    decoding: 'async',
  });
  // A missing file shouldn't leave a broken-image icon
  img.addEventListener('error', () => img.replaceWith(placeholder()), {
    once: true,
  });
  return img;
};

const renderSkills = (skills) =>
  el(
    'dl',
    {class: 'about-skills'},
    skills.map(({label, items}) =>
      el(
        'div',
        {class: 'about-skill-group'},
        el('dt', {}, label),
        el(
          'dd',
          {},
          el(
            'ul',
            {class: 'pills'},
            items.map((item) => el('li', {class: 'pill'}, item)),
          ),
        ),
      ),
    ),
  );

export const createAbout = (root, {about}) => {
  const {eyebrow, title, paragraphs, photo, skills} = about;

  root.replaceChildren(
    el(
      'div',
      {class: `container about${SHOW_PHOTO ? ' has-photo' : ''}`},
      SHOW_PHOTO && el('div', {class: 'about-photo'}, renderPhoto(photo)),
      el(
        'div',
        {class: 'about-text'},
        el(
          'div',
          {class: 'section-head'},
          el('span', {class: 'eyebrow'}, eyebrow),
          el('h2', {}, title),
        ),
        paragraphs.map((text) => el('p', {class: 'about-bio'}, text)),
        renderSkills(skills),
      ),
    ),
  );
};
