// Washington Textile Survey and Map Tools: the RMDC survey and its two
// Experience Builder apps. Project page, #/textile-contacts. Each child
// page is a folder here. Structure only: copy comes from
// textile-contacts.docx via copy.js (tools/copy_sync.py). How to build
// pages: content/helpers.js.

import {fromCopy} from '../../../helpers.js';
import copy from './copy.js';
import surveyForm from './survey-form/index.js';
import publicMap from './public-map/index.js';
import reviewApp from './review-app/index.js';

// Children in card order. The demos on the app pages are my AGOL
// mockups; the links in the doc go to RMDC's production versions.
export default fromCopy(copy).groupPage('textile-contacts', [surveyForm, publicMap, reviewApp], {
  // Where the TL;DR goes on desktop: 'right' (default), 'left' or
  // 'full' (no column). See LAYOUTS in components/page/page.js.
  layout: 'full',
  // What goes in the side column, in order: 'tldr', 'links'.
  // Default ['tldr']; anything not listed stays in the main column.
  aside: ['tldr'],
});
