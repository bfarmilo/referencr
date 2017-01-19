import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import MyPdfViewer from './pdfdiv';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
});

it('creates a pdf viewer window', () => {
  const div = document.createElement('div');
  ReactDOM.render(<MyPdfViewer />, div);
});
it('opens a pdf file based on a passed argument');
it('opens to a specific page based on a passed argument');
it('guesses line numbers for a file based on layout of text');
  it('reads a collection of svg elements and identifies text');
  it('builds an array of y-positions for each text element');
  it('guesses line numbers and displays the guesses on an interface');
  it('lets a user modify line number positions on a sample page');
  it('stores line numbers corresponding to y positions for a pdf in a json file');
it('figures out the line number on the current page of the start of a selection');
it('figures out the line number on the current page at the end of a selection');
it('figures out the character start and end in the current page');
it('produces a reference including the document, page, line start and line end, character start and character end');
