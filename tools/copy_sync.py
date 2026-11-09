"""Sync each page's copy between its Word doc and the site.

Every page is a folder under content/projects/<field>/<project>/ holding
index.js (structure), <id>.docx (copy, edited in Word, gitignored) and
copy.js (generated here; index.js reads it through fromCopy() in
content/helpers.js). The doc is the source of truth: never hand-edit copy.js.

    python tools/copy_sync.py [project] --check    # diff + writing check, changes nothing
    python tools/copy_sync.py [project] --write    # regenerate copy.js files from the docs
    python tools/copy_sync.py [project] --export   # build missing docs from the site (--force: all)

Add --log to --check or --write to also keep a Markdown record of the run
(diffs + warnings) in <project folder>/_logs/YYYYMMDD_HHMMSS_copy_sync.md,
one file per project per run (gitignored).

[project] is a project id (textile-resale-economy); leave it out for every
project. Each command covers the project's page folders at every depth.

Doc layout (the guide at the top of every exported doc repeats this):
- Anything before the first Heading 2 is ignored (title + guide).
- Heading 2: one field (FIELDS below). Each non-empty paragraph under it
  is one item.
- Sections nests, like the page's `sections` in index.js: a Heading 3 per
  section (its heading), then one paragraph of intro (optional), then a
  Heading 4 per piece with copy (Gallery: one "Title: caption" per image;
  a compare pair may add " | Before | After", its own two labels).
  Bullets, numbers and indents are formatting only; parsing reads the
  heading levels and the text.
- Comments and tracked deletions are ignored; tracked insertions count.

Standard library only (zipfile + xml), plus Node to read the site's
content tree for --export and the page check.
"""

import argparse
import difflib
from datetime import datetime
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

from term import diff_line, dim, fail, heading, ok, paired, path, warn

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / 'content' / 'projects'

# Doc heading -> key in copy.js (a dot nests it) -> how paragraphs become a value.
#   text:   one paragraph is a string, several are an array (writeup rule)
#   list:   always an array
#   action: array of {lead, text}, split at the first ': '
#   links:  array of {label, href}, from Word hyperlinks
#   titled: array of {title, text?, labels?}: "Title" or "Title: text". Gallery: a
#           title + caption per image, in the order index.js lists them; a
#           compare pair may end in " | Before | After" (its own two labels)
#   sections: array of {title, text?, <piece copy>}, nested (see below)
FIELDS = [
    ('Title', 'title', 'text'),
    ('Summary', 'summary', 'text'),
    ('Try This', 'content.tryThis', 'text'),
    ('Sections', 'sections', 'sections'),
    # The page's own gallery (content.gallery); a section's goes under it
    ('Gallery', 'gallery', 'titled'),
    ('Open Label', 'content.openLabel', 'text'),
    ('Links Title', 'linksTitle', 'text'),
    ('Links', 'links', 'links'),
    ('TL;DR', 'writeup.tldr', 'list'),
    ('Stack', 'writeup.stack', 'list'),
    ('Situation', 'writeup.situation', 'text'),
    ('Task', 'writeup.task', 'text'),
    ('Action', 'writeup.action', 'action'),
    ('Result', 'writeup.result', 'text'),
]
FIELD_BY_HEADING = {heading.lower(): (key, kind) for heading, key, kind in FIELDS}
FIELD_NAMES = ', '.join(heading for heading, _, _ in FIELDS)
# Inside Sections, the Heading 4s a section may hold: its piece's copy.
# Sections pair with index.js's `sections` by position, and each piece's
# items with that piece's list (a gallery's images) by position.
SECTION_PIECES = [
    ('Gallery', 'gallery', 'titled'),
]
PIECE_BY_HEADING = {heading.lower(): (key, kind) for heading, key, kind in SECTION_PIECES}
PIECE_NAMES = ', '.join(heading for heading, _, _ in SECTION_PIECES)
# Skeleton for a new page's doc
NEW_PAGE_FIELDS = ['title', 'summary']

