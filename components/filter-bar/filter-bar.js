// Filter chips: one toggle button per tag, grouped by facet (Tool, Type),
// and a Clear pill after the last group. Plus createViewTabs (below), the
// View row above them. Both are built once and only update pressed
// states, so focus stays on the button that was clicked. They report
// changes and never navigate: the caller decides what happens.
import {el} from '../../js/dom.js';
import {labelFor} from '../card/card.js';
import ui from '../../content/ui.js';

// The query with one chip flipped. Returns a new object; a facet with
// nothing left is dropped, so turning off the last chip gives {}.
const toggle = (query, facet, id) => {
  const ids = query[facet] ?? [];
  const next = ids.includes(id)
    ? ids.filter((other) => other !== id)
    : [...ids, id];
  const {[facet]: _old, ...rest} = query;
  return next.length ? {...rest, [facet]: next} : rest;
};

// tags: {tool: [...ids], type: [...ids]}, the tags in use (tree.tags)
export const createFilterBar = ({tags, facets, onChange}) => {
  let selected = {};

  const chips = facets.flatMap((facet) =>
    (tags[facet] ?? []).map((id) => ({
      facet,
      id,
      button: el(
        'button',
        {type: 'button', class: 'filter-chip', 'aria-pressed': 'false'},
        labelFor(facet, id),
      ),
    })),
  );
  for (const {facet, id, button} of chips) {
    button.addEventListener('click', () =>
      onChange(toggle(selected, facet, id)),
    );
  }

  // Shown only while a chip is on. The visible word is short; the
  // aria-label starts with it, so voice control ("click Clear") still works
  const clear = el(
    'button',
    {type: 'button', class: 'filter-clear', 'aria-label': 'Clear Filters', hidden: true},
    el('span', {class: 'filter-clear-x', 'aria-hidden': 'true'}),
    ui.filterBar.clear,
  );
  clear.addEventListener('click', () => onChange({}));

  // role="group" + a label: screen readers say "Tool, group" before
  // the chips, so each chip's name can stay short
  const element = el(
    'div',
    {class: 'filter-bar'},
    facets.map((facet, i) =>
      el(
        'div',
        {class: 'filter-group', role: 'group', 'aria-labelledby': `filter-${facet}`},
        el('span', {class: 'filter-label', id: `filter-${facet}`}, ui.filterBar.facets[facet] ?? facet),
        chips.filter((chip) => chip.facet === facet).map(({button}) => button),
        i === facets.length - 1 && clear,
      ),
    ),
  );

  const setSelected = (query) => {
    selected = query;
    for (const {facet, id, button} of chips) {
      const on = query[facet]?.includes(id) ?? false;
      button.setAttribute('aria-pressed', String(on));
    }
    // Clear is about to vanish; don't strand keyboard focus on it
    const filtering = Object.keys(query).length > 0;
    if (!filtering && document.activeElement === clear) chips[0]?.button.focus();
    clear.hidden = !filtering;
  };

  return {element, setSelected};
};

// View row: what the grid lists. Two toggle buttons, each with a count:
//   Projects 2 | Apps and Tools 7
// views: [{id, label, count}]; onSelect(id) on a click. setView(id)
// marks the current one. data-label holds the text at its bold weight,
// so the row doesn't shift when the bolder current tab changes
// (filter-bar.css).
export const createViewTabs = ({views, onSelect}) => {
  const tabs = views.map(({id, label, count}) => {
    const button = el(
      'button',
      {type: 'button', class: 'view-tab', 'aria-pressed': 'false', 'data-label': `${label} ${count}`},
      el('span', {}, label, el('span', {class: 'view-count'}, String(count))),
    );
    button.addEventListener('click', () => onSelect(id));
    return {id, button};
  });

  const element = el(
    'div',
    {class: 'view-tabs', role: 'group', 'aria-labelledby': 'filter-view'},
    el('span', {class: 'filter-label view-label', id: 'filter-view'}, ui.filterBar.view.label),
    // Own box so the gray baseline runs under the tabs, not the label
    el('div', {class: 'view-tab-list'}, tabs.map(({button}) => button)),
  );

  const setView = (current) => {
    for (const {id, button} of tabs) {
      button.setAttribute('aria-pressed', String(id === current));
    }
  };

  return {element, setView};
};
