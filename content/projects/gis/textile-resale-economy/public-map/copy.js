// Generated from public-map.docx by tools/copy_sync.py. Do not edit:
// change the doc, then run
//   python tools/copy_sync.py textile-resale-economy --write
// Read by index.js through fromCopy() (content/helpers.js).

export default {
  title: 'Public App',
  summary: 'Public Experience Builder map of all 2,445 places, live on Ecology’s portal. Built and styled by my teammate Chelsea on view layers I published from the pipeline.',
  content: {
    tryThis: 'Pick a category, then click a place to see what it offers. [?]',
    openLabel: 'Open the App on the Ecology Portal',
  },
  linksTitle: 'Live on the Ecology Portal',
  links: [
    {
      label: 'Washington State Textile Secondary Resale Economy Map',
      href: 'https://gis.ecology.wa.gov/portal/apps/experiencebuilder/experience/?id=02269b68b2ba43618e1583aba7d3ca1e',
    },
  ],
  writeup: {
    tldr: [
      'The public face of the dataset: an Experience Builder app of all 2,445 places, live on Ecology’s ArcGIS Enterprise portal since September 2026.',
      'Chelsea designed and styled the app. I published the hosted feature layer and the view layers it reads from.',
    ],
    stack: [
      'Experience Builder',
      'ArcGIS Enterprise Portal',
      'ArcGIS Pro',
      'arcpy',
    ],
    situation: 'RMDC needed a way for anyone in Washington to find a place to resell, repair, rent, maintain or donate textiles, without downloading a dataset or knowing GIS.',
    task: 'Put the pipeline’s output in front of the public on Ecology’s own portal, so RMDC owns the app and its data after the capstone ends.',
    action: [
      {
        lead: 'Data layers',
        text: 'The pipeline’s arcpy scripts publish one hosted feature layer, conformed to Ecology GIS standards. View layers on top of it expose only the public fields, so the app never reads the working data directly. [?]',
      },
      {
        lead: 'App',
        text: 'Chelsea built the Experience Builder app on those view layers: a statewide map of the 5 groups and 17 categories, with each place’s details a click away. [?]',
      },
      {
        lead: 'Updates',
        text: 'A pipeline rerun overwrites the hosted layer, and the views and the app pick up the new records with no changes of their own. [?]',
      },
    ],
    result: 'Live on Ecology’s portal since September 2026. At the Pacific Northwest Textile Symposium, our project sponsor, who had just seen this app, asked whether the symposium’s paper pin map could go digital, which became my next project.',
  },
};
