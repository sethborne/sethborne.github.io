// QR codes: a page's downloaded QR image -> img/qr.svg, for the "Open on
// Your Phone" card under its frame (a visitor on a computer scans it to
// try the app on a phone).
//
// Usage (from the repo root, any shell; `npm install` once first):
//   npm run qr -- content/projects/gis/textile-contacts/public-map [more page folders]
//
// Reads   <page>/img/_raw/qr_code/<any name>.png    the code as downloaded from
//                                                   Survey123 / Experience Builder
//                                                   (JPG too; one file; gitignored)
// Writes  <page>/img/qr.svg                         black squares on a transparent
//                                                   background, with the standard
//                                                   4-square quiet zone
//
// Then in the page's index.js: content: {link: ..., qr: qrCode(import.meta.url)}
//
// Why redraw instead of shipping the download: the downloads come at
// odd sizes, some light on dark with no quiet zone, and blur when
// scaled. The SVG is sharp at any size, and the page colors it (it's a
// CSS mask, so only its shapes count; a white background would fill
// the whole square). Re-running overwrites.
//
// Share the app with Everyone first: a code that opens a sign-in page
// is the app's sharing, not the code (2026-11-24). Check with your
// phone's camera, which shows the link before you open it.

import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {filesIn} from './image_resize.mjs';
import {dim, fail, heading, ok, path} from './term.mjs';

const USAGE = 'Usage: npm run qr -- <page folder> [more page folders]';
const pages = process.argv.slice(2);
if (!pages.length) fail('No Page Folder', USAGE);

// The empty border every reader expects, in squares (the QR standard's 4)
const QUIET = 4;

// Read the code's grid of squares from a picture of it: threshold to
// black and white, flip it if it's light on dark, find the code's box,
// take the square size from the top left finder (the big corner square,
// always 7 squares wide), then sample the middle of every square
const readGrid = async (file) => {
  const {data, info} = await sharp(file).flatten({background: '#fff'}).greyscale().raw().toBuffer({resolveWithObject: true});
  const {width: W, height: H} = info;
  const raw = (x, y) => data[y * W + x] < 128;
  // A quiet zone is always light, so three dark corners mean inverted
  const darkCorners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].filter(([x, y]) => raw(x, y)).length;
  const inverted = darkCorners >= 3;
  const dark = inverted ? (x, y) => !raw(x, y) : raw;
  let [x0, y0, x1, y1] = [W, H, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dark(x, y)) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  let run = 0;
  while (dark(x0 + run, y0 + 1)) run++;
  const n = Math.round((x1 - x0 + 1) / (run / 7));
  const step = (x1 - x0 + 1) / n;
  const squares = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (dark(Math.round(x0 + (i + 0.5) * step), Math.round(y0 + (j + 0.5) * step))) squares.push([i, j]);
    }
  }
  return {n, squares, inverted, source: `${W} x ${H}`};
};

const svgOf = ({n, squares}, file) => {
  const total = n + 2 * QUIET;
  // One path, a short "move, 1 right, 1 down, 1 left" per square: smaller
  // than a rect each
  const d = squares.map(([i, j]) => `M${i + QUIET} ${j + QUIET}h1v1h-1z`).join('');
  return `<!-- QR code, redrawn from img/_raw/qr_code/${file} by tools/qr_codes.mjs (npm run qr). Never hand-edit -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><path d="${d}"/></svg>\n`;
};

console.log(heading('QR Codes'));
for (const page of pages) {
  const src = join(page, 'img', '_raw', 'qr_code');
  const files = await filesIn(src, /\.(png|jpe?g)$/i).catch(() => []);
  if (files.length !== 1) {
    fail('Expected One QR Image', `${path(src, process.stderr)} has ${files.length} (PNG or JPG)`);
  }
  const [file] = files;
  const grid = await readGrid(join(src, file));
  // Every QR size is 21, 25, 29 ... squares (version 1 + 4 per version):
  // anything else means the picture was read wrong
  if ((grid.n - 17) % 4 !== 0 || grid.n < 21) {
    fail('Not a QR Grid', `${file}: read ${grid.n} squares across, not a QR size. Is the image cropped or blurry?`);
  }
  const output = join(page, 'img', 'qr.svg');
  await mkdir(join(page, 'img'), {recursive: true});
  await writeFile(output, svgOf(grid, file));
  const flipped = grid.inverted ? ', was light on dark' : '';
  console.log(ok('wrote'), path(output), dim(`${grid.n} x ${grid.n} squares (version ${(grid.n - 17) / 4}), from ${file}, ${grid.source}${flipped}`));
}
