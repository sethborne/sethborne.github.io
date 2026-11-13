// FRIT Pike and Rose: visualization of the Pike and Rose development
// (developer: FRIT). One page in sections, like Westbrook Station: still
// renderings (a gallery), a phased massing model (a turntable), living
// renderings (a gallery of video loops) and an animation (a movie with
// sound). Standalone page, #/frit-pike-and-rose.
// Copy: frit-pike-and-rose.docx -> copy.js (tools/copy_sync.py). Its
// Sections field has a Heading 3 per section, in the order listed here;
// titles and captions go under the section's Heading 4 Gallery, one line
// per card, in order.
// Frames: npm run turntable (raw renders in img/_raw/turntable/).
// Stills: npm run gallery (full-size exports in img/_raw/gallery/).
// Videos: npm run video (raw videos in img/_raw/living_renders/ and
// img/_raw/animation/; poster moments in img/_raw/video_posters.json).

import {fromCopy, gallery, pageImage, turntable, video} from '../../../helpers.js';
import {TOOL_3DS_MAX, TOOL_PHOTOSHOP, TOOL_VRAY, TYPE_INTERACTIVE_MODEL, TYPE_RENDERINGS} from '../../../tags.js';
import {
  MEDIA_PHOTOSIM,
  MEDIA_RENDERING,
  USE_BUSINESS,
  USE_ENTERTAINMENT,
  USE_MIXED_USE,
  USE_RESIDENTIAL,
  USE_RETAIL,
  VIEW_AERIAL,
  VIEW_EXTERIOR,
  VIEW_INTERIOR,
  VIEW_PLAN,
} from '../../../gallery-tags.js';
import copy from './copy.js';

// Every file shares this start; P('aerial_photosim') reads easier below
const P = (name) => `frit_pikeandrose_${name}`;

// TEMP: filter tags deduced from the file names (aerial / exterior /
// interior, office, retail, unit, theater...); Seth to correct. Shared
// sets below, one per kind of shot; a card adds its own Use.
const AERIAL = [MEDIA_RENDERING, VIEW_AERIAL, USE_MIXED_USE];
const PLAN = [MEDIA_RENDERING, VIEW_PLAN, USE_MIXED_USE];
const STREET = [MEDIA_RENDERING, VIEW_EXTERIOR];
const INSIDE = [MEDIA_RENDERING, VIEW_INTERIOR];

