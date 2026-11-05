// Project card: one content node as a clickable summary.
// createCardGrid lays out a list of them (home Projects, group pages).
import {el} from '../../js/dom.js';
import {isLeaf} from '../../js/content.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';
import * as TAGS from '../../content/tags.js';
import CARD_ART from '../../content/card-art.js';
import ui from '../../content/ui.js';

// Grouped tags hold ids only ({tool: ['survey123']}), so look the
// display label back up from the tags.js exports.
//   labelFor('tool', 'survey123') -> 'Survey123'
const LABELS = new Map(
  Object.values(TAGS).map(({facet, id, label}) => [
    `${facet}:${id}`,
    label,
  ]),
);

export const labelFor = (facet, id) =>
  LABELS.get(`${facet}:${id}`) ?? id;

// A page's own image: its card thumb, else its preview screenshot
const imageOf = (node) => node.thumb ?? node.content?.fallback;

// What a card shows, first that exists (ARCHITECTURE.md → Card images):
//   {photo}  the node's own image. Groups never borrow a child's: its
//            page already shows that child's card, so it would repeat
//   {art}    default drawing for its type (groups: 'project'), content/card-art.js
//   {}       neither: the map grid alone
export const cardImage = (node) => {
  const photo = imageOf(node);
  if (photo) return {photo};
  const art = CARD_ART[isLeaf(node) ? node.tags?.type?.[0] : 'project'];
  return art ? {art} : {};
};

// Cards are about a third of the page wide on desktop, half on tablets
const THUMB_SIZES = '(min-width: 1024px) 400px, (min-width: 600px) 50vw, 100vw';

// Decorative (aria-hidden): the title says what the card is. The art is
// a CSS mask, so its color comes from --accent (card.css); inline style
// so the url resolves from the page, like every other image path.
const createThumb = ({photo, art}) =>
  el(
    'div',
    {
      // Art sits on a plain tint (card.css); the grid is only for no image at all
      class: photo ? 'card-thumb' : art ? 'card-thumb is-art' : 'card-thumb map-grid',
      'aria-hidden': 'true',
    },
    photo &&
      el('img', {
        srcset: srcsetFor(photo),
        sizes: THUMB_SIZES,
        src: fallbackFor(photo),
        alt: '',
        loading: 'lazy',
        decoding: 'async',
      }),
    art &&
      el('span', {
        class: 'card-art',
        style: `-webkit-mask-image: url("${art}"); mask-image: url("${art}");`,
      }),
  );

// Takes the {node, path} items collectLeaves returns. An item's eyebrow
// replaces the default (type label, or ui.card.groupEyebrow for groups), e.g. with
// where a filter result lives.
export const createCard = ({node, path, eyebrow: override}) => {
  const leaf = isLeaf(node);
  const eyebrow =
    override ??
    (leaf
      ? node.tags.type?.[0] && labelFor('type', node.tags.type[0])
      : ui.card.groupEyebrow);
  const tools = leaf ? (node.tags.tool ?? []) : [];

  return el(
    'article',
    {class: 'card'},
    createThumb(cardImage(node)),
    el(
      'div',
      {class: 'card-body'},
      eyebrow && el('span', {class: 'card-eyebrow'}, eyebrow),
      // The one link; card.css stretches it over the whole card
      el(
        'h3',
        {},
        el('a', {href: `#/${path.join('/')}`}, node.title),
      ),
      node.summary && el('p', {}, node.summary),
      tools.length > 0 &&
        el(
          'ul',
          {class: 'pills', 'aria-label': 'Tools'},
          tools.map((id) =>
            el('li', {class: 'pill'}, labelFor('tool', id)),
          ),
        ),
    ),
  );
};

export const createCardGrid = (items) =>
  el('div', {class: 'card-grid'}, items.map(createCard));
