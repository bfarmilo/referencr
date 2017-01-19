import  React  from  'react';
import  PDFJS  from  'pdfjs-dist/build/pdf.js';
//import { getPageTextContent } from 'pdfjs-dist/web/pdf_viewer.js'; 
import exhibits from '../public/exhibitlist.json';
//import logo from './logo.svg';
//import {svgparse, clickedLine} from './svgparse.js';
import clickedLine from './svgparse.js'

//get rid of unneeded state and replace with these variables
let lastdrawn = 0; //Viewer.state.lastdrawn
//let lastload = 0; //Viewer.state.lastload
let viewheight = []; //pdf.state.height
//let lineArray = []; //page.state.linepositions

class PDF extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pdf: null,
      scale: 1.5,
    }
  }
  getChildContext() {
    return {
      pdf: this.state.pdf,
      scale: this.state.scale,
    }
  }

  componentDidMount() {
    PDFJS.getDocument(this.props.src).then((pdf) => {
      this.setState({ pdf });
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.src !== this.props.src) {
      console.log(`received new src`);
      PDFJS.getDocument(nextProps.src).then((pdf) => {
        this.setState({ pdf });
      });
    }
  }

  render() {
    return (
      <div className='pdf-context'>
        {this.props.children}
      </div>
    )
  }
}

PDF.propTypes = {
  src: React.PropTypes.string.isRequired
}

PDF.childContextTypes = {
  pdf: React.PropTypes.object,
  scale: React.PropTypes.number,
}

class Page extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      status: 'N/A',
      page: null,
      width: 0,
      height: 0,
      linepositions: []
    }
  }
  shouldComponentUpdate(nextProps, nextState, nextContext) {
    return this.context.pdf !== nextContext.pdf || this.state.status !== nextState.status
  }
  componentDidUpdate(nextProps, nextState, nextContext) {
    this._update(nextContext.pdf)
  }
  componentDidMount() {
    this._update(this.context.pdf)
  }

  _handleClick(event) {
    console.log(`${event.type} on tag ${event.target.tagName}`)
    if (event.target.tagName === "svg:tspan") {
      let test = clickedLine(event.target);
      console.log(`${test}`);
    } else {
      //something else was clicked, so take the mouse position and hope for the best
      console.log(`mouse y = ${event.clientY}`)
      //need to find nearest line. Note on at least one file the line range is -19/+10 so not symmetric
      //TODO: Better option - disable selection and do your own. 
      // a) disable mousedown/mouseup on anything other than tspans.
      // b) Click down on start character and end character, system interpolates text in between
      // c) Draw line grid over text, enable mousedown/mouseup on it !! 
    }
  }

  _update(pdf) {
    if (pdf) {
      this._loadPage(pdf)
    } else {
      this.setState({ status: 'loading' })
    }
  }
  _loadPage(pdf) {
    if (this.state.status === 'rendering' || this.state.page != null) return;
    pdf.getPage(this.props.index).then(this._renderPage.bind(this));
    this.setState({ status: 'rendering' })
  }

  // used to test if 1-bit is an svg problem
  _renderPage(page) {
    let { scale } = this.context;
    let viewport = page.getViewport(scale);
    let { width, height } = viewport;
    let canvas = this.refs.canvas;
    let context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    viewheight.push(height);  //add current page height to viewheight array
    this.props.getPageHeight(viewheight);

    //let canvasOffset = canvas.offset();
    //let textLayerDiv = this.refs.textlayer;

    page.render({
      canvasContext: context,
      viewport
    });

    /*
    PDFJS_View.getTextContent(page).then(function(textContent){
      let textLayer = new TextLayerBuilder({
          textLayerDiv : textLayerDiv.get(0),
          pageIndex : page_num - 1,
          viewport : viewport
      });

      textLayer.setTextContent(textContent);
      textLayer.render();
    });
    */
    this.setState({ status: 'rendered', page, width, height })
  }

  /*
  _renderPageSvg (page) {
    let { scale } = this.context
    let viewport = page.getViewport(scale)
    let { width, height } = viewport
    let container = this.refs.container

    container.style.width = width+'px'
    container.style.height = height+'px'

    this.setState({ status: 'rendered', page, width, height });

    let self = this;

    page.getOperatorList()
    .then(function (opList) {
      const svgGfx = new PDFJS.SVGGraphics(page.commonObjs, page.objs);
      return svgGfx.getSVG(opList, viewport);
    })
    .then(function (svg) {
      // call svg processor responsive to user buttons clicked
      // check state to see what to render
      // ie filter out svg tags that are background images if clicked
      // also count lines when approprate based on y values for text elements
      let cleansvg = (self.props.hideimages ? svgparse(svg, "NO_IMAGE") : svg);
      container.appendChild(cleansvg);
      return cleansvg;
    }).then((cleaned) => svgparse(cleaned, "GET_TEXT_Y"))
    .then((lineandtext) => self.setState({linepositions:lineandtext}));
  }
*/
  render() {
    let { width, height, status } = this.state
    if (this.state.status !== 'rendered') {

    }
    //let mountpoint = <div ref='container' onMouseDown={(e) => this._handleClick(e)} onMouseUp={(e) => this._handleClick(e)}/>
    let mountpoint = <canvas ref="canvas" onMouseDown={(e) => this._handleClick(e)} onMouseUp={(e) => this._handleClick(e)} />
    //let textmountpoint = <div ref="textlayer" height={viewport.height} width={viewport.width} top={canvasOffset.top} left={canvasOffset.left}> </div>

    return (
      <div className={`pdf-page ${status}`} style={{ width, height }}>
        {mountpoint}
      </div>
    )
  }
}

