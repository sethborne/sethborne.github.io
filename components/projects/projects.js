// Home Projects body: heading, View tabs, filter bar, status line and the
// card grid. Two views:
//   projects  the top-level project cards (no query)
//   all       apps and tools (the leaves), each labelled with where it
//             lives: every one (?view=all) or the ones a filter matches
// A chip always means the all view, so the Projects tab clears the chips.
// Returns {show(query)}; app.js calls it on every home or filter route.
import {el} from '../../js/dom.js';
import {cleanQuery, collectLeaves, filterLeaves, findTrail} from '../../js/content.js';
import {createCardGrid} from '../card/card.js';
import {createFilterBar, createViewTabs} from '../filter-bar/filter-bar.js';
import {VIEW_KEY} from '../../js/router.js';
import ui from '../../content/ui.js';

// Where a leaf lives, for its card's eyebrow:
//   ['textile-contacts', 'public-map'] -> 'Washington Textile Survey and Map Tools'
//   ['textile-resale-economy', 'data-pipeline', 'deduper'] -> 'Washington State Textile Secondary Resale Economy › Data Pipeline'
//   ['bgi-seaport-square'] -> null: a standalone page lives nowhere, so
//   its card keeps its own eyebrow (its type) instead of an empty one
const locationOf = (tree, path) =>
  findTrail(tree, path.slice(0, -1))
    .slice(1)
    .map(({title}) => title)
    .join(' › ') || null;

const ALL = {[VIEW_KEY]: ['all']};
const isEmpty = (query) => Object.keys(query).length === 0;

// section: the heading copy, {eyebrow, title, intro} (content/projects-section.js)
// onChange(query): the next URL query; {} is the Projects view
export const createProjects = (root, {tree, section, facets, onChange}) => {
  // A leaf card's eyebrow says where it lives, since it's shown out of its project
  const withLocation = (item) => ({...item, eyebrow: locationOf(tree, item.path)});
  const leaves = collectLeaves(tree).map(withLocation);
  const total = leaves.length;
  const groups = tree.children.map((node) => ({node, path: [node.id]}));

  const {view} = ui.filterBar;
  const tabs = createViewTabs({
    views: [
      {id: 'projects', label: view.projects, count: groups.length},
      {id: 'all', label: view.all, count: total},
    ],
    onSelect: (id) => onChange(id === 'all' ? ALL : {}),
  });
  // Turning off the last chip (or Clear) stays on the all view
  const bar = createFilterBar({
    tags: tree.tags,
    facets,
    onChange: (query) => onChange(isEmpty(query) ? ALL : query),
  });
  // The whole line is live, so each change is read out as one short phrase
  const status = el('p', {class: 'projects-status', 'aria-live': 'polite'});
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
    tabs.element,
    bar.element,
    status,
    results,
  );

  const show = (rawQuery) => {
    const query = cleanQuery(rawQuery, tree.tags, facets);
    const filtering = !isEmpty(query);
    const current = filtering || rawQuery[VIEW_KEY]?.includes('all') ? 'all' : 'projects';
    tabs.setView(current);
    bar.setSelected(query);

    if (current === 'projects') {
      status.textContent = ui.projects.summary(groups.length, total);
      results.replaceChildren(createCardGrid(groups));
      return;
    }
    if (!filtering) {
      status.textContent = ui.projects.all(total);
      results.replaceChildren(createCardGrid(leaves));
      return;
    }

    const matches = filterLeaves(tree, query).map(withLocation);
    status.textContent = matches.length
      ? ui.projects.count(matches.length, total)
      : ui.projects.none;
    results.replaceChildren(...(matches.length ? [createCardGrid(matches)] : []));
  };

  return {show};
};
