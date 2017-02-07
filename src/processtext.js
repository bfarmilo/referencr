// processes the textlayer divs on each page
/*
DOM structure is 
... 
  <div id="pageContainer#">
    <div class="textLayer">
       <div style="left: ###px; top: ###px; transform: "> the text </div>
       ...
    </div>
  </div>

*/
const PDFWindow = require('electron-pdf-window');

// boilerplate: Format is showHighlight(getHighlightCoords())

module.exports = {
    getHighlightCoords,
    PDFWindow,
};

// probably need a way to catch a request for a new pdf window here and control the loading etc.

function getHighlightCoords() {
    let pageIndex = PDFViewerApplication.pdfViewer.currentPageNumber - 1; 
    let page = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
    let pageRect = page.canvas.getClientRects()[0];
    let selectionRects = window.getSelection().getRangeAt(0).getClientRects();
    let viewport = page.viewport;
    let selected = [];
    console.log(`pageRect: `,pageRect);
    console.log(`selectionRects: `,selectionRects);
    for (let r of selectionRects) {
        console.log(r);
        selected.push(viewport.convertToPdfPoint(r.left - pageRect.left, r.top - pageRect.top).concat(
        viewport.convertToPdfPoint(r.right - pageRect.left, r.bottom - pageRect.top))); 
    };
    return {page: pageIndex, coords: selected};
}


function getColumnBounds() {
     // for a patent, figures out the bounds of column 1 and column 2
     // using the page number, stores the column associated with the selection
}

function getPageLines() {
    // looks at a typical page and returns an array of line numbers based on Y positions
    // on first selection, interface to draw box around lined areas, enter number of lines, start and end
    // for patents this should be basically automatic
}

function getSelectedLines() {
    // takes the selectionRects .top and .bottom to guess at line numbers
}