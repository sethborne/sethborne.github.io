// Public map: RMDC's live Experience Builder app of the dataset.
// #/textile-resale-economy/public-map. Copy: public-map.docx -> copy.js.

import {fromCopy} from '../../../../helpers.js';
import {TOOL_ARCGIS_ENTERPRISE, TOOL_EXPERIENCE_BUILDER, TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

// Built in Ecology's Enterprise portal, not ArcGIS Online
export default fromCopy(copy).detailPage('public-map', [TOOL_EXPERIENCE_BUILDER, TOOL_ARCGIS_ENTERPRISE, TYPE_WEB_APP]);
