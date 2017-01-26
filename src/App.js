import React, { Component } from 'react';

import MyPdfViewer from './pdfmain';
import MyEditor from './editormain';
//import exhibits from '../example/exhibitlist.json';
import exhibits from 'C:/Users/Bill/Documents/Dropbox (PMC)/PMC Public/Licensing/Clients/Samsung/IPR/IPR2017-00288/exhibitlist.json';
import './App.css';
import '../node_modules/pdfjs-dist/web/pdf_viewer.css';
//import { ipcRenderer } from 'electron';
//import { ipcRenderer } from '../node_modules/electron';

const pageJump = 5;
let topHeight = 0;
let scrollPos = 0;
let totalHeight = 5000;
let status = "ready";
//let exhibits = {};

class Controls extends React.Component {
  //includes controls for clipping text
  //optionally hiding background images
  //also stores state (Exhibit, pageNo, LineStart, LineEnd, CharStart, Charend)
  //
  render() {
    return (
      <nav className="Pdf-controls">
        <ul className="Pdf-control-buttons">
          <li>button1</li>
          <li>button2</li>
          <li>button3</li>
        </ul>
      </nav>
    )
  }
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeExhibit: "meta",
      pages: 2,
      exhibits: {}
    }
    this.handleNewFile = this.handleNewFile.bind(this);
    this.checkScroll = this.checkScroll.bind(this);
    this.updateWindowHeight = this.updateWindowHeight.bind(this);
    this.handleNewDir = this.handleNewDir.bind(this);
  }

  componentDidMount() {
    window.addEventListener('scroll', (e) => this.checkScroll(e));
    /*fs.readFile('C:/Users/Bill/Documents/Dropbox (PMC)/PMC Public/Licensing/Clients/Samsung/IPR/IPR2017-00288/exhibitlist.json', data => {
      console.log(JSON.parse(data));
      this.setState({exhibits: JSON.parse(data)});
    });
    */
    /*
    ipcRenderer.on('new_folder', exlist => {
      console.log(`Index: received data from Main process with exhibitlist`, exlist);
      this.handleNewDir(exlist);
    });
    */
  }

  handleNewDir(exhibits) {
      this.setState({exhibits});
      exhibits = this.state.exhibits;
  }

  handleNewFile(exhibitKey) {
    //totalHeight = resetHeight;
    document.body.scrollTop = 0;
    topHeight = 0;
    status = 'newFile';
    console.info(`App: new exhibit request received: ${exhibitKey}, status = ${status}`);
    this.setState({ activeExhibit: exhibitKey, pages: 2 });
  }

  checkScroll(event) {
    scrollPos = document.body.scrollTop;
    console.info(`scrolling ${scrollPos} / ${totalHeight}`)
    if (status !== 'loading' && (scrollPos > totalHeight)) {
      status = 'loading';
      console.info(`page jump requested:`, scrollPos, totalHeight)
      this.setState({ pages: (this.state.pages + pageJump) });
    }
  }

  updateWindowHeight(newHeight) {
    if (status === 'newFile') {
      totalHeight = 5000;
      let jumpToPage = exhibits[this.state.activeExhibit].offset;
      console.info(`App: Jumping to page ${jumpToPage+1}`);
      topHeight = jumpToPage > 0 ? newHeight.slice(0,jumpToPage).reduce((a,b) => a+b): 0;
      console.info(`App: height recieved for new file, scroll target ${topHeight}`);
      console.info(`jumping to new scroll target ${topHeight}`);
      document.body.scrollTop = topHeight;
      status = 'loading';  
  }
    //status = 'loading';
    if (newHeight.length > 0)
    if (totalHeight !== newHeight.reduce((a,b) => a+b)) {
      totalHeight = newHeight.reduce((a,b) => a+b);
      status = 'ready';
      console.info(`App: window height update received, now ${totalHeight}`);
    }
  }

  render() {
    let editTop = <div className="Edit-top">waiting for file</div>
    let editor = <div className="Editor"> </div>
    let viewer = <div className="pdf-viewer"> </div>
    if (exhibits.hasOwnProperty("meta")) {
      editTop = <div className="Edit-top">IPR {exhibits.meta.matter.IPR} (patent {exhibits.meta.matter.Patent}) {exhibits.meta.matter.Party} exhibits </div>;
      editor = <MyEditor onUserInput={this.handleNewFile} exhibitfile={exhibits} />;
      viewer = <MyPdfViewer pages={this.state.pages} onNewHeight={this.updateWindowHeight} rootpath={exhibits.meta.path} exhibit={exhibits[this.state.activeExhibit]} />;
    }
    return (
      <div className="App">
        <div className="Display-area">
          <div className="Edit-area">
            {editTop}
            {editor}
          </div>
          <div className="Pdf-area" id="Viewer-area">
            <Controls />
            {viewer}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
