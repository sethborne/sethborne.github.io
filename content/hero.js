// Home hero: intro text and background photos. Plain data, like profile.js.
// - Slideshow settings are the three constants below.
// - SLIDES is the photo list, in order: the slideshow shows exactly
//   these (a static site can't read a folder). Off, or one photo: the
//   first photo only, no controls.
// - position (optional): the part of the photo kept when it's cropped
//   to fit the screen (CSS object-position), e.g. 'center 30%'.
// - Images are exported at several widths named
//   <context>_<subject>_<width>.jpg (e.g. img/hero/hero_beech_tree_800.jpg);
//   list the widths that exist. Naming rules: ARCHITECTURE.md → Images.
// - alt: '' marks an image as decorative, so screen readers skip it.
//   Write a description instead if the image should be announced.

// The small line above the headline. true: show EYEBROW. false: none,
// and the headline starts the hero. (Was the name, which the header
// already shows.) Update it when you're no longer looking.
const SHOW_EYEBROW = true;
const EYEBROW = 'Open to GIS Developer Roles · Seattle, WA';

// true: cycle through SLIDES. false: the first photo only.
const SLIDESHOW = false;

// Seconds each photo shows before the next
const SLIDE_SECONDS = 7;

// How one photo gives way to the next:
//   'fade'   crossfade
//   'slide'  next photo slides in sideways (back slides the other way)
//   'zoom'   crossfade, plus a slow push-in while each photo shows
//   'none'   instant cut
const TRANSITION = 'fade';

// Every hero photo is exported at these widths (full-bleed, so up to 3400)
const HERO_WIDTHS = [800, 1280, 1600, 1920, 2560, 3400];

// One slide from its subject name:
//   heroPhoto('beech_tree') -> img/hero/hero_beech_tree_<width>.jpg
// `more` adds or overrides fields: position, alt, or base/widths for a
// photo stored elsewhere.
const heroPhoto = (subject, more = {}) => ({
  base: `img/hero/hero_${subject}`,
  widths: HERO_WIDTHS,
  alt: '',
  ...more,
});

// The beech tree only, until the 4 or 5 real photos are picked (PLAN.md).
// Add one line per photo, e.g. heroPhoto('site_plan', {position: 'center 30%'})
const SLIDES = [heroPhoto('beech_tree')];

export default {
  eyebrow: SHOW_EYEBROW ? EYEBROW : null,
  title: {lead: ['Web developer', 'building'], accent: 'spatial tools.'},
  summary: 'I design and build the software around GIS data: pipelines, review tools, and public-facing maps. Background in landscape architecture, eight years of web development, now GIS-certified.',
  tags: ['Node.js', 'Python', 'ArcGIS', 'Experience Builder', 'Survey123'],
  ctas: [
    {label: 'View Projects', href: '#/projects', variant: 'primary'},
    {label: 'Get in Touch', href: '#/about', variant: 'ghost'},
  ],
  media: {
    slideshow: SLIDESHOW,
    seconds: SLIDE_SECONDS,
    transition: TRANSITION,
    slides: SLIDES,
  },
};
