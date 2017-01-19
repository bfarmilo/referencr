# Referencr

A tool to navigate PDF legal exhibits and facilitate cite hyperlinking. Built in electron and create-react-app.

## Requirements

* A folder filled with exhibits in PDF form

## Current Version features

* Load exhibits by clicking on the link.
* Lazy-loading for improved responsiveness.

Currently very much a work-in-progress.

## Feature Backlog

1. Interface for selected exhibit text -> cite creation in clipboard (exhibit-page-[linestart-lineend])
   1. Interface to handle patent columns (exhibit-page-column-linestart-lineend)
1. Parse cites in PDF to create links to Exhibit tree
   1. Parse cites in MS Word to create links to Exhibit tree
1. Open exhibit to cite location based on clicked link in PDF
   1. + MS Word
1. Component to add exhibit folders
1. Component to add/edit exhibit metadata
1. Port JSON based metadata to some kind of Database