// Full layout: the sections get the page width.
export default fromCopy(copy).detailPage(
  'frit-pike-and-rose',
  // [?] Tools: confirm
  [TYPE_RENDERINGS, TYPE_INTERACTIVE_MODEL, TOOL_3DS_MAX, TOOL_VRAY, TOOL_PHOTOSHOP],
  {
    layout: 'full',
    // TEMP: frame 0 of the turntable (written by npm run turntable); swap
    // for the best still once picked
    thumb: pageImage(import.meta.url, 'thumb', 'Massing model of Pike and Rose'),
    // The doc's Sections field needs a Heading 3 per section, in this
    // order, or the browser console warns.
    sections: [
      {
        id: 'renderings',
        // `variants`: other images of the same view (revisions, phases,
        // options), one card with buttons in the lightbox.
        gallery: gallery(import.meta.url, {
          filter: true,
          images: [
            {
              name: P('aerial_photosim'),
              focus: '40% 50%',
              zoom: 1.35,
              variants: [P('aerial_photosim_phase01')],
              tags: [MEDIA_PHOTOSIM, VIEW_AERIAL, USE_MIXED_USE],
            },
            {name: P('aerial_interactive_phase02_enlargement'), focus: '40% 60%', zoom: 1.1, tags: AERIAL},
            {name: P('aerial_phase02_view_sw'), focus: '30% 60%', zoom: 1.35, tags: AERIAL},
            {name: P('aerial_interactive_phase04_plan'), focus: '50% 10%', zoom: 1.1, tags: PLAN},
            {name: P('aerial_map_top_down_phase04'), focus: '49% 52.5%', zoom: 3.5, tags: PLAN},
            {name: P('aerial_office_highlight'), focus: '45% 50%', zoom: 1.15, tags: [MEDIA_RENDERING, VIEW_AERIAL, USE_BUSINESS]},
            {name: P('tier01_exterior_bldg11_view01_hero'), focus: '50% 50%', zoom: 1, tags: [...STREET, USE_MIXED_USE]},
            {
              name: P('tier01_exterior_bldg11_view04_ipic_theater_looking_sw_v2'),
              variants: [P('tier01_exterior_bldg11_view04_ipic_theater_looking_sw_v1')],
              focus: '50% 90%',
              zoom: 1.15,
              tags: [...STREET, USE_ENTERTAINMENT, USE_RETAIL],
            },
            {name: P('tier01_exterior_bldg12_view02a_muse_alley_looking_east'), focus: '50% 85%', zoom: 1.1, tags: [...STREET, USE_RETAIL, USE_RESIDENTIAL]},
            {name: P('tier01_exterior_bldg12_view02b_muse_alley_looking_east'), focus: '50% 100%', zoom: 1.1, tags: [...STREET, USE_RETAIL]},
            {name: P('tier01_exterior_bldg12_view03_old_georgetown_looking_n'), focus: '50% 100%', zoom: 1.1, tags: [...STREET, USE_MIXED_USE]},
            {
              name: P('tier02_exterior_bldg03_view04_v2'),
              variants: [P('tier02_exterior_bldg03_view04_v1')],
              focus: '50% 100%',
              zoom: 1.1,
              tags: [...STREET, USE_MIXED_USE],
            },
            {
              name: P('tier02_exterior_bldg04_view02_v2'),
              variants: [P('tier02_exterior_bldg04_view02_v1')],
              focus: '50% 100%',
              zoom: 1.1,
              tags: [...STREET, USE_MIXED_USE],
            },
            {
              name: P('tier02_exterior_bldg06_view01_v2'),
              variants: [P('tier02_exterior_bldg06_view01_v1')],
              focus: '50% 50%',
              zoom: 1.1,
              tags: [...STREET, USE_MIXED_USE],
            },
            {
              name: P('tier02_exterior_bldg06_view03_looking_nw_v1'),
              variants: [P('tier02_exterior_bldg06_view03_looking_nw_v2'), P('tier02_exterior_bldg06_view03_looking_nw_v3_uniqlo')],
              focus: '50% 40%',
              zoom: 1.1,
              tags: [...STREET, USE_RETAIL, USE_MIXED_USE],
            },
            {name: P('tier02_exterior_bldg09_view05a'), focus: '50% 100%', zoom: 1, tags: [...STREET, USE_BUSINESS]},
            {name: P('tier02_exterior_bldg09_view05b'), focus: '50% 95%', zoom: 1, tags: [...STREET, USE_RETAIL]},
            {name: P('tier02b_exterior_bldg11_office_entrance'), focus: '50% 30%', zoom: 1, tags: [...STREET, USE_BUSINESS]},
            {name: P('tier02b_interior_bldg11_office'), focus: '50% 85%', zoom: 1, tags: [...INSIDE, USE_BUSINESS]},
            {name: P('tier03_exterior_bldg12_courtyard'), focus: '50% 85%', zoom: 1, tags: [...STREET, USE_RESIDENTIAL]},
            {name: P('tier03_exterior_bldg12_lounge'), focus: '50% 100%', zoom: 1, tags: [...INSIDE, USE_RESIDENTIAL]},
            {name: P('tier03_interior_bldg12_modern_unit'), focus: '50% 100%', zoom: 1, tags: [...INSIDE, USE_RESIDENTIAL]},
            {name: P('tier03_interior_bldg12_transitional_unit'), focus: '50% 100%', zoom: 1, tags: [...INSIDE, USE_RESIDENTIAL]},
            {name: P('tierXX_exterior_bldg04_retail_westelm'), focus: '50% 80%', zoom: 1, tags: [...STREET, USE_RETAIL]},
            {name: P('tierXX_exterior_bldg08_retail'), focus: '50% 100%', zoom: 1, tags: [...STREET, USE_RETAIL]},
            {name: P('tierXX_interior_bldg11_function_space_wedding'), focus: '50% 90%', zoom: 1, tags: [...INSIDE, USE_ENTERTAINMENT]},
            {name: P('tierXX_interior_bldg11_performance_space'), focus: '50% 25%', zoom: 1.25, tags: [...INSIDE, USE_ENTERTAINMENT]},
            {name: P('tierXX_interior_bldg11_prefunction_room'), focus: '50% 70%', zoom: 1.25, tags: [...INSIDE, USE_ENTERTAINMENT]},
          ],
        }),
      },
      {
        id: 'phasing-model',
        turntable: turntable(import.meta.url, {
          phases: ['a', 'b', 'c', 'd'],
          // Frame 0 looks a little west of north
          heading: 350,
          alt: 'Massing model of Pike and Rose',
        }),
      },
      {
        id: 'living-renderings',
        gallery: gallery(import.meta.url, {
          images: ['01', '02a', '02b', '03', '04'].map((n) => ({name: P(`living_${n}`), video: 'loop'})),
        }),
      },
      {
        id: 'animation',
        video: video(import.meta.url, {name: P('animation')}),
      },
    ],
  },
);
