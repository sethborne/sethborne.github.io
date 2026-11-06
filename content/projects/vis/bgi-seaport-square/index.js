// BGI Seaport Square: visualization of the Seaport Square development on
// the Boston waterfront (2016, collateral for an iPad app). One page in
// sections: still renderings (gallery, later) and a phased massing model
// as a turntable. Standalone page, #/bgi-seaport-square.
// Copy: bgi-seaport-square.docx -> copy.js (tools/copy_sync.py); section
// headings come from its Sections field, in the order listed here.
// Frames: tools/turntable_frames.ps1 (raw renders in img/_raw/turntable/).

import {fromCopy, pageImage, turntable} from '../../../helpers.js';
import {TOOL_3DS_MAX, TOOL_AFTER_EFFECTS, TOOL_PHOTOSHOP, TOOL_VRAY, TYPE_INTERACTIVE_MODEL} from '../../../tags.js';
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
export default fromCopy(copy).detailPage('bgi-seaport-square', [TYPE_INTERACTIVE_MODEL, TOOL_3DS_MAX, TOOL_VRAY, TOOL_AFTER_EFFECTS, TOOL_PHOTOSHOP], {
  layout: 'full',
  // img/thumb_<width>.jpg in this folder: the full build-out, frame 0
  thumb: pageImage(import.meta.url, 'thumb', 'Massing model of Seaport Square, fully built out'),
  sections: [
    // Gallery of still renderings goes first, once the gallery exists
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
