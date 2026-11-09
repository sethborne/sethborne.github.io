// Gallery filter: chip rows above a gallery's grid, built from the terms
// in content/gallery-tags.js and the tags on each image. OR within a row,
// AND across rows, like the home filter bar. It only reports what
// matches (onChange); gallery.js hides the other thumbs and gives the
// lightbox the matching images only.
//
// Fixed rules (decided 2026-11-07, mocked in _mockups/gallery-filter/):
// - Only terms this gallery's images use become chips
// - A row with one term is hidden (it would filter nothing)
// - A chip that would give no results with the current picks is hidden
//   (a picked chip always stays, so it can be turned off); so a click
//   can never empty the grid
// - A row longer than `rowLines` lines folds the rest behind "+N More"
//   ("Less" folds it again); a picked chip past the fold keeps it open
import {el} from '../../js/dom.js';
import ui from '../../content/ui.js';

// ----- Pure helpers -----

// A pick's name on the history entry ('use:park'), so it survives reload
export const pickId = ({facet, id}) => `${facet}:${id}`;

// Tags are gallery-tags.js terms ({facet, id, label}); anything else
// (an undefined from a bad import, a string) warns and is dropped
const cleanImages = (images, facets) => {
  const known = new Set(facets.flatMap(({terms}) => terms));
  return images.map((image) => {
    const tags = image.tags ?? [];
    const good = tags.filter((tag) => known.has(tag));
    if (good.length < tags.length) console.warn(`Gallery filter: image "${image.name}" has tags that aren't gallery-tags.js terms`, tags);
    return good;
  });
};

// Each row's terms that at least one image uses, in file order; rows
// with fewer than two are dropped
const rowsFor = (facets, tagLists) =>
  facets
    .map((facet) => ({...facet, used: facet.terms.filter((term) => tagLists.some((tags) => tags.includes(term)))}))
    .filter(({used}) => used.length > 1);

// picked: {facetId: Set of terms}. `except` skips one row, so a chip's
// count says what you'd get by adding it to its own row (OR)
const matches = (tags, picked, except) =>
  Object.entries(picked).every(([facetId, terms]) => facetId === except || terms.size === 0 || tags.some((tag) => terms.has(tag)));

const countOf = (tagLists, picked, term) =>
  tagLists.filter((tags) => matches(tags, picked, term.facet) && tags.includes(term)).length;

const anyPicked = (picked) => Object.values(picked).some((terms) => terms.size > 0);

// ----- Folding rows -----

// The line a node sits on: rows are flex-wrap, so a new line shows as a
// bigger offsetTop (the row is position: relative). 6px of slack, since
// the label and chips differ in height.
const lineTops = (nodes) =>
  nodes
    .map((node) => node.offsetTop)
    .sort((a, b) => a - b)
    .reduce((tops, top) => (tops.length && top - tops.at(-1) < 6 ? tops : [...tops, top]), []);

const lineOf = (tops, node) => tops.filter((top) => node.offsetTop >= top - 6).length;

// Folds one row to `lines` lines: shows every chip still in play, then
// hides chips from the end until More (and Clear, if it's in this row)
// fit on the last allowed line. Returns false if a picked chip would
// have to hide, so the caller opens the row instead.
const foldRow = ({label, chips, more, tail}, lines) => {
  const inPlay = chips.filter((chip) => !chip.hasAttribute('data-empty'));
  inPlay.forEach((chip) => (chip.hidden = false));
  more.hidden = true;
  if (lineTops([label, ...inPlay]).length <= lines) return true;

  more.hidden = false;
  const ends = tail && !tail.hidden ? [more, tail] : [more];
  const shown = [...inPlay];
  while (shown.length && lineOf(lineTops([label, ...shown, ...ends]), ends.at(-1)) > lines) {
    const chip = shown.pop();
    if (chip.getAttribute('aria-pressed') === 'true') return false;
    chip.hidden = true;
  }
  more.firstChild.textContent = ui.gallery.more(inPlay.length - shown.length);
  return true;
};

// ----- Component -----

// Several filters can share a page, so each gets its own id prefix
let instances = 0;

