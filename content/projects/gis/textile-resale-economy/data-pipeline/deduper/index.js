// Deduper: browser tool for reviewing likely duplicate records.
// #/textile-resale-economy/data-pipeline/deduper. Copy: deduper.docx.

import {fromCopy} from '../../../../../helpers.js';
import {TOOL_JAVASCRIPT, TOOL_NODE_JS, TYPE_DATA_PIPELINE, TYPE_REVIEW_TOOL} from '../../../../../tags.js';
import copy from './copy.js';

// Front-end tool; Node.js wrote the JSON cache
export default fromCopy(copy).detailPage('deduper', [TOOL_JAVASCRIPT, TOOL_NODE_JS, TYPE_REVIEW_TOOL, TYPE_DATA_PIPELINE]);
