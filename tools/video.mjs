// Video: a page's raw videos -> web-ready MP4s + poster images.
//   npm run video -- content/projects/vis/hines-westbrook-station
//
// Reads   <page>/img/_raw/living_renders/*.mp4|mov   (gitignored)
//         <page>/img/_raw/animation/*.mp4|mov
// Writes  <page>/img/video/<name>_1280.mp4           H.264 MP4, index at the front
//                                                    (+faststart: plays before it's
//                                                    all downloaded)
//         <page>/img/video/<name>_poster_800.jpg     first frame, for the grid
//         <page>/img/video/<name>_poster_1280.jpg    and before playback starts
//
// The folder says what kind of video it is (KINDS below): living renders
// are short silent loops, so their sound track is dropped; an animation
// keeps its sound. <name> is the raw name minus a trailing _YYYYMMDD date
// (siteName, like the gallery) and a resolution tag (_720p), so
// hines_westbrook_view_01_20160126.mp4 -> hines_westbrook_view_01_1280.mp4.
//
// Posters come from the first frame. A video that opens on black (a
// fade-in) names a better moment in <page>/img/_raw/video_posters.json,
// by site name: {"hines_westbrook_animation": "0:40"} (m:ss or seconds).
// It sits with the raws, so a --force rerun keeps it.
//
// Encoding is slow (a minute or more per video), so a video whose MP4 is
// newer than its raw is skipped; --force redoes every one. Posters are
// quick, so they're remade on every run.
// Options:
//   --force             re-encode even when the MP4 is up to date
//   --crf 23            quality: lower = better and bigger (18 to 28 is sensible)
//
// Needs ffmpeg-static (a devDependency, like sharp: on this PC only,
// nothing from it ships).

import {spawn} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpeg from 'ffmpeg-static';
import {filesIn, readArgs, saveResized, siteName} from './image_resize.mjs';
import {dim, fail, heading, ok, path, warn} from './term.mjs';

const USAGE = 'Usage: npm run video -- <page folder> [--force] [--crf 23]';
const {page, force, crf} = readArgs(USAGE, {force: false, crf: 23});

// Raw folder -> how its videos are made. `maxrate` caps the bitrate so a
// busy scene can't balloon the file; `audio` keeps or drops the sound.
const KINDS = {
  living_renders: {width: 1280, maxrate: '4M', audio: false},
  animation: {width: 1280, maxrate: '2.5M', audio: true},
};
const POSTER_WIDTHS = [800, 1280];

const raw = join(page, 'img', '_raw');
const out = join(page, 'img', 'video');
if (!existsSync(raw)) fail('No Raw Folder', path(raw, process.stderr));
console.log(heading('Video'), path(page));
await mkdir(out, {recursive: true});

// {site name: 'm:ss' or seconds}; a missing file means first frames
const postersFile = join(raw, 'video_posters.json');
const posterTimes = existsSync(postersFile) ? JSON.parse(readFileSync(postersFile, 'utf8')) : {};

// Runs ffmpeg with `args`; rejects with its last lines of output on failure
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let errors = '';
    child.stderr.on('data', (chunk) => (errors += chunk));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(errors.trim().split('\n').slice(-3).join('\n')))));
  });

// Poster: one frame at `at` (-ss before -i seeks fast), out to a temp
// PNG, then the usual widths
const makePoster = async (input, name, at) => {
  const frame = join(tmpdir(), `${name}_frame.png`);
  await run(['-ss', at, '-i', input, '-frames:v', '1', frame]);
  await Promise.all(
    POSTER_WIDTHS.map((w) => saveResized({input: frame, output: join(out, `${name}_poster_${w}.jpg`), width: w})),
  );
  await rm(frame, {force: true});
};

const megabytes = async (file) => `${((await stat(file)).size / 1e6).toFixed(1)} MB`;
const isNewer = async (a, b) => existsSync(a) && (await stat(a)).mtimeMs > (await stat(b)).mtimeMs;

let made = 0;
let skipped = 0;
for (const [folder, {width, maxrate, audio}] of Object.entries(KINDS)) {
  const src = join(raw, folder);
  if (!existsSync(src)) continue;
  for (const file of await filesIn(src, /\.(mp4|mov)$/i)) {
    const input = join(src, file);
    const name = siteName(file).replace(/_\d{3,4}p$/, '');
    const video = join(out, `${name}_${width}.mp4`);
    const at = String(posterTimes[name] ?? 0);
    if (!force && (await isNewer(video, input))) {
      await makePoster(input, name, at);
      console.log(dim(`${name}: up to date (--force to redo); poster at ${at}`));
      skipped++;
      continue;
    }
    // Never wider than the raw (scale only shrinks); even height for H.264
    await run([
      '-i', input,
      '-vf', `scale='min(${width},iw)':-2`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
      '-maxrate', maxrate, '-bufsize', `${parseFloat(maxrate) * 2}M`,
      '-pix_fmt', 'yuv420p',
      ...(audio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
      '-movflags', '+faststart',
      video,
    ]);
    await makePoster(input, name, at);
    console.log(ok(name), dim(`${folder}, ${await megabytes(input)} -> ${await megabytes(video)}${audio ? '' : ', no sound'}, poster at ${at}`));
    made++;
  }
}

if (!made && !skipped) console.warn(warn(`No videos in ${Object.keys(KINDS).join('/ or ')}/`, process.stderr));
console.log(`${made} made, ${skipped} up to date ->`, path(out));
