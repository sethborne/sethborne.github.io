// Project card: one content node as a clickable summary.
// createCardGrid lays out a list of them (home Projects, group pages).
import {el} from '../../js/dom.js';
import {isLeaf} from '../../js/content.js';
import * as TAGS from '../../content/tags.js';

// Grouped tags hold ids only ({tool: ['survey123']}), so look the
// display label back up from the tags.js exports.
//   labelFor('tool', 'survey123') -> 'Survey123'
const LABELS = new Map(
  Object.values(TAGS).map(({facet, id, label}) => [
    `${facet}:${id}`,
    label,
  ]),
);

export const labelFor = (facet, id) =>
  LABELS.get(`${facet}:${id}`) ?? id;

// Takes the {node, path} items collectLeaves returns.
export const createCard = ({node, path}) => {
  const leaf = isLeaf(node);
  const eyebrow = leaf
    ? node.tags.type?.[0] && labelFor('type', node.tags.type[0])
    : 'Project';
  const tools = leaf ? (node.tags.tool ?? []) : [];

  return el(
    'article',
    {class: 'card'},
    // Placeholder until nodes have thumbs (then srcsetFor, like the hero)
    el(
      'div',
      {class: 'card-thumb', 'aria-hidden': 'true'},
      'Screenshot coming',
    ),
    el(
      'div',
      {class: 'card-body'},
      eyebrow && el('span', {class: 'card-eyebrow'}, eyebrow),
      // The one link; card.css stretches it over the whole card
      el(
        'h3',
        {},
        el('a', {href: `#/${path.join('/')}`}, node.title),
      ),
      node.summary && el('p', {}, node.summary),
      tools.length > 0 &&
        el(
          'ul',
          {class: 'pills', 'aria-label': 'Tools'},
          tools.map((id) =>
            el('li', {class: 'pill'}, labelFor('tool', id)),
          ),
        ),
    ),
  );
};

export const createCardGrid = (items) =>
  el('div', {class: 'card-grid'}, items.map(createCard));
