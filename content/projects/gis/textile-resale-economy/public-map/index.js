// Public map: RMDC's live Experience Builder app of the dataset.
// #/textile-resale-economy/public-map. Copy: public-map.docx -> copy.js.

import {fromCopy, pageImage} from '../../../../helpers.js';
import {TOOL_ARCGIS_ENTERPRISE, TOOL_EXPERIENCE_BUILDER, TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

// The live app on Ecology's portal. Shown as a screenshot that opens it
// in a new tab (`link`), not an inline embed: in a frame the app picked a
// cramped, map-only layout and opened its own tabs anyway.
const APP_URL = 'https://gis.ecology.wa.gov/portal/apps/experiencebuilder/experience/?id=02269b68b2ba43618e1583aba7d3ca1e';

// Built in Ecology's Enterprise portal, not ArcGIS Online.
// Full layout: the TL;DR above the story, so the app gets the page width.
export default fromCopy(copy).detailPage('public-map', [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ENTERPRISE, TYPE_WEB_APP], {
  layout: 'full',
  content: {
    link: APP_URL,
    // img/preview_<width>.jpg in this folder
    fallback: pageImage(import.meta.url, 'preview', 'Screenshot of the Washington State Textile Secondary Resale Economy map on Ecology’s portal'),
  },
});
