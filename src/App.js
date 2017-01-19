import React, { Component } from 'react';

import MyPdfViewer from './pdfmain';
import MyEditor from './editormain';
import './App.css';

const pageJump = 5;
const resetHeight = 5000;
let scrollPos = 0;
let totalHeight = resetHeight;
let status = "ready";

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
      activeExhibit: "Ex9999",
      pages: 2,
    }
    this.handleNewFile = this.handleNewFile.bind(this);
    this.checkScroll = this.checkScroll.bind(this);
    this.updateWindowHeight = this.updateWindowHeight.bind(this);
  }

  componentDidMount() {
    window.addEventListener('scroll', (e) => this.checkScroll(e));
  }

  handleNewFile(exhibitKey) {
    //totalHeight = resetHeight;
    document.body.scrollTop = 0;
    console.info(`App: new exhibit request received: ${exhibitKey}`);
    this.setState({ activeExhibit: exhibitKey, pages: 2 });
  }

  checkScroll(event) {
    scrollPos = document.body.scrollTop;
    if (status === "ready" && (scrollPos > totalHeight)) {
      status = 'loading';
      this.setState({ pages: (this.state.pages + pageJump) });
    }
  }

  updateWindowHeight(newHeight) {
    if (totalHeight !== newHeight) {
      totalHeight = newHeight;
      status = "ready";
      console.info(`App: window height update received, now ${totalHeight}`);
    }
  }

  render() {
    return (
      <div className="App">
        <div className="Display-area">
          <div className="Edit-area">
            <div className="Edit-top"> </div>
            <MyEditor onUserInput={this.handleNewFile} />
          </div>
          <div className="Pdf-area" id="Viewer-area">
            <Controls />
            <MyPdfViewer pages={this.state.pages} onNewHeight={this.updateWindowHeight} exhibit={this.state.activeExhibit} />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
