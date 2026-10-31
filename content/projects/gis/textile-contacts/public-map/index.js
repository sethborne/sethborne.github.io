// Public map: Experience Builder map of approved survey entries.
// #/textile-contacts/public-map. Copy: public-map.docx -> copy.js.

import {EB_APP, fromCopy, pendingEmbed} from '../../../../helpers.js';
import {TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

export default fromCopy(copy).detailPage('public-map', [...EB_APP, TYPE_WEB_APP], {
  content: {embed: pendingEmbed('textile-contacts/public-map')},
});
