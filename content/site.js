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
// - Copy is a draft: comments marked [?] are facts still to confirm.

import {
  TOOL_ARCGIS_ONLINE,
  TOOL_EXPERIENCE_BUILDER,
  TOOL_JAVASCRIPT,
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

// Stand-in for a live app URL that isn't public yet: the page shows
// "Live demo coming soon" instead of a Load button. Swap it for the
// app's share URL (a plain string) once it's shared Everyone.
const pending = (placeholder) => ({placeholder});

// Tag sets shared by several leaves
const EB_APP = [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ONLINE];
// Deduper, Tracker: front-end tools; Node.js only wrote the JSON cache
const LOCAL_APP = [TOOL_JAVASCRIPT, TOOL_NODE_JS];

// A card's eyebrow is the leaf's first type, so list the main type first.

export default group('index', 'Seth Borne', [
  group(
    'capstone',
    'WA textile reuse dataset',
    [
      leaf('public-app', 'Public app', [TOOL_SURVEY123, ...EB_APP, TYPE_WEB_APP], {
        summary:
          'Public Experience Builder map of the dataset, with a Survey123 ' +
          'form for new sites. Live once DoE approves it.',
      }),
      group(
        'data-pipeline',
        'Data pipeline',
        [
          // [?] Is there also a "keep both" choice? Add it if so.
          leaf('deduper', 'Deduper', [...LOCAL_APP, TYPE_DATA_PIPELINE], {
            summary:
              'Browser tool that shows likely duplicate place records side ' +
              'by side. A reviewer keeps one or removes both, and a small ' +
              'Node.js script saved each decision to a JSON cache.',
          }),
          leaf(
            'tracker',
            'Tracker',
            [...LOCAL_APP, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE],
            {
              summary:
                'Browser tool for reviewing records one by one and ' +
                "tracking each one's QA status before publishing. A small " +
                'Node.js script saved progress to a JSON cache.',
            },
          ),
        ],
        {
          summary:
            'The steps between raw place records and the published ' +
            'dataset, with two browser tools for the parts that need a person.',
        },
      ),
    ],
    {
      summary:
        'A spatial dataset of textile reuse and recycling sites for the ' +
        'Washington Department of Ecology. A data pipeline ingests place ' +
        'records from several sources, removes duplicates and routes them ' +
        'through human review, then publishes them with Survey123 and ' +
        'Experience Builder. 3rd place, WAGISA Data Tells All.',
    },
  ),
  group(
    'survey-map',
    'Survey Map',
    [
      leaf('survey123', 'Survey123 form', [TOOL_SURVEY123, TOOL_ARCGIS_ONLINE, TYPE_FORM], {
        summary:
          'The form behind both apps. Entries publish automatically, as ' +
          "the client asked, and a built-in 'pending approval' status " +
          'supports a review-first workflow instead.',
        content: {
          embed: pending('survey123'),
          tryThis: 'Fill in the form with made-up details and submit it.',
        },
      }),
      leaf('eb-external', 'Experience Builder: public app', [...EB_APP, TYPE_WEB_APP], {
        summary:
          'Public map with a pin for each survey submission, updated as ' +
          'new entries arrive. Click a pin to see the details from that ' +
          'submission.',
        content: {
          embed: pending('eb-external'),
          tryThis:
            'Submit a test entry in the Survey123 form, then find your ' +
            'pin here.',
        },
      }),
      leaf(
        'eb-internal',
        'Experience Builder: internal app',
        [...EB_APP, TYPE_WEB_APP, TYPE_REVIEW_TOOL],
        {
          summary:
            'Staff app for revising and managing entries shown on the ' +
            'public map. Since entries publish automatically, corrections ' +
            'happen here after they go live.',
          content: {
            embed: pending('eb-internal'),
            tryThis:
              'Open an entry, change a field and save it. The public map ' +
              'shows the edit.',
          },
        },
      ),
    ],
    {
      summary:
        'A Survey123 form collecting contact details from people in the ' +
        'secondary textile resale economy, focused on Washington State. ' +
        'It feeds two Experience Builder apps: a public map of ' +
        'submissions and a staff app for managing them. Demo mockups of ' +
        'production work for the Washington Department of Ecology.',
    },
  ),
]);
