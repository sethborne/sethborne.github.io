// Helpers for building the content tree. Every project file in
// content/projects/ imports these.
//
// Build nodes with two helpers. Pick by asking "will this have
// children?"
//
//   groupPage(id, title, children, more?)
//     A node that contains other nodes: a project, or a part of one
//     (e.g. capstone, data-pipeline). Renders as a page of child cards,
//     plus its own writeup if `more` has one. Never tagged directly;
//     its tags are computed from the detail pages under it.
//
//   detailPage(id, title, tags, more?)
//     An end node: one app, tool or deliverable (e.g. eb-external).
//     Renders as a detail page. The only kind of node that gets tags.
//
// `more` is optional and holds any other fields (summary, thumb,
// content, writeup, layout, aside, links). For example:
//
//   detailPage('eb-external', 'Experience Builder: public app', [...EB_APP, TYPE_WEB_APP], {
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
//   home section name (SECTIONS in js/router.js: projects, about).
//   A project's folder in content/projects/ is named after its id.
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

// Stand-in for a live app URL that isn't public yet: the page shows
// "Live demo coming soon" instead of a Load button. Swap it for the
// app's share URL (a plain string) once it's shared Everyone.
export const pendingEmbed = (placeholder) => ({placeholder});

// Tag sets shared across projects. A set used by one project only
// lives in that project's file.
export const EB_APP = [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE];
