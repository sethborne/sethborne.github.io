// Gallery images: one full-size export per image -> the files a gallery loads.
//
// Usage (from the repo root, any shell; `npm install` once first):
//   npm run gallery -- content/projects/vis/bgi-seaport-square
//
// Reads   <page>/img/_raw/gallery/<name>.jpg       one full-size JPG per image, named
//                                                   by subject (aerial_look_sw.jpg; gitignored)
// Writes  <page>/img/gallery/<name>_800.jpg ...    each of --widths: grid + lightbox
//         <page>/img/gallery/<name>_full.jpg       native size: "View Full Size"
//
// Names: lowercase, underscores only (ARCHITECTURE.md -> Images); list them
// in the page's index.js, gallery({images: [...]}). Re-running overwrites.
// An image narrower than a width still gets that file, at its own size,
// so every name has the full set the srcset expects.
//   --widths 800,1280   write only some sizes (the list must match `widths`
//                       in GALLERY_DEFAULTS, content/helpers.js)
//   --quality 78        JPG quality of the sized files
//   --full-quality 85   JPG quality of _full
//
// Check instead of resize (tools/gallery_check.mjs; writes no images):
//   --check             were the images made right? raw vs outputs, per size
//   --check --used      also: are they used right? (the page's index.js galleries)
//   --log               with --check: also write img/_raw/gallery/_logs/YYYYMMDD_HHMMSS_gallery_check.md

import {existsSync} from 'node:fs';
import {join, parse} from 'node:path';
import {eachLimited, filesIn, readArgs, saveResized, widthOf} from './image_resize.mjs';
import {runCheck} from './gallery_check.mjs';
import {dim, fail, heading, ok, path, warn} from './term.mjs';

const USAGE = 'Usage: npm run gallery -- <page folder> [--widths 800,1280,1600,2560] [--quality 78] [--full-quality 85] [--check [--used] [--log]]';
const {page, widths, quality, 'full-quality': fullQuality, check, used, log} = readArgs(USAGE, {
  widths: [800, 1280, 1600, 2560],
  quality: 78,
  'full-quality': 85,
  check: false,
  used: false,
  log: false,
});

if ((used || log) && !check) fail('--used and --log Go With --check', USAGE);
if (check) {
  await runCheck({page, widths, used, log});
  process.exit();
}

const src = join(page, 'img', '_raw', 'gallery');
const out = join(page, 'img', 'gallery');
if (!existsSync(src)) fail('No Raw Images', path(src, process.stderr));
const files = await filesIn(src, /\.jpe?g$/i);
if (!files.length) fail('No JPG Files', path(src, process.stderr));
console.log(heading('Gallery'), path(page));

await eachLimited(files, 4, async (file) => {
  const input = join(src, file);
  const {name} = parse(file);
  if (!/^[a-z0-9_]+$/.test(name)) console.warn(warn(`Warning: ${name}: use lowercase and underscores only`, process.stderr));
  await Promise.all([
    ...widths.map((width) => saveResized({input, output: join(out, `${name}_${width}.jpg`), width, quality})),
    saveResized({input, output: join(out, `${name}_full.jpg`), quality: fullQuality}),
  ]);
  console.log(ok(name), dim(`(${await widthOf(input)} px wide)`));
});
console.log(ok(`${files.length} images ->`), path(out));
