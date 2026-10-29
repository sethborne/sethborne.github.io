// Element factory shared by every component:
//   el('a', {href: '#/', class: 'nav-name'}, 'Seth Borne')
// Strings become text nodes, so content is never parsed as HTML.
// Attributes set to null, undefined or false are skipped; true sets an
// empty attribute (e.g. hidden). Children can be nested arrays; null,
// undefined and false are skipped, so `cond && el(...)` is safe.
const skip = (value) => value == null || value === false;

export const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (skip(value)) continue;
    node.setAttribute(name, value === true ? '' : value);
  }
  // Infinity: arrays inside arrays (a helper's ...rest wrapping another
  // helper's list) flatten all the way, or append() would print them
  // as "[object HTMLElement]" text
  node.append(...children.flat(Infinity).filter((child) => !skip(child)));
  return node;
};
