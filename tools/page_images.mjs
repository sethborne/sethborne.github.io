// Page images: one full-size screenshot per image -> the widths a page loads.
//
// Usage (from the repo root, any shell; `npm install` once first):
//   npm run page-images -- content/projects/gis/textile-contacts/public-map
//
// Reads   <page>/img/_raw/preview.png           the page frame's image (content.fallback)
//         <page>/img/_raw/thumb.png             optional: a tighter crop for the card
//         <page>/img/_raw/preview_<more>.png    several takes (preview_review_app_01, _02 ...):
//                                               each is processed, index.js picks one
//         (JPG, PNG or TIF; a trailing _full or _YYYYMMDD is dropped;
//         gitignored, never shipped)
// Writes  <page>/img/<name>_800.jpg ...         the widths in PAGE_WIDTHS (content/helpers.js)
//                                               for its job: the part of the name before the
//                                               first _ (preview, thumb). The same list
//                                               pageImage() puts in the srcset
//
// Then in the page's index.js:
//   content: {embed: ..., fallback: pageImage(import.meta.url, 'preview', '<alt>')}
//   thumb: pageImage(import.meta.url, 'thumb', '<alt>')   (only with a thumb raw)
// A take passes its widths: pageImage(import.meta.url, 'preview_review_app_01',
// '<alt>', PAGE_WIDTHS.preview). A card with no thumb shows the preview, so
// a thumb raw is only worth it when the card needs another crop.
// Re-running overwrites.
//
// Shapes: the frame is 16:10 from 600px up and 4:3 on phones, cards are
// 16:10, both cropped from the center (object-fit: cover). Export a
// 16:10 screenshot and keep what matters away from the left and right
// edges (phones cut about 8% off each side).
//   --quality 78        JPG quality

import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {ALL_WIDTHS, PAGE_WIDTHS} from '../content/helpers.js';
import {RAW_STILL, filesIn, readArgs, saveResized, siteName, sizeOf} from './image_resize.mjs';
import {dim, fail, heading, ok, path, warn} from './term.mjs';

const USAGE = 'Usage: npm run page-images -- <page folder> [--quality 78]';
const {page, quality} = readArgs(USAGE, {quality: 78});

// The shape each image is shown at (card and frame from tablet up)
const SHAPE = 16 / 10;
const SHAPE_SLACK = 0.03;

const src = join(page, 'img', '_raw');
const out = join(page, 'img');
if (!existsSync(src)) fail('No Raw Folder', path(src, process.stderr));

// preview.png, preview_full.jpg and preview_20261115.png all ship as
// `preview`; preview_review_app_01.png ships under its own name
const nameOf = (file) => siteName(file).replace(/_full$/, '');
const jobOf = (name) => Object.keys(PAGE_WIDTHS).find((job) => name === job || name.startsWith(`${job}_`));
const files = (await filesIn(src, RAW_STILL)).filter((file) => jobOf(nameOf(file)));
if (!files.length) {
  fail('No Raw Images', `Expected names starting ${Object.keys(PAGE_WIDTHS).join(' or ')} (JPG, PNG or TIF) in ${path(src, process.stderr)}`);
}

// Two raws that ship under one name would overwrite each other
const byName = Object.groupBy(files, nameOf);
const clashes = Object.entries(byName).filter(([, group]) => group.length > 1);
if (clashes.length) {
  fail('Raw Images Share a Site Name', clashes.map(([name, group]) => `${name}: ${group.join(', ')}`).join('\n'));
}
console.log(heading('Page Images'), path(page));

for (const file of files) {
  const input = join(src, file);
  const name = nameOf(file);
  const widths = PAGE_WIDTHS[jobOf(name)] ?? ALL_WIDTHS;
  const size = await sizeOf(input);
  const ratio = size.width / size.height;
  if (!/^[a-z0-9_]+$/.test(name)) console.warn(warn(`Warning: ${name}: use lowercase and underscores only`, process.stderr));
  await Promise.all(widths.map((width) => saveResized({input, output: join(out, `${name}_${width}.jpg`), width, quality})));
  console.log(ok(name), dim(`${file}, ${size.width} x ${size.height} -> ${widths.join(', ')}`));
  if (Math.abs(ratio / SHAPE - 1) > SHAPE_SLACK) {
    console.warn(warn(`Warning: ${name} is ${ratio.toFixed(2)}:1, shown at 1.60:1 (16:10); the frame crops the rest from the center`, process.stderr));
  }
  if (size.width < widths.at(-1)) {
    console.warn(warn(`Warning: ${name} is ${size.width} px wide; the ${widths.at(-1)} file stays at ${size.width} (never enlarged), so 2x screens get a softer image`, process.stderr));
  }
}
console.log(ok(`${files.length} ${files.length === 1 ? 'image' : 'images'} ->`), path(out));
