// Survey form: the Survey123 form behind both apps.
// #/textile-contacts/survey-form. Copy: survey-form.docx -> copy.js.

import {fromCopy, pendingEmbed} from '../../../../helpers.js';
import {TOOL_ARCGIS_ONLINE, TOOL_SURVEY123, TYPE_FORM} from '../../../../tags.js';
import copy from './copy.js';

export default fromCopy(copy).detailPage('survey-form', [TOOL_SURVEY123, TOOL_ARCGIS_ONLINE, TYPE_FORM], {
  content: {embed: pendingEmbed('textile-contacts/survey-form')},
});
