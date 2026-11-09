// Turntable frames: raw renders -> the small frames a turntable loads.
//
// Usage (from the repo root, any shell; `npm install` once first):
//   npm run turntable -- content/projects/vis/bgi-seaport-square
//
// Reads   <page>/img/_raw/turntable/phase_<id>/phase_<id>_base_00000.jpg   (gitignored)
//                                              phase_<id>_color_00000.jpg
// Writes  <page>/img/turntable/phase_<id>/base_00_640.jpg   render at each of --widths, JPG
//                                         base_00_1024.jpg  (the turntable picks one size per screen)
//                                         color_00.png      ID pass, --color-width wide, PNG
//         <page>/img/thumb_800.jpg, thumb_1280.jpg       card thumb: the last phase's frame 0
//
// The ID pass is scaled nearest-neighbor and saved as PNG, so each
// building keeps one exact color: smoothing would blend two buildings'
// colors at their shared edge into a third that matches neither.
// Phases are the phase_* folders, in name order. Re-running overwrites.
//   --source <folder>   read the raw phase_* folders from somewhere else
//   --widths 640        write only some sizes (the list must match `sizes`
//                       in TURNTABLE_DEFAULTS, content/helpers.js)
//   --color-width 512   width of the ID passes
//   --quality 78        JPG quality of the renders and thumb

import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {eachLimited, filesIn, foldersIn, readArgs, saveResized} from './image_resize.mjs';
import {dim, fail, heading, ok, path} from './term.mjs';

const USAGE = 'Usage: npm run turntable -- <page folder> [--source <folder>] [--widths 640,1024] [--color-width 512] [--quality 78]';
const {page, source, widths, quality, 'color-width': colorWidth} = readArgs(USAGE, {
  source: '',
  widths: [640, 1024],
  'color-width': 512,
  quality: 78,
});

const src = source || join(page, 'img', '_raw', 'turntable');
const out = join(page, 'img', 'turntable');
if (!existsSync(src)) fail('No Raw Frames', path(src, process.stderr));
const phases = await foldersIn(src, /^phase_/);
if (!phases.length) fail('No phase_* Folders', path(src, process.stderr));
console.log(heading('Turntable'), path(page));

const basesOf = (phase) => filesIn(join(src, phase), new RegExp(`^${phase}_base_.*\\.jpg$`, 'i'));

for (const phase of phases) {
  const bases = await basesOf(phase);
  const dir = join(out, phase);
  // Frames are numbered by position (00, 01, ...), not by the render's own number
  await eachLimited(bases, 8, async (file, i) => {
    const n = String(i).padStart(2, '0');
    const input = join(src, phase, file);
    const color = join(src, phase, file.replace('_base_', '_color_'));
    await Promise.all([
      ...widths.map((width) => saveResized({input, output: join(dir, `base_${n}_${width}.jpg`), width, quality})),
      existsSync(color) && saveResized({input: color, output: join(dir, `color_${n}.png`), width: colorWidth, smooth: false}),
    ]);
  });
  console.log(ok(phase), dim(`${bases.length} frames`));
}

// Card thumb: the full build-out from the first angle
const last = phases.at(-1);
const [first] = await basesOf(last);
await Promise.all([800, 1280].map((width) =>
  saveResized({input: join(src, last, first), output: join(page, 'img', `thumb_${width}.jpg`), width, quality})));
console.log(ok('thumb'), path('img/thumb_800.jpg, thumb_1280.jpg'));
