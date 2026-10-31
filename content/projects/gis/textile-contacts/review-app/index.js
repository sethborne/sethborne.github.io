// Review app: internal Experience Builder app for managing entries.
// #/textile-contacts/review-app. Copy: review-app.docx -> copy.js.

import {EB_APP, fromCopy, pendingEmbed} from '../../../../helpers.js';
import {TYPE_REVIEW_TOOL, TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

export default fromCopy(copy).detailPage('review-app', [...EB_APP, TYPE_WEB_APP, TYPE_REVIEW_TOOL], {
  content: {embed: pendingEmbed('textile-contacts/review-app')},
});
