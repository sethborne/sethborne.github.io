// Washington State Textile Secondary Resale Economy (UW GIS capstone).
// Project page, #/textile-resale-economy. Each child page is a folder here.
// Structure only: copy comes from textile-resale-economy.docx via copy.js
// (tools/copy_sync.py). How to build pages: content/helpers.js.

import {fromCopy} from '../../../helpers.js';
import copy from './copy.js';
import publicMap from './public-map/index.js';
import dataPipeline from './data-pipeline/index.js';

// Children in card order
export default fromCopy(copy).groupPage('textile-resale-economy', [publicMap, dataPipeline]);
