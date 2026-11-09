// BGI Seaport Square: visualization of the Seaport Square development on
// the Boston waterfront (2016, collateral for an iPad app). One page in
// sections: still renderings (a gallery) and a phased massing model as a
// turntable. Standalone page, #/bgi-seaport-square.
// Copy: bgi-seaport-square.docx -> copy.js (tools/copy_sync.py). Its
// Sections field has a Heading 3 per section, in the order listed here;
// image titles and captions go under the section's Heading 4 Gallery,
// in image order.
// Frames: npm run turntable (raw renders in img/_raw/turntable/).
// Stills: npm run gallery (full-size exports in img/_raw/gallery/).

import {fromCopy, gallery, pageImage, turntable} from '../../../helpers.js';
import {TOOL_3DS_MAX, TOOL_AFTER_EFFECTS, TOOL_PHOTOSHOP, TOOL_VRAY, TYPE_INTERACTIVE_MODEL, TYPE_RENDERINGS} from '../../../tags.js';
import ui from '../../../ui.js';
import {
  MEDIA_RENDERING,
  MEDIA_PHOTOSIM,
  VIEW_AERIAL,
  VIEW_EXTERIOR,
  VIEW_INTERIOR,
  USE_BUSINESS,
  USE_MIXED_USE,
  USE_RESIDENTIAL,
  USE_WATERFRONT,
  USE_RETAIL,
} from '../../../gallery-tags.js';
import copy from './copy.js';

// Loading lines for this model: the shared ones plus a few from Boston
const BOSTON_LINES = ['Pahking the cah in Hahvahd Yahd', 'Waiting on the Green Line', 'Finishing the Big Dig', 'Making it wicked fast', 'Grabbing a Dunkies'];

// Full layout: the sections get the page width.
export default fromCopy(copy).detailPage(
  'bgi-seaport-square',
  [TYPE_RENDERINGS, TYPE_INTERACTIVE_MODEL, TOOL_3DS_MAX, TOOL_VRAY, TOOL_AFTER_EFFECTS, TOOL_PHOTOSHOP],
  {
    layout: 'full',
    // The card shows a gallery still (its 800 and 1280 sizes), not a
    // copy, so re-exporting the still updates the card too. The turntable
    // tool still writes img/thumb_*.jpg (frame 0); point back at 'thumb'
    // to use that instead.
    thumb: pageImage(import.meta.url, 'gallery/bgi_aerial_sw', 'Aerial rendering of Seaport Square, looking southwest', [800, 1280]),
    sections: [
      {
        id: 'renderings',
        gallery: gallery(import.meta.url, {
          aspect: '3 / 2',
          // Chip rows from each image's tags (content/gallery-tags.js): Type,
          // View and Use all show, since each has two or more terms in use.
          filter: true,
          // Grid order = lightbox order = the doc's Gallery lines. `focus`
          // frames an image's 3:2 crop in the grid (CSS object-position);
          // the lightbox shows the whole image.
          // TEMP: the USE_ tags are placeholder guesses; Seth corrects them
          images: [
            {name: 'bgi_aerial_ne', tags: [MEDIA_RENDERING, MEDIA_PHOTOSIM, VIEW_AERIAL, USE_BUSINESS, USE_RESIDENTIAL, USE_WATERFRONT, USE_MIXED_USE]},
            {name: 'bgi_aerial_nw', tags: [MEDIA_RENDERING, MEDIA_PHOTOSIM, VIEW_AERIAL, USE_BUSINESS, USE_RESIDENTIAL, USE_WATERFRONT, USE_MIXED_USE]},
            {name: 'bgi_aerial_s_look_n', tags: [MEDIA_RENDERING, MEDIA_PHOTOSIM, VIEW_AERIAL, USE_BUSINESS, USE_RESIDENTIAL, USE_WATERFRONT, USE_MIXED_USE]},
            {name: 'bgi_aerial_se', tags: [MEDIA_RENDERING, MEDIA_PHOTOSIM, VIEW_AERIAL, USE_BUSINESS, USE_RESIDENTIAL, USE_WATERFRONT, USE_MIXED_USE]},
            {name: 'bgi_aerial_sw', tags: [MEDIA_RENDERING, MEDIA_PHOTOSIM, VIEW_AERIAL, USE_BUSINESS, USE_RESIDENTIAL, USE_WATERFRONT, USE_MIXED_USE]},
            // 5
            {name: 'bgi_bldgb_ext_hero', focus: 'center 100%', tags: [MEDIA_RENDERING, VIEW_EXTERIOR, USE_WATERFRONT, USE_BUSINESS, USE_MIXED_USE, USE_RETAIL]},
            {name: 'bgi_bldgb_int_office', focus: 'center 40%', tags: [MEDIA_RENDERING, VIEW_INTERIOR, USE_WATERFRONT, USE_BUSINESS]},
            {
              name: 'bgi_bldgd_ext_hero',
              focus: 'center 100%',
              tags: [MEDIA_RENDERING, VIEW_EXTERIOR, USE_WATERFRONT, USE_BUSINESS, USE_RESIDENTIAL, USE_MIXED_USE],
            },
            {name: 'bgi_bldgd_int_lobby', tags: [MEDIA_RENDERING, VIEW_INTERIOR, USE_BUSINESS]},
            {name: 'bgi_bldgd_int_office', focus: 'center 60%', tags: [MEDIA_RENDERING, VIEW_INTERIOR, USE_WATERFRONT, USE_BUSINESS]},
            // 10
            {
              name: 'bgi_bldgl1_ext_hero_011413',
              focus: 'center 85%',
              tags: [MEDIA_RENDERING, VIEW_EXTERIOR, USE_WATERFRONT, USE_BUSINESS, USE_RETAIL, USE_MIXED_USE],
            },
            {name: 'bgi_bldgl1_int_office_011413', focus: 'center 75%', tags: [MEDIA_RENDERING, VIEW_INTERIOR, USE_WATERFRONT, USE_BUSINESS]},
            {
              name: 'bgi_bldgl2_ext_hero_011413',
              focus: 'center 85%',
              tags: [MEDIA_RENDERING, VIEW_EXTERIOR, USE_WATERFRONT, USE_BUSINESS, USE_RETAIL, USE_MIXED_USE],
            },
            {name: 'bgi_bldgl2_int_office_011413', focus: 'center 50%', tags: [MEDIA_RENDERING, VIEW_INTERIOR, USE_WATERFRONT, USE_BUSINESS]},
            // {name: '', tags: [MEDIA_RENDERING, USE_WATERFRONT, USE_BUSINESS, USE_RESIDENTIAL]},
          ],
        }),
      },
      {
        id: 'phasing-model',
        turntable: turntable(import.meta.url, {
          phases: ['a', 'b', 'c', 'd', 'e'],
          // Frame 0 looks northeast across the Seaport toward the harbor
          heading: 'NE',
          alt: 'Massing model of Seaport Square on the Boston waterfront',
          loadingLines: [...ui.turntable.loadingLines, ...BOSTON_LINES],
        }),
      },
    ],
  },
);
