// Table of contents: every project, in card order. Each project is a page
// folder in content/projects/<field>/ (field folders sort the files only;
// they aren't part of the URL). How to build pages: content/helpers.js.
import {groupPage} from './helpers.js';
import textileResaleEconomy from './projects/gis/textile-resale-economy/index.js';
import textileContacts from './projects/gis/textile-contacts/index.js';

export default groupPage('index', 'Seth Borne', [textileResaleEconomy, textileContacts]);
