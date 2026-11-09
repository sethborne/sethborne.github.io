// Gallery filter terms: the chips a gallery's filter can show. Works
// like content/tags.js: one named export per term, imported by name on
// each image (tags: [MEDIA_RENDERING, VIEW_AERIAL, USE_PARK]), so a
// misspelled name fails at load.
//
// A gallery only shows the terms its images use, so a long list here
// never means a long row on the page.
//
// - Add a term: one export line under its row. Chips show in the order
//   of these lines.
//   - Name: row prefix (MEDIA_ / VIEW_ / USE_) + UPPER_SNAKE
//   - id: lowercase kebab-case, unique within its row
// - Add a row: one `facet(...)` line, then its terms below it. Rows show
//   in the order of these lines. `{ownRow: true}` gives a row a full
//   line on desktop; the others share one.
//
// The Type row's names start with MEDIA_, since content/tags.js already
// has TYPE_ names, and a page's index.js may import both files.

export const GALLERY_FACETS = [];

// Registers a row and returns a maker for its terms; each term is added
// to its row as it's made, so the list above fills in file order
const facet = (id, label, more = {}) => {
  const row = {id, label, terms: [], ...more};
  GALLERY_FACETS.push(row);
  return (termId, termLabel) => {
    const term = {facet: id, id: termId, label: termLabel};
    row.terms.push(term);
    return term;
  };
};

// Type
const media = facet('media', 'Type');
export const MEDIA_RENDERING = media('rendering', 'Rendering');
export const MEDIA_PHOTOSIM = media('photosim', 'Photosim');
export const MEDIA_LIVING_RENDERING = media('living-rendering', 'Living Rendering');
export const MEDIA_ANIMATION = media('animation', 'Animation');

// View
const view = facet('view', 'View');
export const VIEW_AERIAL = view('aerial', 'Aerial');
export const VIEW_EXTERIOR = view('exterior', 'Exterior');
export const VIEW_INTERIOR = view('interior', 'Interior');

// Use
const use = facet('use', 'Use', {ownRow: true});
export const USE_BUSINESS = use('business', 'Business');
export const USE_RESIDENTIAL = use('residential', 'Residential');
export const USE_RETAIL = use('retail', 'Retail');
export const USE_MIXED_USE = use('mixed-use', 'Mixed Use');
export const USE_CIVIC = use('civic', 'Civic');
export const USE_PARK = use('park', 'Park');
export const USE_WATERFRONT = use('waterfront', 'Waterfront');
