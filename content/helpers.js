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
import ui from './ui.js';

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
    const {title = id, content: copyContent, sections: copySections = [], gallery: copyGallery = [], ...fields} = copy;
    if (!copy.title) console.warn(`No title for page "${id}" in its copy.js`);
    // A gallery's titles and captions pair up with its images by
    // position. `where` names it in the warning.
    const withCaptions = (piece, captions, where) => {
      if (!piece?.gallery) return piece;
      const {images} = piece.gallery;
      if (images.length !== captions.length) {
        console.warn(`Page "${id}"${where}: ${images.length} gallery images in index.js, ${captions.length} in its doc`);
      }
      // "| Before | After" on a doc line only means something for a pair
      captions.forEach((caption, i) => {
        if (caption.labels && !images[i]?.compare) {
          console.warn(`Page "${id}"${where}: doc line ${i + 1} has labels, but image ${i + 1} has no compare`);
        }
      });
      return {...piece, gallery: {...piece.gallery, images: images.map((image, i) => ({...captions[i], ...image}))}};
    };
    // The page's own gallery: the doc's top-level Gallery field
    const content = (copyContent || more.content) && withCaptions({...copyContent, ...more.content}, copyGallery, '');
    // Sections pair up by position: the doc's first section (Heading 3)
    // goes with index.js's first section, and so on. Each carries its own
    // gallery captions, taken out first so index.js's gallery isn't replaced.
    if (more.sections && more.sections.length !== copySections.length) {
      console.warn(`Page "${id}": ${more.sections.length} sections in index.js, ${copySections.length} in its doc`);
    }
    const sections = more.sections?.map((section, i) => {
      const {gallery: captions = [], ...copyFields} = copySections[i] ?? {};
      const merged = {...copyFields, ...section};
      return withCaptions(merged, captions, `, section "${merged.title ?? section.id}"`);
    });
    return [title, {...fields, ...more, ...(content && {content}), ...(sections && {sections})}];
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

// Sections: a page with several pieces (a gallery, a turntable, a demo)
// lists them in `sections`, each rendered as a heading, an optional
// intro line, and its piece. A section takes the same fields as
// `content` (turntable, embed, link, fallback, tryThis...); its heading
// and intro come from the doc's Sections field (a Heading 3 per section),
// matched by position:
//   sections: [
//     {id: 'phasing-model', turntable: turntable(import.meta.url, {...})},
//   ]
// `id` names the section in the code only (it isn't shown).

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

// A turntable: a 3D model you drag to turn, from rendered frames (one
// image per 5° step), optionally in phases (build-out over time). The
// frames live in img/turntable/ beside the page's index.js, written by
// tools/turntable_frames.mjs from the raw renders in img/_raw/turntable/:
//   img/turntable/phase_a/base_00_640.jpg   the render, one file per size
//   img/turntable/phase_a/base_00_1024.jpg
//   img/turntable/phase_a/color_00.png      ID pass: one flat color per building
// Pass what's particular to this model; TURNTABLE_DEFAULTS fills the rest:
//   content: {
//     turntable: turntable(import.meta.url, {
//       phases: ['a', 'b', 'c'],   // folder ids, in order (A, B, C on the buttons)
//       heading: 'NE',             // which way the camera faces in frame 0
//       alt: 'Massing model of ...',
//     }),
//   }
// Settings (any of them can be passed to override the default):
//   frames     frames per full turn
//   aspect     the frame's shape, a CSS aspect-ratio
//   sizes      render widths on disk; each screen loads one, the smallest
//              that covers the frame's width × pixel ratio (capped at 1.5)
//   clockwise  the frame numbers turn the camera clockwise (seen from above)
//   controls   phase buttons: 'pills' (filter chips), 'tabs' (View tabs), 'timeline'
//   drag       'follow': the model moves with the finger; 'reverse'
//   angle      corner badge: 'compass' ('Facing NE' + needle), 'degrees', 'off'
//   highlight  tap a building to highlight it (needs the color pass)
//   popups     tap a building for its pop-up, from `buildings`:
//              {'#00ff00': {title: 'Tower A', text: '...'}}, keyed by its
//              color in the ID pass. No entry, no pop-up.
//   whimsy     while frames load: true rotates `loadingLines` (random, a
//              new one every couple of seconds); false, or an empty list,
//              shows `loadingText`. Screen readers always hear loadingText.
//   loadingText   plain loading message (default: ui.turntable.loading)
//   loadingLines  whimsical lines (default: ui.turntable.loadingLines),
//              e.g. loadingLines: ['Pouring the foundations', 'Raising the towers']
const TURNTABLE_DEFAULTS = {
  frames: 72,
  aspect: '4 / 3',
  sizes: [640, 1024],
  clockwise: true,
  controls: 'timeline',
  drag: 'follow',
  angle: 'compass',
  highlight: true,
  popups: false,
  buildings: {},
  whimsy: true,
  loadingText: ui.turntable.loading,
  loadingLines: ui.turntable.loadingLines,
};
export const turntable = (here, {phases, heading, alt, ...more}) => ({
  ...TURNTABLE_DEFAULTS,
  base: new URL('img/turntable/', here).href,
  phases,
  heading,
  alt,
  ...more,
});

