// Capstone: Washington State Textile Secondary Resale Economy. The project
// node and its pages (#/capstone/...). How to build nodes: content/helpers.js.

import {groupPage, detailPage} from '../../helpers.js';
import {
  TOOL_ARCGIS_ENTERPRISE,
  TOOL_EXPERIENCE_BUILDER,
  TOOL_JAVASCRIPT,
  TOOL_NODE_JS,
  TYPE_DATA_PIPELINE,
  TYPE_REVIEW_TOOL,
  TYPE_WEB_APP,
} from '../../tags.js';
// The project story (STAR), shown on #/capstone
import writeup from './writeup.js';

// Deduper, Final Review, Tracker: front-end tools; Node.js wrote the JSON caches
const LOCAL_APP = [TOOL_JAVASCRIPT, TOOL_NODE_JS];

// RMDC's live app on the Ecology portal (Chelsea's build, my data)
const LIVE_APP = {
  label: 'Washington State Textile Secondary Resale Economy Map',
  href: 'https://gis.ecology.wa.gov/portal/apps/experiencebuilder/experience/?id=02269b68b2ba43618e1583aba7d3ca1e',
};

export default groupPage(
  'capstone',
  'Washington State Textile Secondary Resale Economy',
  [
    detailPage(
      'public-app',
      'Public app',
      // Built in Ecology's Enterprise portal, not ArcGIS Online
      [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ENTERPRISE, TYPE_WEB_APP],
      {
        summary: "Public Experience Builder map of all 2,445 places, live on Ecology's portal. Built and styled by my teammate Chelsea on view layers I published from the pipeline.",
        linksTitle: 'Live on the Ecology Portal',
        links: [LIVE_APP],
      },
    ),
    groupPage(
      'data-pipeline',
      'Data pipeline',
      [
        detailPage(
          'deduper',
          'Deduper',
          [...LOCAL_APP, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE],
          {
            summary: 'Browser tool that shows likely duplicate place records side by side. A reviewer keeps one, keeps both or removes both, and a small Node.js script saves each decision to a JSON cache that later runs reapply.',
          },
        ),
        detailPage(
          'final-review',
          'Final Review',
          [...LOCAL_APP, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE],
          {
            summary: "Browser tool for checking every record against Google Maps and saving it as Keep or Remove. An optional scraper fetches each place's current status, so closed places and poor matches come up first.",
          },
        ),
        detailPage(
          'tracker',
          'Query Edit Tracker',
          [...LOCAL_APP, TYPE_DATA_PIPELINE],
          {
            summary: 'Log of every manual include and exclude edit to the pipeline queries, with record counts from each run (raw, candidates, cache removals, final output) charted over time.',
          },
        ),
      ],
      {
        summary: 'The steps between raw place records and the published dataset, with three browser tools for the parts that need a person.',
      },
    ),
  ],
  {
    summary: "A statewide dataset of 2,445 places in Washington's secondary textile resale economy, for the Recycling Market Development Center. A Node.js and Python pipeline conforms five sources, removes duplicates through human review and publishes to ArcGIS for an Experience Builder app. 3rd place, WAGISA Dick Thomas Award.",
    writeup,
    linksTitle: 'Live on the Ecology Portal',
    links: [LIVE_APP],
  },
);
