// Survey Map writeup: the project's story, STAR style, shown on its
// group page (#/survey-map) by components/writeup/.
// Plain data, one key per part. A string is one paragraph; an array is
// several. action items are {lead, text}: lead is the bold label.
// No em-dashes; technical framing first, origin story second.

export default {
  tldr: [
    'Turned a paper pin map into a live GIS web app for the Recycling ' +
      'Market Development Center: a Survey123 form feeds a public ' +
      'Experience Builder map and an internal review app.',
    'Follow-on work: our capstone sponsor asked for it after seeing our ' +
      'capstone app. Approved by the sponsor and an internal review ' +
      'board, and live since September 2026.',
    'Prototyped in ArcGIS Online, then rebuilt in a state ArcGIS ' +
      'Enterprise Portal about 18 months of releases behind, with the ' +
      'data schema redesigned to fit.',
  ],
  stack: [
    'Survey123 Connect',
    'Experience Builder',
    'ArcGIS Online',
    'ArcGIS Enterprise Portal',
  ],
  situation: [
    'The Recycling Market Development Center (RMDC) is a collaboration ' +
      'between the Washington State Departments of Ecology and Commerce, ' +
      'and the client for our capstone. At its symposium on May 15, ' +
      '2026, the sign-in table had a paper map of Washington. Each ' +
      'attendee added a pin, colored by their role in the textile ' +
      'resale economy.',
    'Our project sponsor had just seen the Experience Builder app from ' +
      'our capstone and asked whether we could do the same for that map. ' +
      'We had covered Survey123 in class the week before, so I asked for ' +
      'a few weeks: I had an idea.',
  ],
  task:
    'Turn a one-day paper map into a directory that keeps growing. ' +
    'Anyone in the textile resale economy can add themselves, anyone ' +
    'can find contacts near them, and Ecology staff decide what goes ' +
    'public.',
  action: [
    {
      lead: 'Survey123 form',
      text:
        'Built in Survey123 Connect. It collects contact details, role ' +
        'and location, and gives every entry a status field set to ' +
        'Approved by default.',
    },
    {
      lead: 'Public map',
      text:
        'An Experience Builder app showing Approved entries on a map of ' +
        'Washington. Pins are colored by role, a popup shows contact ' +
        'details, and Search and Near Me widgets help people find ' +
        'contacts close to them.',
    },
    {
      lead: 'Internal review app',
      text:
        "An Experience Builder app where an Ecology auditor changes an " +
        "entry's status: Pending review (needs more research), Rejected " +
        "(doesn't meet Ecology's standards) or Archived (out of date). " +
        'Only Approved entries appear on the public map.',
    },
    {
      lead: 'From ArcGIS Online to Portal',
      text:
        'I prototyped in my own ArcGIS Online account, then rebuilt in ' +
        "the state's ArcGIS Enterprise Portal, about 18 months of " +
        'releases behind. View layers were set up differently and table ' +
        "views had fewer options. The Portal's Table widget couldn't " +
        'join two tables, so I flattened the schema, including how the ' +
        'survey stores social media accounts.',
    },
    {
      lead: 'Design',
      text:
        'Chelsea, my capstone teammate, who built our capstone ' +
        'Experience Builder app, worked with me on art direction and ' +
        'answered my Experience Builder questions.',
    },
  ],
  result: [
    'The sponsor and an internal review board approved it. Built over ' +
      'July and August 2026, it went live in September.',
    'The demos on these pages are mockups in my own ArcGIS Online ' +
      'account, so all three pieces can be tried, including the ' +
      "internal app, which isn't public on the live site.",
  ],
};