// A gallery: a grid of still images (renderings, photosims) that open
// in a lightbox. The files live in img/gallery/ beside the page's
// index.js, written by tools/gallery_images.mjs from one full-size
// export each in img/_raw/gallery/:
//   img/gallery/aerial_look_sw_800.jpg ... _2560.jpg   grid + lightbox
//   img/gallery/aerial_look_sw_full.jpg                native size ("View Full Size")
// List the images by name, in order (grid, lightbox and the doc's
// Gallery lines all follow it). A name alone, or {name, focus} to frame
// a crop in the grid (CSS object-position, e.g. 'center 30%'; the
// lightbox always shows the whole image):
//   gallery: gallery(import.meta.url, {
//     images: ['aerial_look_sw', {name: 'plaza_square', focus: 'center 70%'}],
//   })
// Titles and captions come from the doc ("Title" or "Title: caption",
// one line per image): under the section's Heading 4 Gallery, or the
// top-level Gallery field for content.gallery; through fromCopy().
// Settings (any of them can be passed to override the default):
//   columns        grid columns on tablets and up, to start with
//   columnChoices  the column control's buttons (600px and up)
//   phoneColumns   grid columns on phones, to start with
//   phoneColumnChoices  the control's buttons on phones ([] for none)
//   aspect         the thumbs' shape, a CSS aspect-ratio (crops with cover)
//   columnControl  'icons' (little grid drawings) or 'tabs' (View tab look)
//   thumbHover     'lift' (like cards: lift, orange glow, orange name) or
//                  'zoom' (orange ring, image zooms in)
//   position       lightbox: 'bar' (a track you can drag along) or 'dots'
//   barFill        bar: orange from the start up to the current image
//   ticks          bar: a mark for each image
//   tickShape      'diamond' or 'dot'
//   tickSize       tick size in px
//   widths         export widths on disk (the _full file is extra)
//   compareThumb   a compare image's thumb: 'badge' (Compare tag) or
//                  'split' (both images, cut at a line)
//   compareSplit   'x' (upright line, drag left/right) or 'y' (line
//                  across, drag up/down); an image's `split` overrides it
//   compareBadge   the compare thumb tag: 'text', 'icon' or 'both'
//   compareHandle  the knob on the line: 'circle', 'solid', 'pill' or 'arrows'
//   compareLine    the line's color: 'white' or 'accent'
//   compareHint    the line slides once when a compare image opens
//   compareLabels  [before, after]; null = ui.gallery.compareLabels; one
//                  pair's doc line can override it ("Title | After | Changes")
//   filter         chip rows above the grid, from each image's `tags`
//                  (content/gallery-tags.js terms); off unless set true
//   counts         filter chips' counts: 'bar' (a thin rule, then the
//                  number), 'plain', 'badge' or 'off'
//   rowLines       a chip row folds after this many lines ("+N More");
//                  0 never folds
//   filteredMark   while any chip is picked: 'line' (the line under each
//                  thumb's image turns orange) or 'off'
//   videoGrid      video items in the grid: 'poster' (poster + badge, plays
//                  in the lightbox), 'hover' (a loop plays while the mouse
//                  is over its card) or 'always' (loops play, muted, while
//                  on screen); never under reduced motion
//   videoBadge     on a video thumb: 'circle' (a play button in the
//                  middle), 'pill' ("Loop" / "Video" in the corner) or 'both'
//   videoWidth     the MP4s' width on disk (tools/video.mjs)
//   posterWidths   the posters' widths on disk
// Video item: {name, video: 'loop'} (a living rendering: muted, looping,
// with a Pause button) or {name, video: 'movie'} (sound and the browser's
// controls). Files in img/video/, from npm run video:
//   img/video/<name>_1280.mp4, <name>_poster_800.jpg, <name>_poster_1280.jpg
// Compare image (before/after slider): {name, compare: '<bottom image>'}.
//   `name` is the top image (after), `compare` the bottom one (before;
//   left of the line for x, below it for y);
//   both need the same size and framing.
const GALLERY_DEFAULTS = {
  columns: 4,
  columnChoices: [2, 3, 4],
  phoneColumns: 2,
  phoneColumnChoices: [1, 2],
  aspect: '4 / 3',
  columnControl: 'icons',
  thumbHover: 'lift',
  position: 'bar',
  barFill: true,
  ticks: true,
  tickShape: 'diamond',
  tickSize: 6,
  widths: [800, 1280, 1600, 2560],
  compareThumb: 'badge',
  compareSplit: 'x',
  compareBadge: 'icon',
  compareHandle: 'arrows',
  compareLine: 'accent',
  compareHint: true,
  compareLabels: null,
  filter: false,
  counts: 'bar',
  rowLines: 2,
  filteredMark: 'line',
  videoGrid: 'poster',
  videoBadge: 'circle',
  videoWidth: 1280,
  posterWidths: [800, 1280],
};
export const gallery = (here, {images, ...more}) => ({
  ...GALLERY_DEFAULTS,
  base: new URL('img/gallery/', here).href,
  videoBase: new URL('img/video/', here).href,
  images: images.map((image) => (typeof image === 'string' ? {name: image} : image)),
  ...more,
});