// images: the gallery's images (each with `tags`); facets: the rows
// (GALLERY_FACETS); counts: 'bar' | 'plain' | 'badge' | 'off'; rowLines:
// lines before More (0 = no fold); start: pickIds picked at load (from
// the history entry); onChange(visible, picks): visible = image indexes
// that match, picks = pickIds. Returns {element, status, startVisible,
// startFiltered}: status is the "Showing 3 of 5 images" line, placed by
// gallery.js beside Columns; startVisible the indexes the start picks let
// through; startFiltered whether any start pick survived. Null (and
// false) when no row has two terms (nothing to filter).
export const createGalleryFilter = ({images, facets, counts, rowLines, start = [], onChange}) => {
  const prefix = `gallery-filter-${++instances}`;
  const tagLists = cleanImages(images, facets);
  const rows = rowsFor(facets, tagLists);
  const startSet = new Set(start);
  const picked = Object.fromEntries(rows.map(({id, used}) => [id, new Set(used.filter((term) => startSet.has(pickId(term))))]));

  const chips = [];
  const folds = [];
  const groups = rows.map((row) => {
    const labelId = `${prefix}-${row.id}`;
    const rowChips = row.used.map((term) => {
      const count = el('span', {class: 'gallery-filter-count'});
      const chip = el('button', {type: 'button', class: 'filter-chip', 'aria-pressed': 'false'}, term.label, counts !== 'off' && count);
      chip.addEventListener('click', () => {
        const terms = picked[row.id];
        terms.has(term) ? terms.delete(term) : terms.add(term);
        update();
      });
      chips.push({chip, count, term});
      return chip;
    });
    const label = el('span', {class: 'filter-label', id: labelId}, row.label);
    const more = el('button', {type: 'button', class: 'filter-chip gallery-filter-more', 'aria-expanded': 'false', hidden: true}, el('span', {}, ''));
    folds.push({label, chips: rowChips, more, open: false});
    return el(
      'div',
      {class: `filter-group gallery-filter-row${row.ownRow ? ' gallery-filter-own-row' : ''}`, role: 'group', 'aria-labelledby': labelId},
      label,
      rowChips,
      more,
    );
  });

  const clear = el('button', {type: 'button', class: 'filter-clear', hidden: true}, el('span', {class: 'filter-clear-x', 'aria-hidden': 'true'}), ui.filterBar.clear);
  clear.addEventListener('click', () => {
    Object.values(picked).forEach((terms) => terms.clear());
    update();
    chips[0]?.chip.focus();
  });
  // Clear sits after the last row's chips, as on the home filter bar
  groups.at(-1)?.append(clear);
  if (folds.length) folds.at(-1).tail = clear;

  // Folding needs layout, so it runs once the filter is on the page and
  // again when its width changes
  const fold = () => {
    for (const row of folds) {
      const open = !rowLines || row.open || !foldRow(row, rowLines);
      if (open) {
        row.chips.forEach((chip) => (chip.hidden = chip.hasAttribute('data-empty')));
        // Offer Less only when the row would fold without it
        row.more.hidden = true;
        const visible = row.chips.filter((chip) => !chip.hidden);
        row.more.hidden = !rowLines || !row.open || lineTops([row.label, ...visible]).length <= rowLines;
        row.more.firstChild.textContent = ui.gallery.less;
      }
      row.more.setAttribute('aria-expanded', String(open));
    }
  };

  for (const row of folds) {
    row.more.addEventListener('click', () => {
      row.open = !row.open;
      fold();
      row.more.focus();
    });
  }

  const status = el('p', {class: 'projects-status gallery-filter-status', 'aria-live': 'polite'});

  const update = (report = true) => {
    for (const {chip, count, term} of chips) {
      const on = picked[term.facet].has(term);
      const n = countOf(tagLists, picked, term);
      chip.setAttribute('aria-pressed', String(on));
      // data-empty marks a chip with no results; fold() does the hiding
      chip.toggleAttribute('data-empty', n === 0 && !on);
      count.textContent = n;
    }
    fold();
    const visible = tagLists.flatMap((tags, i) => (matches(tags, picked) ? [i] : []));
    clear.hidden = !anyPicked(picked);
    status.textContent = ui.gallery.filterStatus(visible.length, images.length, anyPicked(picked));
    if (report) {
      const picks = Object.values(picked).flatMap((terms) => [...terms].map(pickId));
      onChange(visible, picks);
    }
  };

  if (!groups.length) return {element: null, status: null, startVisible: null, startFiltered: false};

  const element = el('div', {class: `gallery-filter gallery-filter--counts-${counts}`}, groups);
  // The first pass only sets the chips; gallery.js applies the start picks itself
  update(false);

  // Width only: folding changes the height, which would loop
  let width = 0;
  new ResizeObserver(([entry]) => {
    const now = Math.round(entry.contentRect.width);
    if (now === width) return;
    width = now;
    fold();
  }).observe(element);

  // The visible indexes for the start picks, so the grid can match them
  // before it's first shown
  const startVisible = tagLists.flatMap((tags, i) => (matches(tags, picked) ? [i] : []));
  return {element, status, startVisible, startFiltered: anyPicked(picked)};
};
