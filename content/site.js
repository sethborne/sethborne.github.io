// Site content tree. Edit this file to add or change projects.
//
// Build the tree with two helpers. Pick by asking "will this have
// children?"
//
//   group(id, title, children, more?)
//     A node that contains other nodes: a project, or a part of one
//     (e.g. capstone, data-pipeline). Renders as a page of child cards,
//     plus its own writeup if `more` has one. Never tagged directly;
//     its tags are computed from the leaves under it.
//
//   leaf(id, title, tags, more?)
//     An end node: one app, tool or deliverable (e.g. eb-external).
//     Renders as a detail page. The only kind of node that gets tags.
//
// `more` is optional and holds any other fields (summary, thumb,
// content, links, related). For example:
//
//   leaf('eb-external', 'Experience Builder: public app', [...EB_APP, TYPE_WEB_APP], {
//     summary: 'Public-facing map of survey results.',
//   })
//
// produces this plain object:
//
//   {
//     id: 'eb-external',
//     title: 'Experience Builder: public app',
//     tags: [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE, TYPE_WEB_APP],
//     summary: 'Public-facing map of survey results.',
//   }
//
// Rules:
// - id: lowercase kebab-case. It appears in URLs (#/survey-map/eb-external)
//   and image paths, must be unique among its siblings, and can't be a
//   home section name (projects, about, experience, contact).
// - tags: TOOL_ / TYPE_ constants imported from tags.js, in any order.
// - The exported tree must be plain data (no functions inside it), so
//   JSON.stringify can turn it into JSON if a tool ever needs that.
//
// Skeleton with placeholder tags until feature/site-content.

import {
  TOOL_ARCGIS_ONLINE,
  TOOL_EXPERIENCE_BUILDER,
  TOOL_NODE_JS,
  TOOL_SURVEY123,
  TYPE_DATA_PIPELINE,
  TYPE_FORM,
  TYPE_REVIEW_TOOL,
  TYPE_WEB_APP,
} from './tags.js';

const group = (id, title, children, more = {}) => ({
  id,
  title,
  ...more,
  children,
});

const leaf = (id, title, tags, more = {}) => ({id, title, tags, ...more});

// Tag sets shared by several leaves
const EB_APP = [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE];

export default group('index', 'Seth Borne', [
  group('capstone', 'WA Textile Reuse', [
    leaf('public-app', 'Public app', [
      TOOL_SURVEY123,
      ...EB_APP,
      TYPE_WEB_APP,
    ]),
    group('data-pipeline', 'Data pipeline', [
      leaf('deduper', 'Deduper', [TOOL_NODE_JS, TYPE_DATA_PIPELINE]),
      leaf('tracker', 'Tracker', [TOOL_NODE_JS, TYPE_REVIEW_TOOL]),
    ]),
  ]),
  group('survey-map', 'Survey Map', [
    leaf('survey123', 'Survey123 form', [
      TOOL_SURVEY123,
      TOOL_ARCGIS_ONLINE,
      TYPE_FORM,
    ]),
    leaf('eb-external', 'Experience Builder: public app', [
      ...EB_APP,
      TYPE_WEB_APP,
    ]),
    leaf('eb-internal', 'Experience Builder: internal app', [
      ...EB_APP,
      TYPE_WEB_APP,
    ]),
  ]),
]);
