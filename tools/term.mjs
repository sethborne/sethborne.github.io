// Terminal colors for the Node tools (gallery_images.mjs,
// turntable_frames.mjs). Every tool prints through these helpers, so a
// color means the same thing everywhere (tools/term.py is the Python
// twin, same meanings):
//
//   heading(text)      bold white on green   a section, page or tool start
//   headingBad(text)   bold white on red     a run that failed
//   ok(text)           green                 success: wrote a file, done
//   bad(text)          red                   an error that stops the run
//   warn(text)         yellow                a warning; the run goes on
//   path(text)         cyan                  a file or folder path
//   dim(text)          gray                  sizes, counts, hints
//   diffLine(line)     + green, - red, @@ gray
//
// Built on styleText (node:util), Node's own chalk: no dependency. It
// leaves the text plain when the stream isn't a terminal (piped or saved
// to a file) or NO_COLOR is set; FORCE_COLOR turns it on. Each helper
// takes the stream it's headed for; the default is stdout.

import {styleText} from 'node:util';

const paint =
  (format) =>
  (text, stream = process.stdout) =>
    styleText(format, text, {stream});

const greenBar = paint(['bold', 'whiteBright', 'bgGreen']);
const redBar = paint(['bold', 'whiteBright', 'bgRed']);

export const heading = (text, stream) => greenBar(` ${text} `, stream);
export const headingBad = (text, stream) => redBar(` ${text} `, stream);
export const ok = paint('green');
export const bad = paint('red');
export const warn = paint('yellow');
export const path = paint('cyan');
export const dim = paint('gray');

export const diffLine = (line, stream) => {
  if (/^(\+\+\+|---|@@)/.test(line)) return dim(line, stream);
  if (line.startsWith('+')) return ok(line, stream);
  if (line.startsWith('-')) return bad(line, stream);
  return line;
};

// Red heading (+ the message in red) on stderr, then exit 1: for problems
// the user can fix (a missing folder, a bad argument), where a stack
// trace would only bury the message. A path in the message: pass
// path(p, process.stderr), which stays cyan inside the red
export const fail = (title, message = '') => {
  console.error(headingBad(title, process.stderr));
  if (message) console.error(bad(message, process.stderr));
  process.exit(1);
};
