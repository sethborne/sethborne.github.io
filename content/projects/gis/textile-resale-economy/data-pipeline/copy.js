// Generated from data-pipeline.docx by tools/copy_sync.py. Do not edit:
// change the doc, then run
//   python tools/copy_sync.py textile-resale-economy --write
// Read by index.js through fromCopy() (content/helpers.js).

export default {
  title: 'Data Pipeline',
  summary: 'The steps between raw place records and the published dataset, with three browser tools for the parts that need a person.',
  writeup: {
    tldr: [
      'Five sources in, one dataset out: extract, conform, dedupe, review and publish, rerun with each new Overture release.',
      'Scripts do the repeatable work. Three browser tools handle the calls that need a person, and every decision is cached, so a rerun never asks the same question twice.',
    ],
    stack: [
      'Node.js',
      'Python',
      'DuckDB',
      'GeoParquet',
      'Nominatim',
      'JavaScript',
      'arcpy',
      'ArcGIS Pro',
    ],
    situation: 'Five sources each had their own fields, and one business could show up several times with slightly different names, addresses or coordinates. Malls and outlet centers made it harder: many real stores share one address, so merging duplicates automatically would delete good records.',
    task: 'A pipeline RMDC can rerun with each monthly Overture release, where scripts do everything repeatable and people only make the calls a script can’t.',
    action: [
      {
        lead: 'Extract',
        text: 'A Python script uses DuckDB to pull Washington records from Overture’s GeoParquet files.',
      },
      {
        lead: 'Conform',
        text: 'Node.js scripts map all five sources to Overture’s schema, validate fields on every run and geocode bin addresses through Nominatim.',
      },
      {
        lead: 'Dedupe',
        text: 'A script flags likely duplicates in three tiers and removes nothing on its own. A reviewer settles each one in the Deduper.',
      },
      {
        lead: 'Review',
        text: 'Every record is checked against Google Maps in Final Review, with closed places and poor matches first.',
      },
      {
        lead: 'Track',
        text: 'The Query Edit Tracker logs every manual query edit and charts record counts from run to run, so a change that drops good records shows up right away.',
      },
      {
        lead: 'Publish',
        text: 'arcpy scripts load the result into ArcGIS Pro and publish it to Ecology’s portal for the public app.',
      },
    ],
    result: 'Reviewed decisions are reapplied on every rerun, so only new candidates reach a person. The pipeline turned about 260 spreadsheet rows into 2,445 verified places.',
  },
};
