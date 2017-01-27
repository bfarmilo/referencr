import React, { Component } from 'react';

import MyPdfViewer from './pdfmain';
import MyEditor from './editormain';
import './App.css';
import '../node_modules/pdfjs-dist/web/pdf_viewer.css';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

const pageJump = 5;
let topHeight = 0;
let scrollPos = 0;
let totalHeight = 5000;
let status = "ready";
let dropboxpath='';

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
    ipcRenderer.on('new_folder', (event, exlist) => {
      //console.log(`App: received data from Main process with exhibits`, exlist);
      this.handleNewDir(exlist);
    });
    ipcRenderer.on('dropbox', (event, dbpath) => {
      console.info(`App: got dropbox path ${dbpath}`)
      dropboxpath = dbpath;
    })
    //console.log(`App: sending ready message to main process`);
    ipcRenderer.send('window_ready');
  }

  handleNewDir(exhibits) {
      this.setState({exhibits});
      console.info(`App: received request for updating exhibits path ${dropboxpath}${this.state.exhibits.meta.path} state`, exhibits);
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
      let jumpToPage = this.state.exhibits[this.state.activeExhibit].offset;
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
    if (this.state.exhibits.hasOwnProperty("meta")) {
      editTop = <div className="Edit-top">{this.state.exhibits.meta.matter.IPR} (patent {Number(this.state.exhibits.meta.matter.Patent).toLocaleString()})</div>;
      editor = <MyEditor onUserInput={this.handleNewFile} exhibitfile={this.state.exhibits} />;
      viewer = <MyPdfViewer pages={this.state.pages} onNewHeight={this.updateWindowHeight} rootpath={`${dropboxpath}${this.state.exhibits.meta.path}`} exhibit={this.state.exhibits[this.state.activeExhibit]} />;
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
