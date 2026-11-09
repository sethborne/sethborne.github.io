"""Terminal colors for the Python tools (copy_sync.py, resume_readme.py).

Every tool prints through these helpers, so a color means the same thing
everywhere (tools/term.mjs is the Node twin, same names):

  heading(text)      bold white on green   a section, page or tool start
  heading_bad(text)  bold white on red     a run that failed
  ok(text)           green                 success: matches, wrote a file
  bad(text)          red                   an error that stops the run
  warn(text)         yellow                a warning; the run goes on
  path(text)         cyan                  a file or folder path
  dim(text)          gray                  sizes, counts, hints
  diff_line(line)    + green, - red, @@ gray
  paired(diff)       a diff's lines with each - beside its + (not a color)

Each helper returns a string; pass stream=sys.stderr for text that goes
to stderr. Color is off when the stream isn't a terminal (piped or saved
to a file) or NO_COLOR is set; FORCE_COLOR turns it on, and wins over
NO_COLOR. Standard library
only: colors are ANSI escape codes, ESC[...m.
"""

import os
import sys

# The old Windows console shows escape codes as text until a program
# turns them on; any os.system call does that (VS Code's terminal and
# Windows Terminal don't need it)
if os.name == 'nt':
    os.system('')

CODES = {
    'heading': '1;97;42',      # bold, bright white, green background
    'heading_bad': '1;97;41',  # bold, bright white, red background
    'ok': '32',
    'bad': '31',
    'warn': '33',
    'path': '36',
    'dim': '90',
}


def enabled(stream=sys.stdout):
    # FORCE_COLOR first, as Node's styleText does, so both helpers agree
    if os.environ.get('FORCE_COLOR'):
        return True
    if os.environ.get('NO_COLOR'):
        return False
    return hasattr(stream, 'isatty') and stream.isatty()


def paint(style, text, stream=sys.stdout):
    return f'\x1b[{CODES[style]}m{text}\x1b[0m' if enabled(stream) else text


def heading(text, stream=sys.stdout):
    return paint('heading', f' {text} ', stream)


def heading_bad(text, stream=sys.stdout):
    return paint('heading_bad', f' {text} ', stream)


def ok(text, stream=sys.stdout):
    return paint('ok', text, stream)


def bad(text, stream=sys.stdout):
    return paint('bad', text, stream)


def warn(text, stream=sys.stdout):
    return paint('warn', text, stream)


def path(text, stream=sys.stdout):
    return paint('path', str(text), stream)


def dim(text, stream=sys.stdout):
    return paint('dim', text, stream)


def diff_line(line, stream=sys.stdout):
    """A unified diff line: + green, - red, @@ gray (file headers too)."""
    if line.startswith(('+++', '---', '@@')):
        return dim(line, stream)
    if line.startswith('+'):
        return ok(line, stream)
    if line.startswith('-'):
        return bad(line, stream)
    return line


def paired(diff):
    """A unified diff with each changed line's - and + side by side.

    unified_diff prints a changed block as all its - lines, then all its
    + lines. When a block has as many of each, line N was replaced by
    line N, so they're printed in pairs (old, new, old, new) to read
    together. A block with more of one (a line added or removed) keeps
    its order, since pairing it would set unrelated lines side by side."""
    out, minus, plus = [], [], []

    def flush():
        if len(minus) == len(plus):
            out.extend(line for pair in zip(minus, plus) for line in pair)
        else:
            out.extend(minus + plus)
        minus.clear()
        plus.clear()

    for line in diff:
        if line.startswith('-') and not line.startswith('---'):
            if plus:  # a - after +'s starts a new block
                flush()
            minus.append(line)
        elif line.startswith('+') and not line.startswith('+++'):
            plus.append(line)
        else:
            flush()
            out.append(line)
    flush()
    return out


def fail(title, message=''):
    """Red heading (+ the message in red) on stderr, then exit 1. A path in
    the message: pass path(p, sys.stderr), which stays cyan inside the red."""
    print(heading_bad(title, sys.stderr), file=sys.stderr)
    if message:
        print(bad(message, sys.stderr), file=sys.stderr)
    sys.exit(1)
