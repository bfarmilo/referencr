import  React  from  'react';
import  PDFJS  from  'pdfjs-dist/build/pdf.js';
import { textLayerBuilder } from 'pdfjs-dist/web/pdf_viewer.js'; 
import logo from './logo.svg';
//import {svgparse, clickedLine} from './svgparse.js';
import clickedLine from './svgparse.js'

//get rid of unneeded state and replace with these variables
let lastdrawn = 0; //Viewer.state.lastdrawn
//let lastload = 0; //Viewer.state.lastload
let viewheight = []; //pdf.state.height
//let lineArray = []; //page.state.linepositions

//-----------------------------------------------------------------------------

class PDF extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pdf: null,
      scale: 1.5,
    }
    this.sendNewHeight = this.sendNewHeight.bind(this);
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
      console.log(`PDF: will receive new src, resetting heights`);
      viewheight = [];
      this.setState ({pdf: null}); // do this to make sure the promise has time to resolve before re-rendering
      PDFJS.getDocument(nextProps.src).then((pdf) => {
        this.setState({ pdf });
      });
    }
  }

  sendNewHeight(heights) {
    this.props.newViewerHeight(heights);
  }

  render() {
    
    return (
      <div className='pdf-context'>
        <Viewer hideimages={true} exhibit={this.props.exhibit} pages={this.props.pages} offset={this.props.offset} newViewerHeight={this.sendNewHeight} />
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

//--------------------------------------------------------------------------

class PlaceHolder extends React.Component {

  render () {
    let height = 84; //logo div height is 84px
    viewheight.push(height);  //add current page height to viewheight array
    console.log(`Placeholder: added logo height ${height}`);
    return (<div><img src={logo} className="App-logo" alt="logo" /></div>)
  }
}

//--------------------------------------------------------------------------

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
    console.log(`Page: ${event.type} on tag ${event.target.tagName}`)
    if (event.target.tagName === "svg:tspan") {
      let test = clickedLine(event.target);
      console.log(`Page: clickedLine on tspan ${test}`);
    } else {
      //something else was clicked, so take the mouse position and hope for the best
      console.log(`Page: mouse y = ${event.clientY}`)
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
    console.log(`loading page ${this.props.index} with offset ${this.props.startPage}`)
    if (this.props.index > this.props.startPage) {
      pdf.getPage(this.props.index).then(this._renderPage.bind(this));
      this.setState({ status: 'rendering' })
    } else {
      this._skipPage(this.props.index);
    }
  }

  _skipPage(pageToSkip) {
    console.log(`page skipped ${pageToSkip}`);
    let canvas = this.refs.canvas;
    let context = canvas.getContext('2d');
    let width = 200;
    let height = 500;
    canvas.width = width;
    canvas.height = height;

    context.rect(5,5,width-10,height-10);
    context.stroke();

    //this.setState({ status: 'rendered', page: null, width, height })

  }

  _renderPage(page) {
    let { scale } = this.context;
    let viewport = page.getViewport(scale);
    let { width, height } = viewport;
    let canvas = this.refs.canvas;
    let context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    //let canvasOffset = canvas.offset();
    //let textLayerDiv = this.refs.textlayer;

    page.render({
      canvasContext: context,
      viewport
    });
    
    viewheight.push(height);  //add current page height to viewheight array
    console.log(`Page: added page height ${height}, calling for update`);
    this.props.getPageHeight(viewheight);
    
    /*
    PDFJS.getTextContent(page).then(function(textContent){
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
  // can't use since 1-bit inversion bug in SVG renderer
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
    let mountpoint = <canvas ref="canvas" onMouseDown={(e) => this._handleClick(e)} onMouseUp={(e) => this._handleClick(e)} />
    //let textmountpoint = <div ref="textlayer" height={height} width={width} top={canvasOffset.top} left={canvasOffset.left}> </div>

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

//-----------------------------------------------------------------------------

class Viewer extends React.Component {
  constructor(props) {
    super(props)
    this.state = { lastload: (this.props.pages) }
    lastdrawn = 0;
    this.updateNewHeight = this.updateNewHeight.bind(this);
  }

  componentWillReceiveProps(newProps) {

    if (newProps.exhibit !== this.props.exhibit) {
      console.log(`Viewer: will receive new exhibit ${newProps.exhibit}`);
      viewheight = [];
      lastdrawn = 0;
      this.setState({ lastload: newProps.pages })
    }

    if (newProps.pages !== this.props.pages) {
      console.log(`Viewer: will receive new pages, loading up to page ${newProps.pages}`);
      this.setState({ lastload: newProps.pages })
    }
  }

  updateNewHeight(heightArray) {
    console.log(`Viewer: heightarray = `, heightArray);
    if (heightArray.length > 1) {
      heightArray = heightArray.slice(0, heightArray.length - 1);
    }
    this.props.newViewerHeight(heightArray);
  }

  render() {
    let { pdf } = this.context
    let numPages = pdf ? pdf.pdfInfo.numPages : 0
    let fingerprint = pdf ? pdf.pdfInfo.fingerprint : 'none'
    let pages = Array.apply(null, { length: (numPages >= this.props.pages + this.props.offset) ? (this.props.pages + this.props.offset) : numPages })
      .map((v, i) => {
        return (<Page id={`page${i + 1}`} index={i + 1} key={`${fingerprint}-${i}`} hideimages={this.props.hideimages} getPageHeight={this.updateNewHeight} startPage={this.props.offset}/>)
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

//-----------------------------------------------------------------------------

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
      <PDF exhibit={this.props.exhibit.exhibit} src={this.props.exhibit.path} pages={this.props.pages} offset={this.props.exhibit.offset} newViewerHeight={this.getNewHeight} />
    )
  }
}

// refactor to have Viewer as proper component under PDF

module.exports = MyPdfViewer;