// Shared helpers for the image tools (gallery_images.mjs,
// turntable_frames.mjs). Not run on its own.
// sharp (npm devDependency, `npm install` once): resizes on your PC only;
// nothing from node_modules/ ships with the site.

import {mkdir, readdir} from 'node:fs/promises';
import {basename, dirname, extname} from 'node:path';
import {parseArgs} from 'node:util';
import sharp from 'sharp';
import {fail} from './term.mjs';

// Resize one image to `width` px wide (0 or none = keep its own size;
// never wider than the source).
//   smooth  true: Lanczos + JPG at `quality` (renders, photos)
//           false: nearest neighbor + PNG (ID passes: every pixel keeps
//           its exact color, since a blend of two would match neither)
export const saveResized = async ({input, output, width, smooth = true, quality = 78}) => {
  await mkdir(dirname(output), {recursive: true});
  const image = sharp(input).resize({
    width: width || undefined,
    withoutEnlargement: true,
    kernel: smooth ? 'lanczos3' : 'nearest',
  });
  await (smooth ? image.jpeg({quality}) : image.png()).toFile(output);
};

// The name a raw file ships under: its name minus the extension and a
// trailing _YYYYMMDD date, so raws keep their dates and the site's file
// names stay clean (hines_westbrook_view_01_20150630.jpg ->
// hines_westbrook_view_01). Shared by gallery_images and gallery_check.
export const siteName = (file) => basename(file, extname(file)).replace(/_\d{8}$/, '');

export const widthOf = async (path) => (await sharp(path).metadata()).width;

export const sizeOf = async (path) => {
  const {width, height} = await sharp(path).metadata();
  return {width, height};
};

// Files in a folder whose names match `pattern`, sorted by name
export const filesIn = async (folder, pattern) =>
  (await readdir(folder, {withFileTypes: true}))
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

export const foldersIn = async (folder, pattern) =>
  (await readdir(folder, {withFileTypes: true}))
    .filter((entry) => entry.isDirectory() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

// Run `task` on every item, at most `limit` at once (sharp works on
// several threads; hundreds of frames at once would just queue in memory)
export const eachLimited = async (items, limit, task) => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await task(items[i], i);
    }
  };
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
};

// Command line: the page folder first, then --options. `options` maps a
// name to its default; a number default parses the value as a number, an
// array default as a comma list of numbers (--widths 800,1280), and a
// `false` default makes an on/off flag (--check).
export const readArgs = (usage, options) => {
  const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(
      Object.entries(options).map(([name, fallback]) => [name, {type: fallback === false ? 'boolean' : 'string'}]),
    ),
  });
  if (positionals.length !== 1) fail('Needs One Page Folder', usage);
  const parse = (name, fallback) => {
    const value = values[name];
    if (value === undefined) return fallback;
    if (Array.isArray(fallback)) return value.split(',').map(Number);
    return typeof fallback === 'number' ? Number(value) : value;
  };
  return {
    page: positionals[0],
    ...Object.fromEntries(Object.entries(options).map(([name, fallback]) => [name, parse(name, fallback)])),
  };
};
