// Page view: renders any content node, found by its path.
// Groups show their child cards; leaves show their tags and live demo.
// Either can have a writeup (STAR story) and links, shown after the
// demo and before the cards; a writeup's TL;DR gets its own column on
// desktop. Returns {element, heading, title}.
import {el} from '../../js/dom.js';
import {findTrail, isLeaf} from '../../js/content.js';
import {createBreadcrumb} from '../breadcrumb/breadcrumb.js';
import {createCardGrid, labelFor} from '../card/card.js';
import {createEmbed} from '../embed/embed.js';
import {createWriteup} from '../writeup/writeup.js';

// tabindex -1: app.js moves focus here after navigation, like a real
// page load, without adding the heading to the Tab order.
const heading = (text) => el('h1', {tabindex: '-1'}, text);

const shell = (...children) =>
  el('section', {class: 'section page'}, el('div', {class: 'container'}, children));

// Every tag on a leaf, tools first, as display labels
const tagLabels = (tags) =>
  Object.entries(tags).flatMap(([facet, ids]) =>
    ids.map((id) => labelFor(facet, id)),
  );

// Outside links for a node (live versions, source code), each opening
// in a new tab. The ↗ is decorative; screen readers hear the label.
const renderLinks = (title, links) =>
  el(
    'section',
    {class: 'page-links'},
    el('h2', {}, title),
    el(
      'div',
      {class: 'page-links-row'},
      links.map(({label, href}) =>
        el(
          'a',
          {class: 'btn btn-ghost', href, target: '_blank', rel: 'noopener'},
          label,
          el('span', {'aria-hidden': 'true'}, ' ↗'),
          el('span', {class: 'visually-hidden'}, ' (opens in a new tab)'),
        ),
      ),
    ),
  );

// Page layouts for pages with an aside (see `aside` in createPage),
// picked by the node's `layout` field (site.js). Same pieces every time
// (head, aside, main); page.css arranges them. Mobile always stacks.
//   right: TL;DR column on the right (default)
//   left:  TL;DR column on the left
//   full:  no column; TL;DR box above the story, full width
const LAYOUTS = ['right', 'left', 'full'];

const layoutOf = (node) => {
  const layout = node.layout ?? 'right';
  if (LAYOUTS.includes(layout)) return layout;
  console.warn(`Unknown layout "${layout}" on ${node.id}, using "right"`);
  return 'right';
};

const renderNotFound = (path) => {
  const h1 = heading('Page not found');
  return {
    element: shell(
      h1,
      el('p', {class: 'page-summary'}, `Nothing lives at #/${path.join('/')}.`),
      el('a', {href: '#/projects', class: 'btn btn-ghost'}, 'Back to projects'),
    ),
    heading: h1,
    title: 'Page not found',
  };
};

export const createPage = ({tree, path}) => {
  const trail = findTrail(tree, path);
  if (!trail) return renderNotFound(path);

  const node = trail.at(-1);
  const h1 = heading(node.title);
  const labels = isLeaf(node) ? tagLabels(node.tags) : [];
  // Something to show in the frame: a live URL, a screenshot, or both
  const {embed, fallback} = node.content ?? {};
  const demo = (embed || fallback) && createEmbed({title: node.title, ...node.content});
  const {summary, story} = node.writeup ? createWriteup(node.writeup) : {};
  const links =
    node.links?.length > 0 && renderLinks(node.linksTitle ?? 'Links', node.links);
  const children = (node.children ?? []).map((child) => ({
    node: child,
    path: [...path, child.id],
  }));

  const head = el(
    'header',
    {class: 'page-head'},
    h1,
    node.summary && el('p', {class: 'page-summary'}, node.summary),
    labels.length > 0 &&
      el(
        'ul',
        {class: 'pills', 'aria-label': 'Tags'},
        labels.map((label) => el('li', {class: 'pill'}, label)),
      ),
  );
  // Pieces that can go in the aside, by the names the node's `aside`
  // field uses (site.js). Listed ones move there, in that order; the
  // rest stay in the main column. Default: just the TL;DR.
  const movable = {tldr: summary, links};
  const asideNames = (node.aside ?? ['tldr']).filter((name) => {
    if (name in movable) return true;
    console.warn(`Unknown aside piece "${name}" on ${node.id}`);
    return false;
  });
  const inAside = (name) => asideNames.includes(name);
  const asideParts = asideNames.map((name) => movable[name]).filter(Boolean);

  // The main column: demo, story, then links (proof that follows Result)
  const main = el(
    'div',
    {class: 'page-main'},
    demo,
    !inAside('tldr') && summary,
    story,
    !inAside('links') && links,
  );
  // With anything in the aside, the node's layout decides where it goes
  // on desktop (stacked between head and main on mobile; page.css)
  const body =
    asideParts.length > 0
      ? el(
          'div',
          {class: `page-body layout-${layoutOf(node)}`},
          head,
          el('aside', {class: 'page-aside', 'aria-label': 'Summary'}, asideParts),
          main,
        )
      : [head, main];

  return {
    element: shell(
      createBreadcrumb(trail),
      body,
      // After a writeup, a heading keeps the cards from reading as
      // part of its last section
      children.length > 0 &&
        node.writeup &&
        el('h2', {class: 'page-subhead'}, 'In this project'),
      children.length > 0 && createCardGrid(children),
    ),
    heading: h1,
    title: node.title,
  };
};
