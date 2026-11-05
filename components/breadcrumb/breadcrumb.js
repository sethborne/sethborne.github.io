// Location breadcrumb: Home › Projects › Survey Map › Experience Builder.
// Built from a findTrail() result, so it always mirrors the content tree.
import {el} from '../../js/dom.js';
import ui from '../../content/ui.js';

// Every trail starts here. They stand in for the tree root ('Seth Borne'),
// which has no page of its own.
const START = [
  {label: ui.breadcrumb.home, href: '#/'},
  {label: ui.breadcrumb.projects, href: '#/projects'},
];

// trail from findTrail(tree, ['textile-contacts', 'public-map']):
//   [root, <textile-contacts>, <public-map>]
//   -> [{label: 'Washington Textile Survey and Map Tools', href: '#/textile-contacts'},
//       {label: 'Experience Builder: Public App', href: '#/textile-contacts/public-map'}]
// Each crumb's path is every id up to and including its own.
const crumbsFor = (trail) =>
  trail.slice(1).map((node, i, nodes) => ({
    label: node.title,
    href: `#/${nodes
      .slice(0, i + 1)
      .map(({id}) => id)
      .join('/')}`,
  }));

// The trail as a list. `linkAttrs` goes on every link (the bar's copy
// takes its links out of the Tab order).
const crumbList = (crumbs, linkAttrs = {}) => {
  const last = crumbs.length - 1;
  return el(
    'ol',
    {},
    crumbs.map(({label, href}, i) =>
      el(
        'li',
        {},
        // The current page is plain text, not a link to itself
        i === last
          ? el('span', {'aria-current': 'page'}, label)
          : el('a', {href, ...linkAttrs}, label),
      ),
    ),
  );
};

// Phones show only this: one line up to the parent page, instead of a
// full trail that wraps to three or four lines. CSS picks which shows.
const upLink = ({label, href}, linkAttrs = {}) =>
  el('a', {class: 'breadcrumb-up', href, ...linkAttrs}, `‹ ${label}`);

// Bar that slides in under the header once the breadcrumb scrolls out
// of view, showing the same thing: the full trail on wide screens,
// "‹ Parent" on phones. It's a separate element, not the breadcrumb
// made sticky, so the breadcrumb's own space on the page never changes.
// Screen readers and Tab skip it: it copies the breadcrumb they
// already have. (Not `inert`, which would block clicks too.)
const createBar = (crumbs, parent) => {
  const skipped = {tabindex: '-1'};
  return el(
    'div',
    {class: 'crumb-bar', 'aria-hidden': 'true'},
    el(
      'div',
      {class: 'container breadcrumb'},
      crumbList(crumbs, skipped),
      upLink(parent, skipped),
    ),
  );
};

// Returns [breadcrumb, bar]; el() flattens arrays, so a parent can take
// both as one child.
export const createBreadcrumb = (trail) => {
  const crumbs = [...START, ...crumbsFor(trail)];
  const parent = crumbs[crumbs.length - 2];
  const nav = el(
    'nav',
    {class: 'breadcrumb', 'aria-label': 'Breadcrumb'},
    crumbList(crumbs),
    upLink(parent),
  );
  const bar = createBar(crumbs, parent);

  // Show the bar once the breadcrumb has gone up under the header. The
  // margin trims the header off the top of the watched area, so
  // rootBounds.top is the header's bottom edge. "Above it" rules out
  // the other way to be out of view, below the screen.
  const navHeight = getComputedStyle(document.documentElement)
    .getPropertyValue('--nav-height')
    .trim();
  new IntersectionObserver(
    ([entry]) => {
      const scrolledPast =
        !entry.isIntersecting &&
        entry.boundingClientRect.top < entry.rootBounds.top;
      bar.classList.toggle('is-shown', scrolledPast);
    },
    {rootMargin: `-${navHeight} 0px 0px 0px`},
  ).observe(nav);

  return [nav, bar];
};
