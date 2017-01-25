// takes an exhibit list (in plaintext) and directory as input and creates an exhibitlist.json file in the /public folder
//metadata includes
/*  "meta": {
        "matter": {
            "IPR": "IPR2017-00288",
            "Patent": 7747217,
            "Party": "Samsung"
        },
        "path": "PMC Public\\Licensing\\Clients\\Samsung\\IPR\\IPR2017-00288",
        "regexMatch": "SAM-(\\d{4})((.*?)(?=\\(\\u201c)\\(\\u201c(.*)\\u201d\\)|(.*)\\n)",
        "regexReplace": "\"Ex$1\": {\\n  \"title\":\"$3$5\",\\n  \"exhibit\":\"$1\",\\n  \"alias\":\"$4\"\\n  }\\n"
    },

// so use `${dropboxpath}${meta.path}${Ex####.path}` to get the full path to the pdf files, warning may need to copy them over to the src directory to allow them to be served ?
// meta.matter.IPR or .Patent or .Party for storing this data -- need a way to write this data in as well.

*/

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

//import fse from 'fs-extra';
const fse = require('fs-extra');
let dropboxPath = ''; // keeps the path to the local dropbox
let exhibitList = {};
let exhibitDir = 'PMC Public/Licensing/Clients/Samsung/IPR/IPR2017-00288\\'; // think this will resolve to public
const exhibitFile = 'exhibitlist.json'

module.exports = getexhibit;

function getexhibit(exhibitList, exhibitDir) {
        fse.readFile(`${process.env.LOCALAPPDATA}//Dropbox//info.json`, 'utf8', (err2, pathdata) => {
                if (err2) {
                        console.log(dialog.showErrorBox('Dropbox Error', `Error getting Dropbox path: ${err2}`));
                        return;
                }
                // first, get the path to the local Dropbox folder and change the \ to /
                dropboxPath = `C:/${JSON.parse(pathdata).business.path.match(/:\\(.+)/)[1].replace(/\\/g, '/')}/`;
                console.log(`Good DropBox Path:${dropboxPath}`);
                // now read the exhibit list into a local object
                fse.readJSON(`${dropboxPath}${exhibitDir}${exhibitFile}`, (error, resultObj) => {
                        if (error) console.log(error);
                        exhibitList = resultObj;
                        console.log(`got exhibitList:`, exhibitList);
                        fse.readdir(`${dropboxPath}${exhibitDir}`, (error, files) => {
                                // files is an array of names
                                // go through each exhibit number and look for a match -- assume file name includes Ex.*\d{4} at least - TODO: let user modify
                                // then drop the file from the array
                                for (let ex in exhibitList) {
                                        if (exhibitList.hasOwnProperty(ex)) {
                                                console.log(!exhibitList[ex].hasOwnProperty('path'));
                                                if (ex !== 'meta' && !exhibitList[ex].hasOwnProperty('path')) {
                                                        let exNumber = exhibitList[ex].exhibit;
                                                        console.log(`ex: ${ex}, number: ${exhibitList[ex].exhibit} or ${exNumber}`);
                                                        let matchName = files.filter((v, i) => {
                                                                return v.match(exNumber)
                                                        });
                                                        console.log(`match element: `, matchName);
                                                        // how to deal with multi-part exhibits - leave it as an array
                                                        if (matchName.length === 1) {
                                                                exhibitList[ex].path = `${matchName.toString()}`;
                                                        } else {
                                                                exhibitList[ex].path = matchName;
                                                        }

                                                }
                                        }
                                }
                                console.log(`writing new exhibitList`, exhibitList);
                                fse.writeJSON(`${dropboxPath}${exhibitDir}${exhibitFile}`, exhibitList, ((error) => {
                                        if (error) console.log(error);
                                }));
                        });
                });
        });

}

getexhibit(exhibitList, exhibitDir);
