// Filter chips: one toggle button per tag, grouped by facet (Tool, Type).
// Built once; setSelected() only updates pressed states, so focus stays
// on the chip that was clicked. It reports changes and never navigates:
// onChange gets the next query and the caller decides what happens.
import {el} from '../../js/dom.js';
import {labelFor} from '../card/card.js';

const FACET_LABELS = {tool: 'Tool', type: 'Type'};

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

  // role="group" + a label: screen readers say "Tool, group" before
  // the chips, so each chip's name can stay short
  const element = el(
    'div',
    {class: 'filter-bar'},
    facets.map((facet) =>
      el(
        'div',
        {class: 'filter-group', role: 'group', 'aria-labelledby': `filter-${facet}`},
        el('span', {class: 'filter-label', id: `filter-${facet}`}, FACET_LABELS[facet] ?? facet),
        chips.filter((chip) => chip.facet === facet).map(({button}) => button),
      ),
    ),
  );

  const setSelected = (query) => {
    selected = query;
    for (const {facet, id, button} of chips) {
      const on = query[facet]?.includes(id) ?? false;
      button.setAttribute('aria-pressed', String(on));
    }
  };

  // For moving focus somewhere sensible, e.g. after Clear disappears
  const focusFirst = () => chips[0]?.button.focus();

  return {element, setSelected, focusFirst};
};
