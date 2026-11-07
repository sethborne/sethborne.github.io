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

import {existsSync} from 'node:fs';
import {join, parse} from 'node:path';
import {eachLimited, filesIn, readArgs, saveResized, widthOf} from './image_resize.mjs';

const USAGE = 'Usage: npm run gallery -- <page folder> [--widths 800,1280,1600,2560] [--quality 78] [--full-quality 85]';
const {page, widths, quality, 'full-quality': fullQuality} = readArgs(USAGE, {
  widths: [800, 1280, 1600, 2560],
  quality: 78,
  'full-quality': 85,
});

const src = join(page, 'img', '_raw', 'gallery');
const out = join(page, 'img', 'gallery');
if (!existsSync(src)) throw new Error(`No raw images at ${src}`);
const files = await filesIn(src, /\.jpe?g$/i);
if (!files.length) throw new Error(`No .jpg files in ${src}`);

await eachLimited(files, 4, async (file) => {
  const input = join(src, file);
  const {name} = parse(file);
  if (!/^[a-z0-9_]+$/.test(name)) console.warn(`WARNING: ${name}: use lowercase and underscores only`);
  await Promise.all([
    ...widths.map((width) => saveResized({input, output: join(out, `${name}_${width}.jpg`), width, quality})),
    saveResized({input, output: join(out, `${name}_full.jpg`), quality: fullQuality}),
  ]);
  console.log(`${name} (${await widthOf(input)} px wide)`);
});
console.log(`${files.length} images -> ${out}`);
