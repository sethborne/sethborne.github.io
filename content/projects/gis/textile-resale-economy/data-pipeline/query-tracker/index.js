// Query Edit Tracker: log of manual edits to the pipeline queries.
// #/textile-resale-economy/data-pipeline/query-tracker. Copy: query-tracker.docx.

import {fromCopy} from '../../../../../helpers.js';
import {TOOL_JAVASCRIPT, TOOL_NODE_JS, TYPE_DATA_PIPELINE} from '../../../../../tags.js';
import copy from './copy.js';

// Front-end tool; Node.js wrote the JSON log
export default fromCopy(copy).detailPage('query-tracker', [TOOL_JAVASCRIPT, TOOL_NODE_JS, TYPE_DATA_PIPELINE]);