# Writing rules (CLAUDE.md) and leftover placeholders. Warnings only.
LINT = [
    (re.compile('[—–]'), 'em or en dash (use a comma or restructure)'),
    (re.compile('--'), 'double hyphen'),
    (re.compile(r'\[\?\]'), '[?] still to confirm'),
    (re.compile(r'\bx,xxx\b'), 'x,xxx placeholder'),
    (re.compile('  '), 'double space'),
    (re.compile(r"(?<=\w)'(?=\w)"), "straight apostrophe (use ’)"),
]

# Fields shown as titles, headings or button labels: Title Case
# (CLAUDE.md → Writing rules). These small words may stay lowercase
# anywhere but first and last.
TITLE_CASE_KEYS = {'title', 'content.openLabel', 'linksTitle', 'links'}
SMALL_WORDS = {
    'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
    'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via',
}


def not_title_case(text):
    """Words that should be capitalized but aren't: 'Data pipeline' -> ['pipeline']."""
    words = re.findall(r"[A-Za-z][\w.’'-]*", text)
    last = len(words) - 1
    return [
        word for i, word in enumerate(words)
        if word[0].islower() and not (0 < i < last and word in SMALL_WORDS)
    ]

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'


def w(tag):
    return f'{{{W}}}{tag}'


class CopyError(Exception):
    """A problem in a doc or the tree that stops the command."""


# ---------------------------------------------------------------- folders


def find_projects(project_id):
    """Project folders (content/projects/<field>/<id>/), one or all."""
    projects = sorted(p.parent for p in PROJECTS.glob('*/*/index.js'))
    if project_id:
        projects = [p for p in projects if p.name == project_id]
        if not projects:
            raise CopyError(f'No project folder named {project_id!r} in content/projects/<field>/')
    return projects


def page_folders(project):
    """Every page folder in a project: the project itself, then its pages, by path."""
    return sorted((p.parent for p in project.rglob('index.js')), key=lambda f: f.parts)


def page_path(folder):
    """Folder -> page path as ids: [project, child, ...] (the field folder isn't part of it)."""
    field = next(p for p in folder.parents if p.parent == PROJECTS)
    return list(folder.relative_to(field).parts)


def label(folder):
    return ' / '.join(page_path(folder))


# ---------------------------------------------------------------- reading the doc


def para_style(p):
    style = p.find(f'{w("pPr")}/{w("pStyle")}')
    return style.get(w('val')) if style is not None else ''


def para_text(p):
    """Visible text, skipping tracked deletions and moved-away text."""
    out = []

    def walk(node):
        if node.tag in (w('del'), w('moveFrom')):
            return
        if node.tag == w('t'):
            out.append(node.text or '')
        elif node.tag in (w('tab'), w('br'), w('cr')):
            out.append(' ')
        elif node.tag == w('noBreakHyphen'):
            out.append('-')
        for child in node:
            walk(child)

    walk(p)
    return ''.join(out).replace(' ', ' ').strip()


def para_href(p, rels):
    """The first link in a paragraph: a hyperlink element or a HYPERLINK field."""
    for link in p.iter(w('hyperlink')):
        rid = link.get(f'{{{R}}}id')
        if rid in rels:
            return rels[rid]
    codes = [n.text or '' for n in p.iter(w('instrText'))]
    codes += [n.get(w('instr'), '') for n in p.iter(w('fldSimple'))]
    for code in codes:
        match = re.search(r'HYPERLINK\s+"([^"]+)"', code)
        if match:
            return match.group(1)
    return None


def read_doc(path):
    """[(style, text, href)] for each top-level paragraph of the doc."""
    with zipfile.ZipFile(path) as z:
        body = ET.fromstring(z.read('word/document.xml')).find(w('body'))
        rels_xml = ET.fromstring(z.read('word/_rels/document.xml.rels'))
    rels = {r.get('Id'): r.get('Target') for r in rels_xml}
    return [
        (para_style(p), para_text(p), para_href(p, rels))
        for p in body.findall(w('p'))
    ]


