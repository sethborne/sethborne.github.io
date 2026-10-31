// Data pipeline: the steps between raw place records and the published
// dataset. #/textile-resale-economy/data-pipeline. Copy: data-pipeline.docx.

import {fromCopy} from '../../../../helpers.js';
import copy from './copy.js';
import deduper from './deduper/index.js';
import finalReview from './final-review/index.js';
import queryTracker from './query-tracker/index.js';

// Children in card order: the order records go through them
export default fromCopy(copy).groupPage('data-pipeline', [deduper, finalReview, queryTracker]);