Page.propTypes = {
  index: React.PropTypes.number.isRequired,
  hideimages: React.PropTypes.bool
}
Page.contextTypes = PDF.childContextTypes

class Viewer extends React.Component {
  constructor(props) {
    super(props)
    this.state = { lastload: (this.props.pages) }
    lastdrawn = 0;
    this.updateNewHeight = this.updateNewHeight.bind(this);
  }

  componentWillReceiveProps(newProps) {

    if (newProps.exhibit !== this.props.exhibit) {
      console.log(`new exhibit received`);
      viewheight = [];
      lastdrawn = 0;
      this.setState({ lastload: newProps.pages })
    }

    if (newProps.pages !== this.props.pages) {
      console.log(`fetching up to page ${newProps.pages}`);
      this.setState({ lastload: newProps.pages })
    }
  }

  updateNewHeight(heightArray) {
    if (heightArray.length > 1) {
      heightArray = heightArray.slice(0, heightArray.length - 1);
    }
    this.props.newViewerHeight(heightArray.reduce((a, b) => a + b));
  }

  render() {
    let { pdf } = this.context
    let numPages = pdf ? pdf.pdfInfo.numPages : 0
    let fingerprint = pdf ? pdf.pdfInfo.fingerprint : 'none'
    let pages = Array.apply(null, { length: (numPages >= this.props.pages + this.props.offset) ? (this.props.pages + this.props.offset) : numPages })
      .map((v, i) => {
        if (i<this.props.offset) {
          return (<div id={`page ${i} not loaded`} key={`skipped-${i}`}></div>)
        }
        return (<Page id={`page${i + 1}`} index={i + 1} key={`${fingerprint}-${i}`} hideimages={this.props.hideimages} getPageHeight={this.updateNewHeight} />)
      });
    if (lastdrawn !== this.state.lastload) {
      lastdrawn = this.state.lastload;
    }

    return (
      <div className='pdf-viewer'>
        {pages}
      </div>
    )
  }
}
Viewer.contextTypes = PDF.childContextTypes

class MyPdfViewer extends React.Component {

  constructor(props) {
    super(props);
    this.getNewHeight = this.getNewHeight.bind(this);
  }

  getNewHeight(newHeight) {
    this.props.onNewHeight(newHeight);
  }

  render() {
    return (
      <PDF exhibit={this.props.exhibit} src={exhibits[this.props.exhibit].path} setInitialHeight={this.getNewHeight}>
        <Viewer hideimages={true} pages={this.props.pages} offset={exhibits[this.props.exhibit].offset} exhibit={this.props.exhibit} newViewerHeight={this.getNewHeight} />P
          </PDF>
    )
  }
}

module.exports = MyPdfViewer;