// A video on the page itself (a section's or content's `video`): the
// poster with a play button; a click swaps in the video, playing with
// sound and the browser's controls. For a movie that stands alone (an
// animation); short loops go in a gallery as video items instead.
// Files in img/video/ from npm run video (see gallery's video items):
//   video: video(import.meta.url, {name: 'westbrook_animation'})
// Settings: aspect (the frame's shape, a CSS aspect-ratio), width (the
// MP4's width on disk), posterWidths.
const VIDEO_DEFAULTS = {
  aspect: '16 / 9',
  width: 1280,
  posterWidths: [800, 1280],
};
export const video = (here, {name, ...more}) => ({
  ...VIDEO_DEFAULTS,
  base: new URL('img/video/', here).href,
  name,
  ...more,
});

// Page settings, for every page. A page can override one in its own
// index.js (`backUp: 'text'` beside its sections); page.js reads the
// page's value first, then this.
//   backUp   the Back to Top button at the right end of each section
//            heading (pages with "On This Page" links): 'chevron' (the
//            chevron alone), 'text' ("Top" + the chevron) or 'square'
//            (the chevron in an outlined square)
export const PAGE_DEFAULTS = {
  backUp: 'chevron',
};

// Tag sets shared across projects. A set used by one project only
// lives in that project's file.
export const EB_APP = [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE];
