// Generated from textile-resale-economy.docx by tools/copy_sync.py. Do not edit:
// change the doc, then run
//   python tools/copy_sync.py textile-resale-economy --write
// Read by index.js through fromCopy() (content/helpers.js).

export default {
  title: 'Washington State Textile Secondary Resale Economy',
  summary: 'A statewide dataset of 2,445 places in Washington’s secondary textile resale economy, for the Recycling Market Development Center. A Node.js and Python pipeline conforms five sources, removes duplicates through human review and publishes to ArcGIS for an Experience Builder app. 3rd place, WAGISA Dick Thomas Award.',
  linksTitle: 'Live on the Ecology Portal',
  links: [
    {
      label: 'Washington State Textile Secondary Resale Economy Map',
      href: 'https://gis.ecology.wa.gov/portal/apps/experiencebuilder/experience/?id=02269b68b2ba43618e1583aba7d3ca1e',
    },
  ],
  writeup: {
    tldr: [
      'Built the data pipeline behind a statewide map of Washington’s secondary textile resale economy: 2,445 verified places, up from about 260 in two spreadsheets.',
      'Conformed five sources (Overture Maps plus four donation bin locators) to one schema, removed duplicates and checked every record with browser review tools I built, then published to Ecology’s ArcGIS Enterprise portal.',
      '3rd place in the Dick Thomas Award, WAGISA’s student presentation competition. UW GIS Certificate capstone for the Washington State Recycling Market Development Center (RMDC).',
    ],
    stack: [
      'Node.js',
      'Python',
      'DuckDB',
      'GeoParquet',
      'Overture Maps',
      'Nominatim',
      'arcpy',
      'ArcGIS Pro',
      'ArcGIS Enterprise Portal',
      'Experience Builder',
    ],
    situation: [
      'The Washington State Recycling Market Development Center (RMDC), a collaboration between the Departments of Ecology and Commerce, supports a circular economy and the state’s textile waste reduction goals. A first step was mapping every place that resells, repairs, rents, maintains or accepts donated clothing and textiles.',
      'RMDC started with two Excel spreadsheets and about 260 entries. Fields weren’t consistent, nothing was geocoded, there was no way to tell which entries were still current, and most were west of the Cascades.',
      'This was our UW Professional & Continuing Education GIS Certificate capstone, January to July 2026, with a team of four. I was the data lead and handled all communication with RMDC. Chelsea built and styled the public Experience Builder app, and Niko and Tyson ran the analyses.',
    ],
    task: 'A statewide map of Washington’s secondary resale economy: every place to resell, repair, rent, maintain or donate textiles. Behind it, a clean dataset published as a hosted feature layer on Ecology’s portal, a lightweight copy for the analysis team, and a documented pipeline RMDC can rerun with each new Overture release.',
    action: [
      {
        lead: 'Sources',
        text: 'Overture Maps (release 2026-01-21.0) for open place data updated monthly, about 1,800 places in the final set. Donation bin locators from USAgain, TexGreen (GreenTeam), Evergreen Textile and Big Blue Truck added about 600 more. The scope covers 5 groups and 17 categories, from resale and donation to repair, rental and textile maintenance.',
      },
      {
        lead: 'Extract',
        text: 'Overture Places and Transportation download as GeoParquet. A Python script uses DuckDB to pull records by state, built so neighboring areas such as Portland, OR can be added later.',
      },
      {
        lead: 'Ingest and conform',
        text: 'Node.js scripts query the extracted data and scrape each bin locator. All five sources map to Overture’s schema, with per-source column configs that validate fields on every run. Bin addresses are geocoded through OpenStreetMap’s Nominatim, with fields recording how and when each one was geocoded.',
      },
      {
        lead: 'Dedupe',
        text: 'Overture carries several internal database versions, so one business can appear twice with slightly different names, addresses or coordinates. But malls and outlet centers put many real stores at one address, so merging automatically would delete good records. A detection script flags candidates in three tiers (Exact, Near, Needs Review) and removes nothing on its own. A reviewer decides in the Deduper app, and each decision is cached and reapplied on every later run, so a rerun never asks a settled question twice.',
      },
      {
        lead: 'Final review',
        text: 'Every record is checked against Google Maps in a Final Review app and saved as Keep or Remove. An optional scraper looks up each entry’s current status: closed places sort to the top, and the rest are ranked by how well the Overture name and address match Google’s, so review time goes to the worst matches first.',
      },
      {
        lead: 'Publish',
        text: 'Python (arcpy) scripts import and merge the data into file geodatabases in ArcGIS Pro, conformed to Ecology GIS standards (EPSG 2927, US Survey Feet). The result is published to Ecology’s portal as a hosted feature layer, with view layers feeding the Experience Builder app.',
      },
    ],
    result: [
      '2,445 verified places statewide, up from about 260: an 840% increase in coverage. About 1,800 come from Overture and about 600 from bin locators. The Deduper removed x,xxx duplicates, and final review removed x,xxx more.',
      'We placed 3rd in the Dick Thomas Award, WAGISA’s annual student presentation competition, judged live by a panel of GIS professionals at the Washington GIS Conference. The working app drew questions in the Q&A, and the team was featured in WAGISA’s DTA Summit Scoop blog.',
      'Delivered to Ecology in early July 2026, and the public app has been live since September 2026. At the Pacific Northwest Textile Symposium in May, our project sponsor, who had just seen this app, asked whether the symposium’s paper pin map could go digital, which became my next project.',
    ],
  },
};
