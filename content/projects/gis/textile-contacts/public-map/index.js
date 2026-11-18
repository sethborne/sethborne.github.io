// Public map: Experience Builder map of approved survey entries.
// #/textile-contacts/public-map. Copy: public-map.docx -> copy.js.
// Screenshots: npm run page-images (raws in img/_raw/).

import {EB_APP, PAGE_WIDTHS, fromCopy, pageImages} from '../../../../helpers.js';
import {TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

// Screenshots in the frame, in order (img/<name>_<width>.jpg), each with
// its alt text. Two or more make a slideshow; the card shows the first.
// Comment a line out to drop one.
const TAKES = {
  preview_survey_external_app_01: 'Screenshot of the public Washington Textile System map: survey pins across Washington, colored by organization type, with the legend beside them',
  preview_survey_external_app_02: 'Screenshot of the public Washington Textile System map with a pin’s pop-up open, showing one organization’s details',
  preview_survey_external_app_03: 'Screenshot of the public app’s Data Tables tab: every approved survey entry in one searchable, sortable table',
  preview_survey_external_app_04: 'Screenshot of the public app’s FAQ tab: About the Map, How the Review Process Works, Where the Data Comes From and About the Project',
  preview_survey_external_app_05: 'Screenshot of the public app’s FAQ tab with the About the Map window open, explaining what the map shows and who can be on it',
};

export default fromCopy(copy).detailPage('public-map', [...EB_APP, TYPE_WEB_APP], {
  content: {
    link: 'https://experience.arcgis.com/experience/aab92662811240559c1feda55d70a53c',
    fallback: pageImages(import.meta.url, TAKES, PAGE_WIDTHS.preview),
  },
});
