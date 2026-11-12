// Hines Westbrook Station: visualization of the Westbrook Station
// development (~2016 [?]). One page in sections, like BGI Seaport Square:
// still renderings (a gallery), living renderings (a gallery of video
// loops), an animation (a video on the page) and a phased massing model
// (a turntable). Standalone page, #/hines-westbrook-station.
// Copy: hines-westbrook-station.docx -> copy.js (tools/copy_sync.py). Its
// Sections field has a Heading 3 per section, in the order listed here;
// image titles and captions go under the section's Heading 4 Gallery,
// in image order.
// Frames: npm run turntable (raw renders in img/_raw/turntable/).
// Stills: npm run gallery (full-size exports in img/_raw/gallery/).
// Videos: npm run video (raw videos in img/_raw/living_renders/ and
// img/_raw/animation/; poster moments in img/_raw/video_posters.json).

import {fromCopy, gallery, pageImage, turntable, video} from '../../../helpers.js';
import {TOOL_3DS_MAX, TOOL_PHOTOSHOP, TOOL_VRAY, TYPE_INTERACTIVE_MODEL, TYPE_RENDERINGS} from '../../../tags.js';
import copy from './copy.js';

// Full layout: the sections get the page width.
export default fromCopy(copy).detailPage(
  'hines-westbrook-station',
  // [?] Tools: confirm (After Effects, if the living renderings used it)
  [TYPE_RENDERINGS, TYPE_INTERACTIVE_MODEL, TOOL_3DS_MAX, TOOL_VRAY, TOOL_PHOTOSHOP],
  {
    layout: 'full',
    // TEMP: frame 0 of the turntable (written by npm run turntable); swap
    // for the best still once picked:
    // pageImage(import.meta.url, 'gallery/hines_westbrook_view_01', '<alt>', [800, 1280])
    thumb: pageImage(import.meta.url, 'thumb', 'Massing model of Westbrook Station'),
    // The doc's Sections field needs a Heading 3 per section, in this
    // order, or the browser console warns.
    sections: [
      {
        id: 'renderings',
        // Raw shapes vary (wide, near square, square); the 4:3 grid crops
        // them, `focus` reframes one if the crop cuts badly
        gallery: gallery(import.meta.url, {
          images: ['hines_westbrook_view_01', 'hines_westbrook_view_02', 'hines_westbrook_view_04'],
        }),
      },
      {
        id: 'phasing-model',
        turntable: turntable(import.meta.url, {
          phases: ['a', 'b', 'c', 'd'],
          // Frame 0 looks north
          heading: 'N',
          alt: 'Massing model of Westbrook Station',
        }),
      },
      {
        id: 'living-renderings',
        // Video loops, muted; titles and captions from the doc's Gallery
        // lines like the stills
        gallery: gallery(import.meta.url, {
          images: [
            {name: 'hines_westbrook_view_01', video: 'loop'},
            {name: 'hines_westbrook_view_02', video: 'loop'},
            {name: 'hines_westbrook_view_04', video: 'loop'},
          ],
        }),
      },
      {
        id: 'animation',
        video: video(import.meta.url, {name: 'hines_westbrook_animation'}),
      },
    ],
  },
);
