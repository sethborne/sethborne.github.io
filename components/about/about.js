// About & contact section: bio, optional photo, grouped skills, then a
// contact block with one button per profile link.
// Fills the existing <section id="about"> from content/about.js, with
// the links themselves from content/profile.js.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

// false hides the photo column; the text then runs full width.
const SHOW_PHOTO = true;

// Placeholder until the portrait exists, or if it fails to load
const placeholder = () =>
  el('div', {class: 'about-photo-empty map-grid'}, el('span', {}, 'Photo coming'));

// Portrait tones: converters pick denser characters for darker spots,
// so each character's density decides its color (about.css). Spaces
// and unlisted characters get no tier.
const TIERS = {dark: 'X$&#%@', mid: 'x+*', light: '.:;-='};
const TIER_OF = new Map(
  Object.entries(TIERS).flatMap(([tier, chars]) =>
    [...chars].map((ch) => [ch, tier]),
  ),
);

// Text has no idea where the person ends, so an optional cutout says:
// the same photo with its background removed, converted with the same
// settings. Where the cutout has any character, it's the person (a gray
// tier); a space there over a character here is background ('bg',
// orange). Not "characters must match": soft cutout edges shift a few
// person cells by one character. No cutout: all person.
// One span per run of same-tier characters, not per character. Spaces
// and line breaks show no color, so they join whatever run they're in.
const colorize = (lines, cutout) => {
  const runs = [];
  const add = (tier, ch) => {
    const last = runs.at(-1);
    if (last && (last.tier === tier || ch === ' ' || ch === '\n')) {
      last.text += ch;
    } else {
      runs.push({tier, text: ch});
    }
  };
  lines.forEach((line, row) => {
    if (row > 0) add(null, '\n');
    [...line].forEach((ch, col) => {
      const person = !cutout || (cutout[row]?.[col] ?? ' ') !== ' ';
      add(person ? (TIER_OF.get(ch) ?? null) : 'bg', ch);
    });
  });
  return runs.map(({tier, text}) =>
    tier ? el('span', {class: `ascii-${tier}`}, text) : text,
  );
};

// Windows line endings and trailing blank lines would add rows
const loadLines = (path) =>
  fetch(path)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${path}`);
      return res.text();
    })
    .then((text) => text.replace(/\r/g, '').trimEnd().split('\n'));

// ASCII art portrait: plain text loaded from a .txt file (a JS string
// would treat its backslashes as escapes). role="img" makes screen
// readers announce one picture instead of reading every character.
// --cols lets the CSS size the font so the widest line fits the box.
// Exported for tools/share-card.html, which draws the same portrait
export const renderAscii = ({ascii, cutout, alt}) => {
  const pre = el('pre', {class: 'about-ascii', role: 'img', 'aria-label': alt});
  // A missing cutout only costs the orange; the portrait still shows
  const cutoutReady = cutout && loadLines(cutout).catch((err) => {
    console.warn('Portrait cutout unavailable:', err);
    return null;
  });
  Promise.all([loadLines(ascii), cutoutReady])
    .then(([lines, cutoutLines]) => {
      pre.style.setProperty('--cols', Math.max(...lines.map((l) => l.length)));
      pre.replaceChildren(...colorize(lines, cutoutLines));
    })
    .catch((err) => {
      console.warn('Portrait unavailable:', err);
      pre.replaceWith(placeholder());
    });
  return pre;
};

const renderPhoto = (photo) => {
  if (!photo) return placeholder();
  if (photo.ascii) return renderAscii(photo);
  const img = el('img', {
    class: 'about-photo-img',
    src: fallbackFor(photo),
    srcset: srcsetFor(photo),
    // Shown at most ~260px wide, so the browser can pick a small file
    sizes: '260px',
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
            {class: 'badges'},
            items.map((item) => el('li', {class: 'badge'}, item)),
          ),
        ),
      ),
    ),
  );

// Other sites and files open in a new tab; mailto: stays put.
const opensNewTab = (href) => /^https?:|\.pdf$/.test(href);

const renderLink = ({id, label, href, pending}, primary) => {
  const newTab = !pending && opensNewTab(href);
  const link = el(
    'a',
    {
      href,
      class: `btn ${primary ? 'btn-primary' : 'btn-ghost'}`,
      target: newTab && '_blank',
      rel: newTab && 'noopener',
      // Not live yet: findable for swapping, announced as unavailable,
      // and a click does nothing (href="#" would jump to the top of home)
      'data-placeholder': pending && id,
      'aria-disabled': pending && 'true',
    },
    label,
  );
  if (pending) link.addEventListener('click', (e) => e.preventDefault());
  return link;
};

// Picks profile links by id, in the order contact.links lists them
const renderContact = ({title, text, links}, profile) => {
  const byId = new Map(profile.links.map((link) => [link.id, link]));
  return el(
    'div',
    {class: 'about-contact'},
    el('h3', {}, title),
    el('p', {}, text),
    el(
      'div',
      {class: 'about-contact-links'},
      links
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((link, i) => renderLink(link, i === 0)),
    ),
  );
};

export const createAbout = (root, {about, profile}) => {
  const {eyebrow, title, paragraphs, photo, skills, contact} = about;

  root.replaceChildren(
    el(
      'div',
      {class: `container about${SHOW_PHOTO ? ' has-photo' : ''}`},
      // Heading, photo, text: mobile stacks them in this order; desktop
      // (about.css) puts heading and text left, photo right, so the
      // heading lines up with the other sections' headings.
      el(
        'div',
        {class: 'section-head'},
        el('span', {class: 'eyebrow'}, eyebrow),
        el('h2', {}, title),
      ),
      SHOW_PHOTO && el('div', {class: 'about-photo'}, renderPhoto(photo)),
      el(
        'div',
        {class: 'about-text'},
        paragraphs.map((text) => el('p', {class: 'about-bio'}, text)),
        renderSkills(skills),
        renderContact(contact, profile),
      ),
    ),
  );
};