def to_value(kind, items, where):
    if kind == 'text':
        texts = [text for text, _ in items]
        return texts[0] if len(texts) == 1 else texts
    if kind == 'list':
        return [text for text, _ in items]
    if kind == 'action':
        out = []
        for text, _ in items:
            lead, sep, rest = text.partition(': ')
            if not sep:
                raise CopyError(f'{where}: Action item needs "Lead: text": {text!r}')
            out.append({'lead': lead, 'text': rest})
        return out
    if kind == 'titled':
        out = []
        for text, _ in items:
            # " | A | B" at the end: a compare pair's own layer names
            main, *labels = text.split(' | ')
            labels = [label.strip() for label in labels]
            if labels and (len(labels) != 2 or not all(labels)):
                raise CopyError(f'{where}: a compare pair takes exactly two labels, "Title: caption | Before | After": {text!r}')
            title, sep, rest = main.partition(': ')
            item = {'title': title, 'text': rest} if sep else {'title': title}
            if labels:
                item['labels'] = labels
            out.append(item)
        return out
    if kind == 'links':
        out = []
        for text, href in items:
            if not href:
                raise CopyError(f'{where}: Links item is not a hyperlink: {text!r}')
            out.append({'label': text, 'href': href})
        return out
    raise ValueError(kind)


def to_sections(found, where):
    """Parsed Sections entries -> [{title, text?, gallery?: [...]}]."""
    out = []
    for section in found:
        title, intro, pieces = section['title'], section['intro'], section['pieces']
        if len(intro) > 1:
            raise CopyError(f'{where} / {title!r}: one intro paragraph per section, found {len(intro)}')
        entry = {'title': title, **({'text': intro[0]} if intro else {})}
        for key, (kind, items) in pieces.items():
            if items:
                entry[key] = to_value(kind, items, f'{where} / {title!r} / {key}')
        out.append(entry)
    return out


def parse(paragraphs, where):
    """One page's doc -> flat fields {'title': ..., 'writeup.tldr': [...]}."""
    errors, items = [], {}
    field = None  # None until the first Heading 2: title + guide are ignored
    piece = None  # inside Sections: the current Heading 4's key, or None for the intro
    for style, text, href in paragraphs:
        if style == 'Heading2':
            piece = None
            match = FIELD_BY_HEADING.get(text.strip().lower())
            if not match:
                errors.append(f'{where}: unknown field {text!r} (use one of: {FIELD_NAMES})')
                field = 'unknown'  # swallow its paragraphs: one error, not one per line
                continue
            key, kind = match
            if key in items:
                errors.append(f'{where}: field {text!r} appears twice')
            field = key
            items[key] = (kind, [])
        elif field == 'sections' and style == 'Heading3':
            # A new section: its heading; the intro and pieces follow
            items['sections'][1].append({'title': text.strip(), 'intro': [], 'pieces': {}})
            piece = None
        elif field == 'sections' and style == 'Heading4':
            sections = items['sections'][1]
            match = PIECE_BY_HEADING.get(text.strip().lower())
            if not sections:
                errors.append(f'{where}: {text!r} (Heading 4) comes before any section (Heading 3)')
                piece = 'unknown'
            elif not match:
                errors.append(f'{where} / {sections[-1]["title"]!r}: unknown piece {text!r} (use one of: {PIECE_NAMES})')
                piece = 'unknown'
            else:
                key, kind = match
                if key in sections[-1]['pieces']:
                    errors.append(f'{where} / {sections[-1]["title"]!r}: {text!r} appears twice')
                sections[-1]['pieces'][key] = (kind, [])
                piece = key
        elif style.startswith('Heading') and field is not None:
            nested = ' (Heading 3 and 4 only inside Sections)' if style in ('Heading3', 'Heading4') else ''
            errors.append(f'{where}: {text!r} uses {style}; fields are Heading 2, the rest is Normal text{nested}')
        elif field == 'sections' and text:
            sections = items['sections'][1]
            if not sections:
                errors.append(f'{where} / sections: {text!r} comes before any section; Sections uses a Heading 3 per section (its heading), then its intro and pieces')
                field = 'unknown'  # one error, not one per line
            elif piece is None:
                sections[-1]['intro'].append(text)
            elif piece != 'unknown':
                sections[-1]['pieces'][piece][1].append((text, href))
        elif field not in (None, 'unknown') and text:
            items[field][1].append((text, href))
    fields = {}
    for key, (kind, found) in items.items():
        if found:
            try:
                at = f'{where} / {key}'
                fields[key] = to_sections(found, at) if kind == 'sections' else to_value(kind, found, at)
            except CopyError as e:
                errors.append(str(e))
    if errors:
        raise CopyError('\n'.join(errors))
    return fields


