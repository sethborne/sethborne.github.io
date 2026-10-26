// Page view: renders any content node, found by its path.
// Groups show their child cards; leaves show their tags and live demo
// (writeup comes later). Returns {element, heading, title}.
import {el} from '../../js/dom.js';
import {findTrail, isLeaf} from '../../js/content.js';
import {createBreadcrumb} from '../breadcrumb/breadcrumb.js';
import {createCardGrid, labelFor} from '../card/card.js';
import {createEmbed} from '../embed/embed.js';

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
  const children = (node.children ?? []).map((child) => ({
    node: child,
    path: [...path, child.id],
  }));

  return {
    element: shell(
      createBreadcrumb(trail),
      el(
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
      ),
      demo,
      children.length > 0 && createCardGrid(children),
    ),
    heading: h1,
    title: node.title,
  };
};
