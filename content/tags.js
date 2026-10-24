// Every tag a leaf in site.js may use. Each tag knows its own facet and
// display label, so site.js lists tags flat: [TOOL_SURVEY123, TYPE_FORM].
// Import them by name; a misspelled name fails loudly at load time.
// Placeholder set until feature/site-content settles the real tags.
//
// Adding a tag: one export line here, then import it where it's used.
// - Name: facet prefix (TOOL_ / TYPE_) + UPPER_SNAKE, so autocomplete
//   groups them and a tool and type can share a natural name.
// - id: goes into URLs (?tool=node-js), so keep it lowercase kebab-case.

const tool = (id, label) => ({facet: 'tool', id, label});
const type = (id, label) => ({facet: 'type', id, label});

// tool
export const TOOL_ARCGIS_ONLINE = tool('arcgis-online', 'ArcGIS Online');
export const TOOL_EXPERIENCE_BUILDER = tool(
  'experience-builder',
  'Experience Builder',
);
export const TOOL_NODE_JS = tool('node-js', 'Node.js');
export const TOOL_SURVEY123 = tool('survey123', 'Survey123');

// type
export const TYPE_DATA_PIPELINE = type('data-pipeline', 'Data pipeline');
export const TYPE_FORM = type('form', 'Form');
export const TYPE_REVIEW_TOOL = type('review-tool', 'Review tool');
export const TYPE_WEB_APP = type('web-app', 'Web app');
