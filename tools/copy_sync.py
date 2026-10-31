"""Sync each page's copy between its Word doc and the site.

Every page is a folder under content/projects/<field>/<project>/ holding
index.js (structure), <id>.docx (copy, edited in Word, gitignored) and
copy.js (generated here; index.js reads it through fromCopy() in
content/helpers.js). The doc is the source of truth: never hand-edit copy.js.

    python tools/copy_sync.py [project] --check    # diff + writing check, changes nothing
    python tools/copy_sync.py [project] --write    # regenerate copy.js files from the docs
    python tools/copy_sync.py [project] --export   # build missing docs from the site (--force: all)

[project] is a project id (textile-resale-economy); leave it out for every
project. Each command covers the project's page folders at every depth.

Doc layout (the guide at the top of every exported doc repeats this):
- Anything before the first Heading 2 is ignored (title + guide).
- Heading 2: one field (FIELDS below). Each non-empty paragraph under it
  is one item.
- Comments and tracked deletions are ignored; tracked insertions count.

Standard library only (zipfile + xml), plus Node to read the site's
content tree for --export and the page check.
"""

import argparse
import difflib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / 'content' / 'projects'

# Doc heading -> key in copy.js (a dot nests it) -> how paragraphs become a value.
#   text:   one paragraph is a string, several are an array (writeup rule)
#   list:   always an array
#   action: array of {lead, text}, split at the first ': '
#   links:  array of {label, href}, from Word hyperlinks
FIELDS = [
    ('Title', 'title', 'text'),
    ('Summary', 'summary', 'text'),
    ('Try This', 'content.tryThis', 'text'),
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
    if kind == 'links':
        out = []
        for text, href in items:
            if not href:
                raise CopyError(f'{where}: Links item is not a hyperlink: {text!r}')
            out.append({'label': text, 'href': href})
        return out
    raise ValueError(kind)


def parse(paragraphs, where):
    """One page's doc -> flat fields {'title': ..., 'writeup.tldr': [...]}."""
    errors, items = [], {}
    field = None  # None until the first Heading 2: title + guide are ignored
    for style, text, href in paragraphs:
        if style == 'Heading2':
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
        elif style.startswith('Heading') and field is not None:
            errors.append(f'{where}: {text!r} uses {style}; fields are Heading 2, the rest is Normal text')
        elif field not in (None, 'unknown') and text:
            items[field][1].append((text, href))
    fields = {}
    for key, (kind, found) in items.items():
        if found:
            try:
                fields[key] = to_value(kind, found, f'{where} / {key}')
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
  pages.push({path, copy});
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


def check_tree(project, folders):
    """Folders and the tree must agree: same paths, ids = folder names."""
    site = {' / '.join(p['path']) for p in site_pages(project)}
    disk = {label(f) for f in folders}
    warnings = [f'{p}: page in the tree but no folder for it (or its id doesn’t match the folder name)'
                for p in sorted(site - disk)]
    warnings += [f'{p}: folder has an index.js but no parent imports it' for p in sorted(disk - site)]
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


def para(content, style=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
    return f'<w:p>{ppr}{content}</w:p>'


def doc_body(folder, flat, add_link):
    """Paragraph XML for one page's doc: title, guide, then its fields."""
    project = page_path(folder)[0]
    guide = [
        f'Site copy for the page #/{"/".join(page_path(folder))}. This doc is the source of truth: edit it here, then run',
        f'python tools/copy_sync.py {project} --check (preview the changes) or --write (update the site).',
        f'Each Heading 2 is a field: {FIELD_NAMES}. Each paragraph under it is one item. '
        'Add a field by adding its heading; delete the heading and its text to remove it.',
        'Action items are "Lead: text". Links are hyperlinks: the text is the button label.',
        'Comments are ignored, so use them for notes. Tracked changes are fine: insertions count, deletions don’t.',
    ]
    out = [para(run(label(folder)), 'Title')]
    out += [para(run(line), 'Guide') for line in guide]
    for heading, key, kind in FIELDS:
        if key not in flat:
            continue
        value = flat[key]
        out.append(para(run(heading), 'Heading2'))
        items = value if isinstance(value, list) else [value]
        for item in items:
            if kind == 'action':
                out.append(para(run(curly(item['lead']) + ':', bold=True) + run(' ' + curly(item['text'])), 'ListBullet'))
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
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="CC7A00"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>""".replace('{W}', W)

NUMBERING = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="{W}">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>"""

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

    body = doc_body(folder, flat, add_link)
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
        z.writestr('word/numbering.xml', NUMBERING)
        z.writestr('word/_rels/document.xml.rels', doc_rels)


# ---------------------------------------------------------------- commands


def export(project, folders, force):
    # A new page folder has no copy.js yet; Node needs one to load the tree
    for folder in folders:
        if not (folder / 'copy.js').exists():
            (folder / 'copy.js').write_text(STUB_JS, encoding='utf-8', newline='\n')
            print(f'Wrote a placeholder {(folder / "copy.js").relative_to(ROOT)}')
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
        print(f'Wrote {doc.relative_to(ROOT)}')


def sync(folders, write):
    """Parse every doc first; write only if all of them parse."""
    results, errors, warnings = [], [], []
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
            print(f'Wrote {js.relative_to(ROOT)} ({lines} changed lines)')
        else:
            print(f'\n== {label(folder)}')
            print('\n'.join(diff[2:]))
    return warnings, len(changed)


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
    args = parser.parse_args()

    try:
        warnings, changed = [], 0
        for project in find_projects(args.project):
            folders = page_folders(project)
            if args.export:
                export(project, folders, args.force)
            else:
                page_warnings, page_changes = sync(folders, args.write)
                warnings += page_warnings
                changed += page_changes
            try:
                warnings += check_tree(project, folders)
            except CopyError as e:
                warnings.append(f'Tree check skipped: {e}')
        if not args.export:
            if not changed:
                print('Every copy.js already matches its doc.')
            elif args.write:
                print('Review with: git diff')
            else:
                print(f'\n{changed} page(s) would change. Run --write to apply.')
        if warnings:
            print(f'\n{len(warnings)} warning(s):')
            print('\n'.join(f'  {line}' for line in warnings))
    except CopyError as e:
        sys.exit(f'Problems found, nothing written:\n{e}')


if __name__ == '__main__':
    main()
