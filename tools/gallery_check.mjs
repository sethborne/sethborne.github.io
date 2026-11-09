// Gallery check: reads a page's raw stills and its gallery outputs, and
// reports per image whether every size was made right. Writes no images.
// Run through the gallery tool (gallery_images.mjs):
//
//   npm run gallery -- <page> --check          files only: were they made right?
//   npm run gallery -- <page> --check --used   + the page's index.js: are they used right?
//   ... --log                                  also writes img/_raw/gallery/_logs/YYYYMMDD_HHMMSS_gallery_check.md
//
// Status per image is its worst check: OK (green), Caution (yellow: works,
// but worth a look), Problem (red: a missing or wrong file). Exit code 1
// if any image has a Problem.

import {existsSync} from 'node:fs';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {join, parse, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
import {filesIn, sizeOf} from './image_resize.mjs';
import {bad, dim, fail, heading, ok, path, warn} from './term.mjs';

const NAME_RULE = /^[a-z0-9_]+$/;
// <name>_<width>.jpg or <name>_full.jpg
const OUTPUT = /^(.+)_(\d+|full)\.jpg$/;
const RANK = {ok: 0, caution: 1, problem: 2};
const LABEL = {ok: 'OK', caution: 'Caution', problem: 'Problem'};

// ---------------------------------------------------------------- reading

const fileInfo = async (file) => ({...(await sizeOf(file)), mtime: (await stat(file)).mtimeMs});

// {name: {width, height, mtime}} for every .jpg in the raw folder
const readRaws = async (dir) => {
  if (!existsSync(dir)) return {};
  const files = await filesIn(dir, /\.jpe?g$/i);
  return Object.fromEntries(await Promise.all(files.map(async (file) => [parse(file).name, await fileInfo(join(dir, file))])));
};

// {name: {800: info, ..., full: info}} for every output file
const readOutputs = async (dir) => {
  if (!existsSync(dir)) return {};
  const outputs = {};
  for (const file of await filesIn(dir, OUTPUT)) {
    const [, name, size] = file.match(OUTPUT);
    outputs[name] = {...outputs[name], [size]: await fileInfo(join(dir, file))};
  }
  return outputs;
};

// The page's own galleries (content.gallery, each section's gallery): the
// names they list (compare images too) and the widths they load. A gallery
// whose base isn't this page's img/gallery/ belongs to another page.
const readUsage = async (page) => {
  const index = pathToFileURL(resolve(page, 'index.js'));
  if (!existsSync(index)) return null;
  const {default: node} = await import(index.href);
  const base = new URL('img/gallery/', index).href;
  const galleries = [node.content?.gallery, ...(node.sections ?? []).map((section) => section.gallery)].filter(
    (gallery) => gallery?.base === base,
  );
  if (!galleries.length) return null;
  return {
    names: new Set(galleries.flatMap(({images}) => images.flatMap(({name, compare}) => [name, compare].filter(Boolean)))),
    widths: [...new Set(galleries.flatMap(({widths}) => widths))].sort((a, b) => a - b),
  };
};

// ---------------------------------------------------------------- checks

// One image: a cell per size (ok, bad, capped, none) and notes
// ({level, text}). listed: true/false from index.js, or null without --used.
export const checkImage = ({name, raw, outputs = {}, widths, listed}) => {
  const cells = {};
  const notes = [];
  const note = (level, text) => notes.push({level, text});
  const sizes = [...widths, 'full'];
  const hasOutputs = Object.keys(outputs).length > 0;

  const missingNote = (missing) => note('problem', `${missing.map((size) => `_${size}`).join(', ')} missing`);

  if (raw && !hasOutputs) {
    for (const size of sizes) cells[size] = 'bad';
    note('problem', 'no outputs yet: run npm run gallery');
    if (listed === false) note('caution', 'not in index.js');
  } else if (raw) {
    const missing = sizes.filter((size) => !outputs[size]);
    if (missing.length) missingNote(missing);
    for (const size of sizes) {
      const out = outputs[size];
      const target = size === 'full' ? raw.width : Math.min(size, raw.width);
      if (!out) {
        cells[size] = 'bad';
        continue;
      }
      const height = Math.round((out.width * raw.height) / raw.width);
      if (out.width !== target) {
        cells[size] = 'bad';
        note('problem', `_${size} is ${out.width} px wide, expected ${target}`);
      } else if (Math.abs(out.height - height) > 1) {
        cells[size] = 'bad';
        note('problem', `_${size} is ${out.width}×${out.height}, not the raw's shape`);
      } else {
        cells[size] = size !== 'full' && size > raw.width ? 'capped' : 'ok';
      }
    }
    if (raw.width < Math.max(...widths)) note('caution', `raw is ${raw.width} px: larger sizes are capped at it`);
    const oldest = Math.min(...Object.values(outputs).map(({mtime}) => mtime));
    if (hasOutputs && oldest < raw.mtime) note('caution', 'older than its raw: rerun npm run gallery');
    if (listed === false) note('caution', 'not in index.js');
  } else {
    for (const size of sizes) cells[size] = outputs[size] ? 'ok' : listed ? 'bad' : 'none';
    if (listed && !hasOutputs) note('problem', 'in index.js, but no files');
    else if (listed) {
      const missing = sizes.filter((size) => !outputs[size]);
      if (missing.length) missingNote(missing);
      note('ok', 'no raw here (fine: raws stay local)');
    } else note('caution', 'leftover: no raw image, would still ship');
  }
  if (!NAME_RULE.test(name)) note('caution', 'name: use lowercase and underscores only');

  const status = notes.reduce((worst, {level}) => (RANK[level] > RANK[worst] ? level : worst), 'ok');
  return {name, cells, notes, status};
};

// ---------------------------------------------------------------- output

const CELL = {ok: '✓', bad: '✗', capped: '~', none: '·'};
const paintCell = {ok, bad, capped: warn, none: dim};
const paintLevel = {ok: dim, caution: warn, problem: bad};
const paintStatus = {ok, caution: warn, problem: bad};

const counts = (rows) => Object.fromEntries(Object.keys(RANK).map((level) => [level, rows.filter(({status}) => status === level).length]));
const plural = (n, word) => `${n} ${word}${n === 1 || word === 'OK' ? '' : 's'}`;

// Pads by the visible length, so color codes don't throw off the columns
const pad = (text, width) => text + ' '.repeat(Math.max(0, width - stripVTControlCharacters(text).length));

const table = (rows, sizes) => {
  const head = ['Image', ...sizes.map(String), 'Notes'];
  const body = rows.map(({name, cells, notes, status}) => [
    paintStatus[status](name),
    ...sizes.map((size) => paintCell[cells[size]](CELL[cells[size]])),
    notes.map(({level, text}) => paintLevel[level](text)).join(dim('; ')),
  ]);
  const widths = head.map((title, i) => Math.max(title.length, ...body.map((row) => stripVTControlCharacters(row[i]).length)));
  const line = (cells) => cells.map((cell, i) => (i === cells.length - 1 ? cell : pad(cell, widths[i]))).join('  ');
  return [dim(line(head)), ...body.map(line)].join('\n');
};

const summary = (rows, paint = true) => {
  const n = counts(rows);
  const parts = [
    [plural(n.ok, 'OK'), ok],
    [plural(n.caution, 'Caution'), warn],
    [plural(n.problem, 'Problem'), bad],
  ];
  return parts.map(([text, color]) => (paint ? color(text) : text)).join(paint ? dim(' · ') : ', ');
};

const markdown = ({rows, sizes, page, usage, date}) =>
  [
    `# Gallery Check, ${date}`,
    '',
    `- Page: \`${page}\``,
    `- Checked: ${usage ? 'files and usage (index.js)' : 'files only'}`,
    `- Sizes: ${sizes.join(', ')}`,
    `- Result: ${summary(rows, false)}`,
    '',
    `| Image | Status | ${sizes.join(' | ')} | Notes |`,
    `|---|---|${sizes.map(() => ':-:').join('|')}|---|`,
    ...rows.map(
      ({name, cells, notes, status}) =>
        `| \`${name}\` | ${LABEL[status]} | ${sizes.map((size) => CELL[cells[size]]).join(' | ')} | ${notes.map(({text}) => text).join('; ')} |`,
    ),
    '',
    `Key: ✓ right size, ✗ missing or wrong, ~ capped at the raw's width, · not made (no raw)`,
    '',
  ].join('\n');

// ---------------------------------------------------------------- run

// YYYYMMDD_HHMMSS in local time, 24-hour: sorts by name in run order
const two = (n) => String(n).padStart(2, '0');
const stamp = (d) =>
  `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}_${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;

export const runCheck = async ({page, widths, used, log}) => {
  const rawDir = join(page, 'img', '_raw', 'gallery');
  const outDir = join(page, 'img', 'gallery');
  const usage = used ? await readUsage(page) : null;
  const sizesWide = usage?.widths ?? widths;
  const [raws, outputs] = await Promise.all([readRaws(rawDir), readOutputs(outDir)]);

  const names = [...new Set([...Object.keys(raws), ...Object.keys(outputs), ...(usage?.names ?? [])])].sort();
  if (!names.length) fail('Nothing to Check', `no raw images in ${path(rawDir, process.stderr)}, no outputs in ${path(outDir, process.stderr)}`);

  console.log(heading('Gallery Check'), path(page));
  if (used && !usage) console.log(dim('No gallery in index.js yet: usage check skipped.'));
  console.log();

  const rows = names.map((name) =>
    checkImage({name, raw: raws[name], outputs: outputs[name], widths: sizesWide, listed: usage ? usage.names.has(name) : null}),
  );
  const sizes = [...sizesWide, 'full'];
  console.log(table(rows, sizes));
  console.log(`\n${summary(rows)}`);

  if (log) {
    const now = new Date();
    const date = now.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
    const logDir = join(rawDir, '_logs');
    const file = join(logDir, `${stamp(now)}_gallery_check.md`);
    await mkdir(logDir, {recursive: true});
    await writeFile(file, markdown({rows, sizes, page, usage, date}), 'utf8');
    console.log(ok('Log:'), path(file));
  }
  process.exitCode = rows.some(({status}) => status === 'problem') ? 1 : 0;
};