def nest(fields):
    """Flat 'writeup.tldr' keys -> {'writeup': {'tldr': ...}}, in FIELDS order."""
    out = {}
    for _, key, _ in FIELDS:
        if key in fields:
            head, _, tail = key.partition('.')
            if tail:
                out.setdefault(head, {})[tail] = fields[key]
            else:
                out[key] = fields[key]
    return out


def flatten(copy):
    """The reverse of nest: a page's copy as the site has it -> flat FIELDS keys."""
    flat = {}
    for _, key, _ in FIELDS:
        head, _, tail = key.partition('.')
        value = copy.get(head, {}).get(tail) if tail else copy.get(key)
        if value is not None:
            flat[key] = value
    return flat


# ---------------------------------------------------------------- copy.js


def literal(text):
    quote = "'" if "'" not in text or '"' in text else '"'
    text = text.replace('\\', '\\\\').replace('\n', '\\n')
    return quote + text.replace(quote, '\\' + quote) + quote


def js_key(key):
    return key if re.fullmatch(r'[A-Za-z_$][\w$]*', key) else literal(key)


def to_js(value, indent=0):
    pad, inner = '  ' * indent, '  ' * (indent + 1)
    if isinstance(value, str):
        return literal(value)
    if isinstance(value, list):
        lines = [f'{inner}{to_js(v, indent + 1)},' for v in value]
        return '[\n' + '\n'.join(lines) + f'\n{pad}]'
    if isinstance(value, dict):
        lines = [f'{inner}{js_key(k)}: {to_js(v, indent + 1)},' for k, v in value.items()]
        return '{\n' + '\n'.join(lines) + f'\n{pad}}}'
    raise TypeError(type(value))


def render_js(folder, fields):
    project = page_path(folder)[0]
    return (
        f'// Generated from {folder.name}.docx by tools/copy_sync.py. Do not edit:\n'
        f'// change the doc, then run\n'
        f'//   python tools/copy_sync.py {project} --write\n'
        f'// Read by index.js through fromCopy() (content/helpers.js).\n\n'
        f'export default {to_js(nest(fields))};\n'
    )


STUB_JS = '// Placeholder until this page has a doc: run tools/copy_sync.py --export\nexport default {};\n'


# ---------------------------------------------------------------- site (Node)

NODE_DUMP = """
const {default: root} = await import(process.argv.at(-1));
const KEYS = ['title', 'summary', 'linksTitle', 'links', 'writeup'];
const pages = [];
const walk = (node, path) => {
  const copy = Object.fromEntries(KEYS.filter((k) => node[k] !== undefined).map((k) => [k, node[k]]));
  const {tryThis, openLabel} = node.content ?? {};
  const content = Object.fromEntries(Object.entries({tryThis, openLabel}).filter(([, v]) => v !== undefined));
  if (Object.keys(content).length) copy.content = content;
  // A gallery's copy: each image's title and caption
  const captionsOf = (gallery) =>
    (gallery?.images ?? []).filter((image) => image.title).map(({title, text, labels}) => ({title, ...(text && {text}), ...(labels && {labels})}));
  // Which images are compare pairs, by position (for --check only)
  const comparesOf = (gallery) => (gallery?.images ?? []).map((image) => Boolean(image.compare));
  // Sections: only their copy (heading, intro, piece copy); the pieces stay in index.js
  const sections = (node.sections ?? []).filter((s) => s.title).map(({title, text, gallery}) => {
    const captions = captionsOf(gallery);
    return {title, ...(text && {text}), ...(captions.length && {gallery: captions})};
  });
  if (sections.length) copy.sections = sections;
  // The page's own gallery (content.gallery)
  const captions = captionsOf(node.content?.gallery);
  if (captions.length) copy.gallery = captions;
  const compares = {
    gallery: comparesOf(node.content?.gallery),
    sections: (node.sections ?? []).filter((s) => s.title).map((s) => comparesOf(s.gallery)),
  };
  pages.push({path, copy, compares});
  for (const child of node.children ?? []) walk(child, [...path, child.id]);
};
walk(root, [root.id]);
console.log(JSON.stringify(pages));
"""


