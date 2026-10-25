// Responsive images from one naming convention: <base>_<width>.<ext>,
// where base is <folder>/<context>_<subject> (ARCHITECTURE.md → Images).
//   {base: 'img/hero/hero_beech_tree', widths: [800, 1280]}
//   -> img/hero/hero_beech_tree_800.jpg 800w, ..._1280.jpg 1280w
// The browser picks the best file for the screen width and pixel density.

const fileFor = (base, width, ext) => `${base}_${width}.${ext}`;

export const srcsetFor = ({base, widths, ext = 'jpg'}) =>
  widths.map((width) => `${fileFor(base, width, ext)} ${width}w`).join(', ');

// Fallback src for browsers without srcset: the middle size.
export const fallbackFor = ({base, widths, ext = 'jpg'}) =>
  fileFor(base, widths[Math.floor(widths.length / 2)], ext);
