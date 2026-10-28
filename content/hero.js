// Home hero: intro text and background image. Plain data, like profile.js.
// - media.slides holds one image now; more slides turn it into a
//   slideshow later (PLAN.md → Next).
// - Images are exported at several widths named
//   <context>_<subject>_<width>.jpg (e.g. img/hero/hero_beech_tree_800.jpg);
//   list the widths that exist. Naming rules: ARCHITECTURE.md → Images.
// - alt: '' marks an image as decorative, so screen readers skip it.
//   Write a description instead if the image should be announced.
import profile from './profile.js';

export default {
  eyebrow: profile.name,
  title: {lead: ['Web developer', 'building'], accent: 'spatial tools.'},
  summary:
    'I design and build the software around GIS data: pipelines, ' +
    'review tools, and public-facing maps. Background in landscape ' +
    'architecture, eight years of web development, now GIS-certified.',
  tags: ['Node.js', 'Python', 'ArcGIS', 'Experience Builder', 'Survey123'],
  ctas: [
    {label: 'View projects', href: '#/projects', variant: 'primary'},
    {label: 'Get in touch', href: '#/contact', variant: 'ghost'},
  ],
  media: {
    type: 'image',
    slides: [
      {
        base: 'img/hero/hero_beech_tree',
        widths: [800, 1280, 1600, 1920, 2560, 3400],
        alt: '',
      },
    ],
  },
};