def site_pages(project):
    """The project's pages as the site builds them: [{path, copy}]."""
    index = project / 'index.js'
    result = subprocess.run(
        ['node', '--no-warnings', '--input-type=module', '-e', NODE_DUMP, '--', index.as_uri()],
        capture_output=True, text=True, encoding='utf-8', cwd=ROOT, check=False,
    )
    if result.returncode != 0:
        raise CopyError(f'Node could not load {index.relative_to(ROOT)}:\n{result.stderr.strip()}')
    return json.loads(result.stdout)


def check_tree(pages, folders):
    """Folders and the tree must agree: same paths, ids = folder names."""
    site = {' / '.join(p['path']) for p in pages}
    disk = {label(f) for f in folders}
    warnings = [f'{p}: page in the tree but no folder for it (or its id doesn’t match the folder name)'
                for p in sorted(site - disk)]
    warnings += [f'{p}: folder has an index.js but no parent imports it' for p in sorted(disk - site)]
    return warnings


def check_labels(pages, docs):
    """Labels on a doc line ("| Before | After") only for compare pairs."""
    warnings = []
    for page in pages:
        where = ' / '.join(page['path'])
        fields = docs.get(where)
        if not fields:
            continue
        compares = page['compares']
        galleries = [('gallery', fields.get('gallery', []), compares['gallery'])]
        for k, section in enumerate(fields.get('sections', [])):
            flags = compares['sections'][k] if k < len(compares['sections']) else []
            galleries.append((f'sections / {section["title"]} / gallery', section.get('gallery', []), flags))
        for at, items, flags in galleries:
            for i, item in enumerate(items):
                if item.get('labels') and not (i < len(flags) and flags[i]):
                    warnings.append(f'{where} / {at}: line {i + 1} has labels, but image {i + 1} in index.js has no `compare`: {item["title"]}')
    return warnings


def lint(where, fields):
    def strings(value):
        if isinstance(value, str):
            yield value
        elif isinstance(value, list):
            for v in value:
                yield from strings(v)
        elif isinstance(value, dict):
            for k, v in value.items():
                if k != 'href':
                    yield from strings(v)

    warnings = []
    for key, value in fields.items():
        for text in strings(value):
            for pattern, message in LINT:
                match = pattern.search(text)
                if match:
                    start = max(match.start() - 30, 0)
                    warnings.append(f'{where} / {key}: {message}: ...{text[start:match.end() + 30]}...')
            lower = key in TITLE_CASE_KEYS and not_title_case(text)
            if lower:
                warnings.append(f'{where} / {key}: not Title Case ({", ".join(lower)}): {text}')
    # Section headings and image titles are titles; their text is a sentence
    titled = [('gallery', item) for item in fields.get('gallery', [])]
    for section in fields.get('sections', []):
        titled.append(('sections', section))
        for _, key, kind in SECTION_PIECES:
            if kind == 'titled':
                titled += [(f'sections / {section["title"]} / {key}', item) for item in section.get(key, [])]
    for at, item in titled:
        for text in [item['title'], *item.get('labels', [])]:
            lower = not_title_case(text)
            if lower:
                warnings.append(f'{where} / {at}: not Title Case ({", ".join(lower)}): {text}')
    return warnings


# ---------------------------------------------------------------- export (.docx)


def curly(text):
    return re.sub(r"(?<=\w)'(?=\w)", '’', text)


