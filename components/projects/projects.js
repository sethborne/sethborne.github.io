// Home Projects body: heading, filter bar, result count and the card grid.
// No filter shows the top-level projects; a filter shows the matching
// apps and tools, each labelled with where it lives in the tree.
// Returns {show(query)}; app.js calls it on every home or filter route.
import {el} from '../../js/dom.js';
import {cleanQuery, collectLeaves, filterLeaves, findTrail} from '../../js/content.js';
import {createCardGrid} from '../card/card.js';
import {createFilterBar} from '../filter-bar/filter-bar.js';
import ui from '../../content/ui.js';

// Where a leaf lives, for its card's eyebrow:
//   ['textile-contacts', 'public-map'] -> 'Washington Textile Survey and Map Tools'
//   ['textile-resale-economy', 'data-pipeline', 'deduper'] -> 'Washington State Textile Secondary Resale Economy › Data Pipeline'
const locationOf = (tree, path) =>
  findTrail(tree, path.slice(0, -1))
    .slice(1)
    .map(({title}) => title)
    .join(' › ');

// section: the heading copy, {eyebrow, title, intro} (content/projects-section.js)
export const createProjects = (root, {tree, section, facets, onChange}) => {
  const total = collectLeaves(tree).length;
  const groups = tree.children.map((node) => ({node, path: [node.id]}));

  const bar = createFilterBar({tags: tree.tags, facets, onChange});
  // Only the count is live, so a change is read out as one short phrase
  const count = el('span', {class: 'projects-count', 'aria-live': 'polite'});
  const clear = el(
    'button',
    {type: 'button', class: 'projects-clear', hidden: true},
    ui.projects.clear,
  );
  clear.addEventListener('click', () => onChange({}));
  const results = el('div', {class: 'projects-results'});

  const head = el(
    'div',
    {class: 'section-head'},
    el('span', {class: 'eyebrow'}, section.eyebrow),
    el('h2', {}, section.title),
    el('p', {}, section.intro),
  );

  root.replaceChildren(
    head,
    bar.element,
    el('p', {class: 'projects-status'}, count, clear),
    results,
  );

  const show = (rawQuery) => {
    const query = cleanQuery(rawQuery, tree.tags, facets);
    const filtering = Object.keys(query).length > 0;
    bar.setSelected(query);

    // Clear is about to vanish; don't strand keyboard focus on it
    const clearHadFocus = document.activeElement === clear;
    clear.hidden = !filtering;
    if (clearHadFocus && !filtering) bar.focusFirst();

    if (!filtering) {
      count.textContent = '';
      results.replaceChildren(createCardGrid(groups));
      return;
    }

    const matches = filterLeaves(tree, query).map((item) => ({
      ...item,
      eyebrow: locationOf(tree, item.path),
    }));
    count.textContent = matches.length
      ? ui.projects.count(matches.length, total)
      : ui.projects.none;
    results.replaceChildren(...(matches.length ? [createCardGrid(matches)] : []));
  };

  return {show};
};
