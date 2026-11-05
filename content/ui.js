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
  card: {
    groupEyebrow: (count, isProject) => {
      const holds = `${count} ${count === 1 ? 'App or Tool' : 'Apps and Tools'}`;
      return isProject ? `Project · ${holds}` : holds;
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
};