def run(text, bold=False, style=None):
    props = ''.join([
        f'<w:rStyle w:val="{style}"/>' if style else '',
        '<w:b/>' if bold else '',
    ])
    rpr = f'<w:rPr>{props}</w:rPr>' if props else ''
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def para(content, style=None, num=None):
    """One paragraph; `num` puts it in that numbered list (its own count)."""
    numpr = f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num}"/></w:numPr>' if num else ''
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/>{numpr}</w:pPr>' if style else ''
    return f'<w:p>{ppr}{content}</w:p>'


def titled_para(item, style, num=None):
    """"Title: text" with the title in bold, then " | A | B" for a pair's labels."""
    text = item.get('text')
    title = run(curly(item['title']) + (':' if text else ''), bold=True)
    labels = ''.join(f' | {curly(label)}' for label in item.get('labels', []))
    rest = (' ' + curly(text) if text else '') + labels
    return para(title + (run(rest) if rest else ''), style, num)


def doc_body(folder, flat, add_link, new_list):
    """Paragraph XML for one page's doc: title, guide, then its fields.
    new_list() returns a fresh numbered list id, so each list counts from 1."""
    project = page_path(folder)[0]
    guide = [
        f'Site copy for the page #/{"/".join(page_path(folder))}. This doc is the source of truth: edit it here, then run',
        f'python tools/copy_sync.py {project} --check (preview the changes) or --write (update the site).',
        f'Each Heading 2 is a field: {FIELD_NAMES}. Each paragraph under it is one item. '
        'Add a field by adding its heading; delete the heading and its text to remove it.',
        'Action items are "Lead: text". Links are hyperlinks: the text is the button label.',
        'Sections: a Heading 3 per section (its heading), in page order; under it one paragraph of intro (optional), '
        'then a Heading 4 per piece with copy: Gallery.',
        'Gallery items are "Title" or "Title: caption", one per image, in gallery order (the numbers match the images list). A compare pair can end in " | After | Changes" to rename its two layers.',
        'Comments are ignored, so use them for notes. Tracked changes are fine: insertions count, deletions don’t.',
    ]
    out = [para(run(label(folder)), 'Title')]
    out += [para(run(line), 'Guide') for line in guide]
    for heading, key, kind in FIELDS:
        if key not in flat:
            continue
        value = flat[key]
        out.append(para(run(heading), 'Heading2'))
        if kind == 'sections':
            # Nested like index.js: section heading, intro, then each piece's items
            for section in value:
                out.append(para(run(curly(section['title'])), 'Heading3'))
                if section.get('text'):
                    out.append(para(run(curly(section['text'])), 'SectionText'))
                for piece_heading, piece_key, _ in SECTION_PIECES:
                    if piece_key in section:
                        out.append(para(run(piece_heading), 'Heading4'))
                        num = new_list()
                        out += [titled_para(item, 'ListNumber', num) for item in section[piece_key]]
            continue
        num = new_list() if kind == 'titled' else None
        items = value if isinstance(value, list) else [value]
        for item in items:
            if kind == 'action':
                out.append(para(run(curly(item['lead']) + ':', bold=True) + run(' ' + curly(item['text'])), 'ListBullet'))
            elif kind == 'titled':
                out.append(titled_para(item, 'ListNumber', num))
            elif kind == 'links':
                rid = add_link(item['href'])
                link = f'<w:hyperlink r:id="{rid}">{run(curly(item["label"]), style="Hyperlink")}</w:hyperlink>'
                out.append(para(link, 'ListBullet'))
            else:
                out.append(para(run(curly(item)), 'ListBullet' if kind == 'list' else None))
    return ''.join(out)


STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W}">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:color w:val="4B4B4B"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="FF9600"/></w:pBdr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="3C3F45"/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Guide"><w:name w:val="Guide"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="CC7A00"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr><w:spacing w:after="80"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="SectionText"/><w:qFormat/><w:pPr><w:keepNext/><w:numPr><w:numId w:val="2"/></w:numPr><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="3C3F45"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="SectionText"><w:name w:val="Section Text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="1080"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="ListNumber"/><w:qFormat/><w:pPr><w:keepNext/><w:ind w:left="1080"/><w:spacing w:before="120" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:color w:val="808080"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:numPr><w:numId w:val="3"/></w:numPr><w:spacing w:after="80"/></w:pPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="CC7A00"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>""".replace('{W}', W)

