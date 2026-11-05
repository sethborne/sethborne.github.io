// Link preview text: the browser tab title, the meta description and
// the share card (tools/share-card.html fills its tagline from here, and
// its name from profile.js). Plain data, like profile.js.
//
// index.html can't import this: crawlers read its <head> without running
// JS. When a value here changes, update the matching tags in index.html
// by hand (<title>, description, og:title, og:description), and
// re-export the share image (steps in tools/share-card.html).

export default {
  title: 'Seth Borne | Web Developer Building GIS Tools',
  description: 'Web developer building GIS tools: Survey123 and Experience Builder apps, web maps, and the data pipelines behind them.',
  // Shorter than description: it has to fit the card beside the portrait
  shareTagline: 'Web developer building GIS tools: Survey123 and Experience Builder apps, web maps, and data pipelines.',
};
