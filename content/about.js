// About section: bio, photo and skills. Plain data, like hero.js.
// - Copy is a draft: comments marked [?] are facts still to confirm.
// - photo: {base, widths, alt} once img/about/about_portrait_<width>.jpg
//   exists (naming: ARCHITECTURE.md → Images). null shows a placeholder.
//   To hide the photo column entirely, see SHOW_PHOTO in
//   components/about/about.js.

export default {
  eyebrow: 'Background',
  title: 'About',
  paragraphs: [
    "I'm a web developer who builds GIS tools: the forms, maps and " +
      'review apps that turn raw location data into something people ' +
      'can use. Most recently that meant Survey123 and Experience ' +
      'Builder apps for the Washington Department of Ecology, and the ' +
      'data pipeline behind a statewide textile reuse dataset.',
    // [?] Which GIS certificate program?
    'I started in landscape architecture, where I learned to think in ' +
      'sites, layers and maps. I then spent about eight years in web ' +
      'development, building sites and front ends, before a GIS ' +
      'certificate brought the two together.',
    // [?] City
    "I'm looking for GIS application developer roles: the software " +
      "side of spatial work. I'm based in Washington.",
  ],
  photo: null,
  // {base: 'img/about/about_portrait', widths: [800, 1280], alt: 'Portrait of Seth Borne'}
  // [?] Confirm or trim the lists
  skills: [
    {
      label: 'GIS',
      items: ['ArcGIS Online', 'ArcGIS Pro', 'Experience Builder', 'Survey123'],
    },
    {label: 'Web', items: ['JavaScript', 'HTML', 'CSS', 'Node.js']},
    {label: 'Data', items: ['Python', 'JSON', 'Data cleaning and deduplication']},
  ],
};
