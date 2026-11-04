// Location breadcrumb: Home › Projects › Survey Map › Experience Builder.
// Built from a findTrail() result, so it always mirrors the content tree.
import {el} from '../../js/dom.js';

// Every trail starts here. They stand in for the tree root ('Seth Borne'),
// which has no page of its own.
const START = [
  {label: 'Home', href: '#/'},
  {label: 'Projects', href: '#/projects'},
];

// trail from findTrail(tree, ['textile-contacts', 'public-map']):
//   [root, <textile-contacts>, <public-map>]
//   -> [{label: 'Washington Textile Survey and Map Tools', href: '#/textile-contacts'},
//       {label: 'Experience Builder: public app', href: '#/textile-contacts/public-map'}]
// Each crumb's path is every id up to and including its own.
const crumbsFor = (trail) =>
  trail.slice(1).map((node, i, nodes) => ({
    label: node.title,
    href: `#/${nodes
      .slice(0, i + 1)
      .map(({id}) => id)
      .join('/')}`,
  }));

export const createBreadcrumb = (trail) => {
  const crumbs = [...START, ...crumbsFor(trail)];
  const last = crumbs.length - 1;
  return el(
    'nav',
    {class: 'breadcrumb', 'aria-label': 'Breadcrumb'},
    el(
      'ol',
      {},
      crumbs.map(({label, href}, i) =>
        el(
          'li',
          {},
          // The current page is plain text, not a link to itself
          i === last
            ? el('span', {'aria-current': 'page'}, label)
            : el('a', {href}, label),
        ),
      ),
    ),
  );
};
