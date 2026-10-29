// Site content tree: the table of contents. Each project lives in its
// own folder, content/projects/<id>/, named after its id (and URL):
//   index.js    the project node and its pages
//   writeup.js  the project story, if it has one
// To add a project: make its folder, import it here, and add it to the
// list. The list order is the order of the cards on the site.
// How to build nodes: content/helpers.js.

import {groupPage} from './helpers.js';
import capstone from './projects/capstone/index.js';
import surveyMap from './projects/survey-map/index.js';

export default groupPage('index', 'Seth Borne', [capstone, surveyMap]);
