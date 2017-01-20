// takes an exhibit list (in plaintext) and directory as input and creates an exhibitlist.json file in the /public folder
// should include logic for extracting as much info as possible programmatically, including:
/*  "ExXXXX": {
        "path": "/Ex2050.pdf", //relative to app's 'public' directory
        "author": "Harvey",
        "title": "Patent Application Ser. No. 08/485,507",
        "alias": "'81 patent application",
        "exhibit": 2050,
        "type": "num_line",
        "offset": 0
        }
*/
// valid types are 'num_line' for exhibits with line numbering, 'num_para' for exhibits with paragraph numbering, 'num_col_line', for patents, '' for page numbering only
// if author and alias can't be figured, everything goes in title
// offset is the number of pages to skip before rendering (ie for patents, usually skip images)

import fse from 'fs-extra';

module.exports = getexhibit;

function getexhibit (exhibitList, exhibitDir) {

}