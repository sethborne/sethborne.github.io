// Capstone: Washington State Textile Secondary Resale Economy. The project
// node and its pages (#/capstone/...). How to build nodes: content/helpers.js.
//
// Structure only (ids, tags, layout). All copy (titles, summaries, links,
// the writeup) comes from copy.docx through the generated copy.js:
//   python tools/copy_sync.py capstone --check / --write

import {withCopy} from '../../helpers.js';
import {
  TOOL_ARCGIS_ENTERPRISE,
  TOOL_EXPERIENCE_BUILDER,
  TOOL_JAVASCRIPT,
  TOOL_NODE_JS,
  TYPE_DATA_PIPELINE,
  TYPE_REVIEW_TOOL,
  TYPE_WEB_APP,
} from '../../tags.js';
import copy from './copy.js';

const {groupPage, detailPage} = withCopy(copy);

// Deduper, Final Review, Tracker: front-end tools; Node.js wrote the JSON caches
const LOCAL_APP = [TOOL_JAVASCRIPT, TOOL_NODE_JS];

export default groupPage('capstone', [
  // Built in Ecology's Enterprise portal, not ArcGIS Online
  detailPage('public-app', [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ENTERPRISE, TYPE_WEB_APP]),
  groupPage('data-pipeline', [
    detailPage('deduper', [...LOCAL_APP, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE]),
    detailPage('final-review', [...LOCAL_APP, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE]),
    detailPage('tracker', [...LOCAL_APP, TYPE_DATA_PIPELINE]),
  ]),
]);
