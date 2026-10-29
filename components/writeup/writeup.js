// Writeup: a project's story in STAR order (situation, task, action,
// result), plus a TL;DR box for readers skimming. Renders a writeup
// object from content/writeups/ (shape documented there).
// Returns the two parts separately, {summary, story}, so the page can
// lay them out: side by side on desktop, stacked on mobile.
import {el} from '../../js/dom.js';

// A string is one paragraph, an array is several
const paragraphs = (text) =>
  [text].flat().map((p) => el('p', {}, p));

const section = (title, ...body) =>
  el('section', {class: 'writeup-section'}, el('h2', {}, title), body);

const renderTldr = (tldr, stack) =>
  el(
    'section',
    {class: 'writeup-tldr'},
    el('h2', {}, 'TL;DR'),
    el('ul', {}, tldr.map((line) => el('li', {}, line))),
    stack &&
      el(
        'ul',
        {class: 'badges', 'aria-label': 'Stack'},
        stack.map((item) => el('li', {class: 'badge'}, item)),
      ),
  );

const renderActions = (action) =>
  el(
    'ul',
    {class: 'writeup-actions'},
    action.map(({lead, text}) =>
      el('li', {}, el('strong', {}, lead), ': ', text),
    ),
  );

export const createWriteup = ({tldr, stack, situation, task, action, result}) => ({
  summary: tldr ? renderTldr(tldr, stack) : null,
  story: el(
    'div',
    {class: 'writeup-story'},
    situation && section('Situation', paragraphs(situation)),
    task && section('Task', paragraphs(task)),
    action && section('Action', renderActions(action)),
    result && section('Result', paragraphs(result)),
  ),
});
