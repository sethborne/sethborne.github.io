// Interface labels: the fixed words components show (buttons, headings,
// status lines), one object per component. Plain data, like profile.js.
// Components import this directly (card.js does the same with tags.js),
// since these labels are needed deep in the tree: the embed inside a
// page inside the app.
//
// Case (CLAUDE.md → Writing rules): Title Case for labels, headings and
// buttons; sentence case for anything written as a sentence.
// Screen-reader-only text (aria-labels, "(opens in a new tab)") stays in
// the components: it describes structure, not copy anyone edits.

export default {
  // Nav text when the capitalized section id isn't enough
  nav: {about: 'About & Contact'},
  // Every breadcrumb starts with these two (the tree root has no page)
  breadcrumb: {home: 'Home', projects: 'Projects'},
  // Eyebrow on a group card, with how many apps and tools it holds:
  // 'Project · 4 Apps and Tools' on home, '3 Apps and Tools' for a group
  // inside a project (Data Pipeline). Leaf cards show their type tag.
  // A standalone project (a top-level page with no child pages) lists its
  // type labels instead: 'Project · Renderings and Interactive Model'
  card: {
    groupEyebrow: (count, isProject) => {
      const holds = `${count} ${count === 1 ? 'App or Tool' : 'Apps and Tools'}`;
      return isProject ? `Project · ${holds}` : holds;
    },
    standaloneEyebrow: (types) => {
      // ['A'] -> 'A'; ['A', 'B'] -> 'A and B'; ['A', 'B', 'C'] -> 'A, B and C'
      const list = types.length > 1 ? `${types.slice(0, -1).join(', ')} and ${types.at(-1)}` : types[0];
      return list ? `Project · ${list}` : 'Project';
    },
  },
  embed: {
    load: 'Load Live Demo',
    // When a page's copy has no Open Label. The ↗ is always added.
    open: 'Open in New Tab',
    comingSoon: 'Live Demo Coming Soon',
    screenshotComing: 'Screenshot Coming',
    // Lead before a page's Try This caption
    tryThis: 'Try This',
  },
  filterBar: {
    facets: {tool: 'Tool', type: 'Type'},
    // View tabs above the chips; each tab also shows its count
    view: {label: 'View', projects: 'Projects', all: 'Apps and Tools'},
    clear: 'Clear',
  },
  // Status line above the cards, one per state
  projects: {
    summary: (projects, total) => `${projects} projects, holding ${total} apps and tools`,
    all: (total) => `All ${total} apps and tools`,
    count: (shown, total) => `Showing ${shown} of ${total} apps and tools`,
    none: 'No projects match these filters.',
  },
  page: {
    // When a page's copy has no Links Title
    linksTitle: 'Links',
    // Between a writeup and the child cards below it
    childrenTitle: 'In This Project',
    // Under the tags of a page with two or more sections: links down to each
    jumpLabel: 'On This Page',
    notFoundTitle: 'Page Not Found',
    notFoundText: (path) => `Nothing lives at #/${path}.`,
    notFoundBack: 'Back to Projects',
  },
  writeup: {
    tldr: 'TL;DR',
    situation: 'Situation',
    task: 'Task',
    action: 'Action',
    result: 'Result',
  },
  about: {photoComing: 'Photo Coming'},
  // Image gallery (components/gallery/): column control, lightbox
  gallery: {
    columns: 'Columns',
    fullSize: 'View Full Size',
    // Compare images: the tag on a thumb, and the two layers' default
    // names (a gallery's compareLabels overrides them)
    compare: 'Compare',
    compareLabels: ['Before', 'After'],
    // Gallery filter (components/gallery/filter.js): a folded row's
    // button, and the status line beside Columns
    more: (n) => `+${n} More`,
    less: 'Less',
    filterStatus: (shown, total, filtered) => (filtered ? `Showing ${shown} of ${total} images` : `All ${total} images`),
    // Read out as the lightbox moves (the bar or dots show it on screen)
    position: (i, count) => `Image ${i} of ${count}`,
  },
  // 3D turntable (components/turntable/): phase buttons, hint, corner badge
  turntable: {
    phases: 'Phase',
    phase: (id) => `Phase ${id.toUpperCase()}`,
    hint: 'Drag to Turn',
    hintTap: 'Drag to Turn · Tap a Building',
    facing: (point) => `Facing ${point}`,
    // While a phase's frames load: screen readers hear `loading` once;
    // the screen shows a random line from `loadingLines`, a new one every
    // couple of seconds, or `loading` with whimsy off. These are the
    // defaults; a turntable can pass its own (turntable() in helpers.js).
    // Sentence case: status messages. CSS adds the …
    loading: 'Loading images',
    loadingLines: [
      'Calibrating pixels',
      'Optimizing bytes',
      'Narfaling the garthunk',
      'Pouring the foundations',
      'Raising the towers',
      'Polishing the curtain walls',
      'Unrolling the sidewalks',
      'Filling the harbor',
      'Leveling the ground plane',
      'Herding 72 frames',
      'Aligning the cameras',
      'Warming up the turntable',
      'Consulting the zoning board',
      'Sharpening the edges',
    ],
  },
};