# Lists: 1 = bullets (list fields), 2 = section heading bullets (Heading 3),
# 3 and up = numbered lists (gallery items), one per list, each restarting
# at 1. Word types a new List Number paragraph into list 3 by default.
FIRST_NUMBERED = 3


def numbering_xml(numbered_lists):
    nums = ''.join(
        f'<w:num w:numId="{n}"><w:abstractNumId w:val="2"/>'
        f'<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>'
        for n in range(FIRST_NUMBERED, FIRST_NUMBERED + max(numbered_lists, 1))
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:numbering xmlns:w="{W}">'
        f'<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
        f'<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
        f'<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1800" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
        f'<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
        f'<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
        f'{nums}</w:numbering>'
    )

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>"""

PACKAGE_RELS = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{PKG_REL}">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""


def write_docx(path, folder, flat):
    links = []

    def add_link(href):
        links.append(href)
        return f'rIdLink{len(links)}'

    numbered = []

    def new_list():
        numbered.append(FIRST_NUMBERED + len(numbered))
        return numbered[-1]

    body = doc_body(folder, flat, add_link, new_list)
    document = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>{body}'
        f'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        f'<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
        f'</w:sectPr></w:body></w:document>'
    )
    rel_type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    rels = [
        f'<Relationship Id="rIdStyles" Type="{rel_type}/styles" Target="styles.xml"/>',
        f'<Relationship Id="rIdNumbering" Type="{rel_type}/numbering" Target="numbering.xml"/>',
    ] + [
        f'<Relationship Id="rIdLink{i}" Type="{rel_type}/hyperlink" Target="{escape(href, {chr(34): "&quot;"})}" TargetMode="External"/>'
        for i, href in enumerate(links, 1)
    ]
    doc_rels = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Relationships xmlns="{PKG_REL}">{"".join(rels)}</Relationships>'
    )
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CONTENT_TYPES)
        z.writestr('_rels/.rels', PACKAGE_RELS)
        z.writestr('word/document.xml', document)
        z.writestr('word/styles.xml', STYLES)
        z.writestr('word/numbering.xml', numbering_xml(len(numbered)))
        z.writestr('word/_rels/document.xml.rels', doc_rels)


# ---------------------------------------------------------------- commands


def export(project, folders, force):
    # A new page folder has no copy.js yet; Node needs one to load the tree
    for folder in folders:
        if not (folder / 'copy.js').exists():
            (folder / 'copy.js').write_text(STUB_JS, encoding='utf-8', newline='\n')
            print(ok('Wrote a placeholder'), path((folder / 'copy.js').relative_to(ROOT)))
    by_label = {label(f): f for f in folders}
    for page in site_pages(project):
        folder = by_label.get(' / '.join(page['path']))
        if folder is None:
            continue  # reported by the tree check
        doc = folder / f'{folder.name}.docx'
        if doc.exists() and not force:
            continue
        flat = flatten(page['copy']) or {key: '' for key in NEW_PAGE_FIELDS}
        try:
            write_docx(doc, folder, flat)
        except PermissionError:
            raise CopyError(f'Can’t write {doc.name}: close it in Word first.')
        print(ok('Wrote'), path(doc.relative_to(ROOT)))


def sync(folders, write):
    """Parse every doc first; write only if all of them parse."""
    results, errors, warnings, docs = [], [], [], {}
    for folder in folders:
        doc, js = folder / f'{folder.name}.docx', folder / 'copy.js'
        if not doc.exists():
            warnings.append(f'{label(folder)}: no {doc.name} yet (run --export)')
            continue
        try:
            fields = parse(read_doc(doc), label(folder))
        except CopyError as e:
            errors.append(str(e))
            continue
        warnings += lint(label(folder), fields)
        docs[label(folder)] = fields
        new = render_js(folder, fields)
        old = js.read_text(encoding='utf-8') if js.exists() else ''
        diff = list(difflib.unified_diff(
            old.splitlines(), new.splitlines(), 'copy.js (site)', 'copy.js (from doc)', lineterm='', n=1,
        ))
        results.append((folder, js, new, diff))
    if errors:
        raise CopyError('\n'.join(errors))

    changed = [(folder, js, new, diff) for folder, js, new, diff in results if diff]
    for folder, js, new, diff in changed:
        if write:
            js.write_text(new, encoding='utf-8', newline='\n')
            lines = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            print(ok('Wrote'), path(js.relative_to(ROOT)), dim(f'({lines} changed lines)'))
        else:
            print(f'\n{heading(label(folder))}')
            print('\n'.join(diff_line(line) for line in paired(diff[2:])))
    # (page label, diff lines) for the log
    return warnings, [(label(folder), paired(diff[2:])) for folder, _, _, diff in changed], docs


def write_log(project, mode, changed, warnings):
    """A Markdown record of one run for one project, in its _logs/ folder
    (gitignored): YYYYMMDD_HHMMSS_copy_sync.md, local time, 24-hour, so
    the folder lists runs in order and no run replaces another."""
    now = datetime.now()
    verb = 'Wrote' if mode == 'write' else 'Would change'
    lines = [
        f'# Copy Sync, {now:%Y-%m-%d %H:%M:%S}',
        '',
        f'- Project: `{project.relative_to(ROOT).as_posix()}`',
        f'- Mode: --{mode}',
        f'- {verb}: {len(changed)} page(s)' + ''.join(f'\n  - `{page}`' for page, _ in changed),
        f'- Warnings: {len(warnings)}',
    ]
    for page, diff in changed:
        lines += ['', f'## {page}', '', '```diff', *diff, '```']
    if warnings:
        lines += ['', '## Warnings', '', *(f'- {line}' for line in warnings)]
    folder = project / '_logs'
    folder.mkdir(exist_ok=True)
    file = folder / f'{now:%Y%m%d_%H%M%S}_copy_sync.md'
    file.write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')
    return file


def main():
    # Curly quotes in messages; Windows consoles default to cp1252
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8', errors='replace')
    parser = argparse.ArgumentParser(description='Sync each page’s copy between its .docx and copy.js.')
    parser.add_argument('project', nargs='?', help='project id, e.g. textile-resale-economy (default: all)')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='show what --write would change, plus warnings')
    mode.add_argument('--write', action='store_true', help='regenerate copy.js files from the docs')
    mode.add_argument('--export', action='store_true', help='build missing docs from the site')
    parser.add_argument('--force', action='store_true', help='with --export: rebuild every doc, replacing edits')
    parser.add_argument('--log', action='store_true', help='with --check or --write: also write <project>/_logs/YYYYMMDD_HHMMSS_copy_sync.md')
    args = parser.parse_args()
    if args.log and args.export:
        parser.error('--log goes with --check or --write')

    try:
        warnings, changed, logs = [], 0, []
        for project in find_projects(args.project):
            folders = page_folders(project)
            docs, project_warnings, project_changed = {}, [], []
            if args.export:
                export(project, folders, args.force)
            else:
                project_warnings, project_changed, docs = sync(folders, args.write)
                changed += len(project_changed)
            try:
                pages = site_pages(project)
                project_warnings += check_tree(pages, folders)
                project_warnings += check_labels(pages, docs)
            except CopyError as e:
                project_warnings.append(f'Tree check skipped: {e}')
            warnings += project_warnings
            if args.log:
                mode = 'write' if args.write else 'check'
                logs.append(write_log(project, mode, project_changed, project_warnings))
        if not args.export:
            if not changed:
                print(ok('Every copy.js already matches its doc.'))
            elif args.write:
                print(dim('Review with: git diff'))
            else:
                print(f'\n{warn(f"{changed} page(s) would change.")} {dim("Run --write to apply.")}')
        if warnings:
            print(f'\n{warn(f"{len(warnings)} warning(s):")}')
            print('\n'.join(warn(f'  {line}') for line in warnings))
        for file in logs:
            print(ok('Log:'), path(file.relative_to(ROOT)))
    except CopyError as e:
        fail('Problems Found, Nothing Written', str(e))


if __name__ == '__main__':
    main()
