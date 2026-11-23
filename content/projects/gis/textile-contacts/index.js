// Washington Textile Survey and Map Tools: the RMDC survey and its two
// Experience Builder apps. Project page, #/textile-contacts. Each child
// page is a folder here. Structure only: copy comes from
// textile-contacts.docx via copy.js (tools/copy_sync.py). How to build
// pages: content/helpers.js.

import {PAGE_WIDTHS, fromCopy, pageImage} from '../../../helpers.js';
import copy from './copy.js';
import surveyForm from './survey-form/index.js';
import publicMap from './public-map/index.js';
import reviewApp from './review-app/index.js';

// Children in card order. The demos on the app pages are my AGOL
// mockups; the links in the doc go to RMDC's production versions.
export default fromCopy(copy).groupPage('textile-contacts', [surveyForm, publicMap, reviewApp], {
  // The project card's image: the Public App's first screenshot, reused
  // from its folder (no copy). A group normally keeps to its own thumb,
  // since its page shows that child's card too; here the map is the
  // project's best picture
  thumb: publicMap.content.fallback[0],
  // The page's picture: the slide from my GIS Day talk showing the paper
  // pin map this project started from. No app behind it, so the frame
  // keeps the slide's shape and a click opens it full size. The caption
  // comes from the doc (Caption field)
  content: {
    fallback: pageImage(import.meta.url, 'preview_symposium_map', 'Presentation slide titled Layer 1, Where We Started. On the right, a photo of the paper map of Washington from the RMDC symposium, with colored pins clustered around Puget Sound and a few in Okanogan, Spokane and Clark counties. On the left, the text: every attendee placed a pin showing their primary role and where they work in Washington’s textile system. Red, design and manufacturing; orange, collection, sorting and logistics; yellow, repair, reuse and resale; green, recycling, reprocessing and end markets; blue, waste disposal, landfill and incineration; purple, academic, research, education and innovation; white, consultants, business support and other; black, government, policy and tribal. 50 pins, 9 of 39 counties represented (23%).', PAGE_WIDTHS.preview),
    aspect: '16 / 9',
  },
  // Where the TL;DR goes on desktop: 'right' (default), 'left' or
  // 'full' (no column). See LAYOUTS in components/page/page.js.
  layout: 'full',
  // What goes in the side column, in order: 'tldr', 'links'.
  // Default ['tldr']; anything not listed stays in the main column.
  aside: ['tldr'],
});
