// Default card art: what a card shows when its page has no image of its
// own (no thumb, no preview screenshot). Keyed by type tag id (a detail
// page's first type, the one its eyebrow shows), plus 'project' for
// group cards. Table also in ARCHITECTURE.md → Images → Card images.
//
// Adding a type in tags.js: draw img/cards/card_<type id with
// underscores>.svg (copy one of these for the size and style) and add a
// line here. Without one, the card shows the plain map grid.

export default {
  'project': 'img/cards/card_project.svg', // stacked map layers
  'web-app': 'img/cards/card_web_app.svg', // browser window with a map
  'form': 'img/cards/card_form.svg', // clipboard with a map pin
  'data-pipeline': 'img/cards/card_data_pipeline.svg', // records into a funnel, out to a table
  'review-tool': 'img/cards/card_review_tool.svg', // two records side by side, a check
};
