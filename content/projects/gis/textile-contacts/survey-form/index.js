// Survey form: the Survey123 form behind both apps.
// #/textile-contacts/survey-form. Copy: survey-form.docx -> copy.js.
// Screenshots: npm run page-images (raws in img/_raw/).

import {PAGE_WIDTHS, fromCopy, pageImages, qrCode} from '../../../../helpers.js';
import {TOOL_ARCGIS_ONLINE, TOOL_SURVEY123, TYPE_FORM} from '../../../../tags.js';
import copy from './copy.js';

// Screenshots in the frame, in order (img/<name>_<width>.jpg), each with
// its alt text. Two or more make a slideshow; the card shows the first.
// Comment a line out to drop one.
const TAKES = {
  preview_survey_form_01: 'Screenshot of the Washington Textile System Mapping Survey form in Survey123',
  preview_survey_form_02: 'Screenshot of the survey’s thank-you screen after a submission, with a link to the Washington Textile System map',
};

export default fromCopy(copy).detailPage('survey-form', [TOOL_SURVEY123, TOOL_ARCGIS_ONLINE, TYPE_FORM], {
  content: {
    link: 'https://survey123.arcgis.com/share/f2a1ae7b52074ba1a257ac3eef5d7bee',
    qr: qrCode(import.meta.url),
    fallback: pageImages(import.meta.url, TAKES, PAGE_WIDTHS.preview),
  },
});
