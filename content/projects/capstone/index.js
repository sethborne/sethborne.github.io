// Capstone: WA textile reuse dataset. The project node and its pages
// (#/capstone/...). How to build nodes: content/helpers.js.

import {EB_APP, groupPage, detailPage} from '../../helpers.js';
import {
  TOOL_JAVASCRIPT,
  TOOL_NODE_JS,
  TOOL_SURVEY123,
  TYPE_DATA_PIPELINE,
  TYPE_REVIEW_TOOL,
  TYPE_WEB_APP,
} from '../../tags.js';

// Deduper, Tracker: front-end tools; Node.js only wrote the JSON cache
const LOCAL_APP = [TOOL_JAVASCRIPT, TOOL_NODE_JS];

export default groupPage(
  'capstone',
  'WA textile reuse dataset',
  [
    detailPage(
      'public-app',
      'Public app',
      [TOOL_SURVEY123, ...EB_APP, TYPE_WEB_APP],
      {
        summary:
          'Public Experience Builder map of the dataset, with a Survey123 ' +
          'form for new sites. Live once DoE approves it.',
      },
    ),
    groupPage(
      'data-pipeline',
      'Data pipeline',
      [
        // [?] Is there also a "keep both" choice? Add it if so.
        detailPage(
          'deduper',
          'Deduper',
          [...LOCAL_APP, TYPE_DATA_PIPELINE],
          {
            summary:
              'Browser tool that shows likely duplicate place records side ' +
              'by side. A reviewer keeps one or removes both, and a small ' +
              'Node.js script saved each decision to a JSON cache.',
          },
        ),
        detailPage(
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
);
