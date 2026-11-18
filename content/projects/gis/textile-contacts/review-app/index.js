// Review app: internal Experience Builder app for managing entries.
// #/textile-contacts/review-app. Copy: review-app.docx -> copy.js.
// Screenshots: npm run page-images (raws in img/_raw/).

import {EB_APP, PAGE_WIDTHS, fromCopy, pageImages} from '../../../../helpers.js';
import {TYPE_REVIEW_TOOL, TYPE_WEB_APP} from '../../../../tags.js';
import copy from './copy.js';

// Screenshots in the frame, in order (img/<name>_<width>.jpg), each with
// its alt text. Two or more make a slideshow; the card shows the first.
// Comment a line out to drop one.
const TAKES = {
  preview_survey_internal_app_01: 'Screenshot of the internal review app’s table of survey entries, with each entry’s review status',
  preview_survey_internal_app_02: 'Screenshot of the internal review app’s dark basemap of survey entries, colored by review status, with the legend and how-to panels',
  preview_survey_internal_app_03: 'Screenshot of the internal review app’s dark basemap with an entry’s pop-up open',
};

export default fromCopy(copy).detailPage('review-app', [...EB_APP, TYPE_WEB_APP, TYPE_REVIEW_TOOL], {
  content: {
    link: 'https://experience.arcgis.com/experience/f787dd2d61294cda99401a6fb0151e0e',
    fallback: pageImages(import.meta.url, TAKES, PAGE_WIDTHS.preview),
  },
});
