// Survey Map: the RMDC survey and its two Experience Builder apps. The
// project node and its pages (#/survey-map/...). How to build nodes:
// content/helpers.js.

import {EB_APP, groupPage, detailPage, pendingEmbed} from '../../helpers.js';
import {
  TOOL_ARCGIS_ONLINE,
  TOOL_SURVEY123,
  TYPE_FORM,
  TYPE_REVIEW_TOOL,
  TYPE_WEB_APP,
} from '../../tags.js';
// The project story (STAR), shown on #/survey-map
import writeup from './writeup.js';

export default groupPage(
  'survey-map',
  'Survey Map',
  [
    detailPage(
      'survey123',
      'Survey123 form',
      [TOOL_SURVEY123, TOOL_ARCGIS_ONLINE, TYPE_FORM],
      {
        summary:
          'The form behind both apps. Entries publish automatically, as ' +
          "the client asked, and a built-in 'pending approval' status " +
          'supports a review-first workflow instead.',
        content: {
          embed: pendingEmbed('survey123'),
          tryThis:
            'Fill in the form with made-up details and submit it.',
        },
      },
    ),
    detailPage(
      'eb-external',
      'Experience Builder: public app',
      [...EB_APP, TYPE_WEB_APP],
      {
        summary:
          'Public map with a pin for each survey submission, updated as ' +
          'new entries arrive. Click a pin to see the details from that ' +
          'submission.',
        content: {
          embed: pendingEmbed('eb-external'),
          tryThis:
            'Submit a test entry in the Survey123 form, then find your ' +
            'pin here.',
        },
      },
    ),
    detailPage(
      'eb-internal',
      'Experience Builder: internal app',
      [...EB_APP, TYPE_WEB_APP, TYPE_REVIEW_TOOL],
      {
        summary:
          'Staff app for revising and managing entries shown on the ' +
          'public map. Since entries publish automatically, corrections ' +
          'happen here after they go live.',
        content: {
          embed: pendingEmbed('eb-internal'),
          tryThis:
            'Open an entry, change a field and save it. The public map ' +
            'shows the edit.',
        },
      },
    ),
  ],
  {
    summary:
      'A Survey123 form collecting contact details from people in the ' +
      'secondary textile resale economy, focused on Washington State. ' +
      'It feeds two Experience Builder apps: a public map of ' +
      'submissions and a staff app for managing them. Demo mockups of ' +
      'production work for the Recycling Market Development Center.',
    writeup,
    // Where the TL;DR goes on desktop: 'right' (default), 'left' or
    // 'full' (no column). See LAYOUTS in components/page/page.js.
    layout: 'full',
    // What goes in the side column, in order: 'tldr', 'links'.
    // Default ['tldr']; anything not listed stays in the main column.
    aside: ['tldr'],
    // Production versions, shown after the writeup. The demos on the
    // app pages are my AGOL mockups; these are RMDC's own.
    linksTitle: 'Live Links on the RMDC Website',
    links: [
      {
        label: 'RMDC Washington Textile Survey',
        href: 'https://survey123.arcgis.com/share/f6826d6023f043dc837649b0a3547add?portalUrl=https://gis.ecology.wa.gov/portal',
      },
      {
        label: 'RMDC Washington Textile Contact App',
        href: 'https://gis.ecology.wa.gov/portal/apps/experiencebuilder/experience/?id=71501934f3f4426b889b6998b70b3528',
      },
      {
        label: 'RMDC Textiles Page',
        href: 'https://ecology.wa.gov/waste-toxics/reducing-recycling-waste/waste-reduction-programs/recycling-market-development-center/textiles',
      },
    ],
  },
);
