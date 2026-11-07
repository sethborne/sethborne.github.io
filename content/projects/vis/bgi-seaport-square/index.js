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
import copy from './copy.js';

// Loading lines for this model: the shared ones plus a few from Boston
const BOSTON_LINES = [
  'Pahking the cah in Hahvahd Yahd',
  'Waiting on the Green Line',
  'Finishing the Big Dig',
  'Making it wicked fast',
  'Grabbing a Dunkies',
];

// Full layout: the sections get the page width.
export default fromCopy(copy).detailPage('bgi-seaport-square', [TYPE_RENDERINGS, TYPE_INTERACTIVE_MODEL, TOOL_3DS_MAX, TOOL_VRAY, TOOL_AFTER_EFFECTS, TOOL_PHOTOSHOP], {
  layout: 'full',
  // img/thumb_<width>.jpg in this folder: the full build-out, frame 0
  thumb: pageImage(import.meta.url, 'thumb', 'Massing model of Seaport Square, fully built out'),
  sections: [
    // TEMP: stand-in images (gitignored) until the real stills are exported
    {
      id: 'renderings',
      gallery: gallery(import.meta.url, {
        aspect: '3 / 2',
        // Grid order = lightbox order = the doc's Gallery lines. The
        // squares get a focus, since the grid crops them to 4:3.
        images: [
          'bgi_aerial_ne',
          'bgi_aerial_nw',
          // {name: 'bgi_aerial_nw', focus: 'center 70%'},
          'bgi_aerial_s_look_n',
          'bgi_aerial_se',
          // {name: 'bgi_aerial_ne', focus: '35% center'},
          'bgi_aerial_sw',
          // 'harbor_edge',
          // {name: 'street_view_sq', focus: 'center 30%'},
          // 'aerial_look_sw',
          // 'channel_dusk',
          // 'courtyard_sq',
          // 'phase_a_site',
          // 'skyline_pano',
          // {name: 'massing_sq', focus: 'center 65%'},
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
});
