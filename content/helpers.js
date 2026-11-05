// Helpers for building the content tree. Every page's index.js in
// content/projects/ imports these.
//
// A page is a folder: content/projects/<field>/<project id>/<child id>/...
// Each holds index.js (structure: id, tags, embed, layout), <id>.docx
// (copy, edited in Word, gitignored) and copy.js (generated from the doc
// by tools/copy_sync.py). A group's index.js imports its children's
// index.js files; the order of that list is the card order.
//
// Build nodes with two helpers. Pick by asking "will this have
// children?"
//
//   groupPage(id, title, children, more?)
//     A node that contains other nodes: a project, or a part of one
//     (e.g. textile-resale-economy, data-pipeline). Renders as a page of
//     child cards, plus its own writeup if it has one. Never tagged
//     directly; its tags are computed from the detail pages under it.
//
//   detailPage(id, title, tags, more?)
//     An end node: one app, tool or deliverable (e.g. public-map).
//     Renders as a detail page. The only kind of node that gets tags.
//
// Pages on the copy pipeline call them through fromCopy(copy) (below),
// which fills the title and copy fields from copy.js:
//
//   export default fromCopy(copy).detailPage('public-map', [...EB_APP, TYPE_WEB_APP], {
//     content: {embed: pendingEmbed('public-map')},
//   });
//
// produces this plain object (copy fields from copy.js):
//
//   {
//     id: 'public-map',
//     title: 'Experience Builder: Public App',
//     tags: [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE, TYPE_WEB_APP],
//     summary: 'Public map with a pin for each survey submission...',
//     content: {tryThis: '...', embed: {placeholder: 'public-map'}},
//   }
//
// Rules:
// - id: lowercase kebab-case, the same as the page's folder name. It
//   appears in URLs (#/textile-contacts/public-map) and image paths, must
//   be unique among its siblings, and can't be a home section name
//   (SECTIONS in js/router.js: projects, about). Name the subject or role
//   (review-app), not the kind of thing: that's what tags are for.
// - tags: TOOL_ / TYPE_ constants imported from tags.js, in any order.
//   A card's eyebrow is the detail page's first type, so list the main
//   type first.
//
// Names are site words (what page you get); the engine in js/content.js
// uses tree words for the same things: groupPage = group, detailPage =
// leaf.
// - The tree must be plain data (no functions inside it), so
//   JSON.stringify can turn it into JSON if a tool ever needs that.
// - Copy is a draft: comments marked [?] are facts still to confirm.

import {TOOL_ARCGIS_ONLINE, TOOL_EXPERIENCE_BUILDER} from './tags.js';

export const groupPage = (id, title, children, more = {}) => ({
  id,
  title,
  ...more,
  children,
});

export const detailPage = (id, title, tags, more = {}) => ({
  id,
  title,
  tags,
  ...more,
});

// For a page folder whose copy comes from its Word doc (<id>.docx ->
// copy.js, via tools/copy_sync.py). Returns groupPage and detailPage
// without the title argument: the title and the other copy fields
// (summary, links, writeup, content.tryThis...) come from `copy`. Fields
// in `more` win, and `content` merges one level deep, so copy's tryThis
// sits beside index.js's embed.
//   export default fromCopy(copy).detailPage('deduper', [TOOL_NODE_JS, TYPE_DATA_PIPELINE]);
export const fromCopy = (copy) => {
  // [title, more with the copy fields under it]
  const fill = (id, more = {}) => {
    const {title = id, content: copyContent, ...fields} = copy;
    if (!copy.title) console.warn(`No title for page "${id}" in its copy.js`);
    const content = (copyContent || more.content) && {...copyContent, ...more.content};
    return [title, {...fields, ...more, ...(content && {content})}];
  };
  return {
    groupPage: (id, children, more) => {
      const [title, rest] = fill(id, more);
      return groupPage(id, title, children, rest);
    },
    detailPage: (id, tags, more) => {
      const [title, rest] = fill(id, more);
      return detailPage(id, title, tags, rest);
    },
  };
};

// Stand-in for a live app URL that isn't public yet: the page shows
// "Live demo coming soon" instead of a Load button. Swap it for the
// app's share URL (a plain string) once it's shared Everyone.
export const pendingEmbed = (placeholder) => ({placeholder});

// A page's images live in its own folder, in img/ beside index.js, so
// they move and get deleted with the page. Files: img/<name>_<width>.jpg,
// one per width (img/_raw/ holds Photoshop sources, gitignored). Names
// say the image's job on the page:
//   preview   the big image in the page's frame (content.fallback)
//   thumb     the small image on the page's card (thumb)
// `here` is the calling file's import.meta.url (the module's own
// address), so the name resolves next to that file wherever the folder
// is:
//   fallback: pageImage(import.meta.url, 'preview', 'Map of all 2,445 places...')
//   -> {base: '.../public-map/img/preview', widths: [800, 1280, 1600, 2560], alt}
// The result is plain data (strings), like the rest of the tree.
//
// Widths to export, by name. The largest a spot needs is its widest CSS
// size × 2 (2× screens: MacBooks, 4K at 200%):
//   preview  frame is at most 1032px wide -> ~2064 -> 2560
//   thumb    a card is up to ~550px wide (one column just under 600px,
//            two on tablets) -> ~1100 -> 1280
// Other names get every width; pass `widths` to override.
const PAGE_WIDTHS = {
  preview: [800, 1280, 1600, 2560],
  thumb: [800, 1280],
};
const ALL_WIDTHS = [800, 1280, 1600, 2560];
export const pageImage = (here, name, alt, widths = PAGE_WIDTHS[name] ?? ALL_WIDTHS) => ({
  base: new URL(`img/${name}`, here).href,
  widths,
  alt,
});

// Tag sets shared across projects. A set used by one project only
// lives in that project's file.
export const EB_APP = [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE];
