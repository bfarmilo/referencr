//TODO: modify exhibit handler to deal with file arrays (open all files simultaneously ?)
//TODO: modify exhibit handler to deal with offsets (save last page as offset ?)
//TODO: allow resizing of PDF windows, or resize to better default zoom level (landscape width and height/width zoom level)
//TODO: allow search exhibits by alias
//TODO: add an alias and a default offset to the exhibitList.json
//TODO: make exhibitlist generator more complete, take offline
//TODO: Better start screen so people know what to do

const electron = require('electron');
const { app, ipcMain, BrowserWindow, dialog, shell, Menu } = electron;
const { PDFWindow, getHighlightCoords } = require('./processtext');

const path = require('path');
const url = require('url');
const fse = require('fs-extra');
const os = require('os');

const defaultWidth=1024;
const mainPage = `file://${__dirname}/mdedit.html`
//mainPage is the markdownify page

let exhibitFile = 'exhibitlist.json';
let exhibitDir = `${process.argv[2]}\\`;
let dropBoxPath = '';
let exhibitList = {};
let screenWidth = 0;
let screenHeight = 0;
let mainWindow;
let openExhibits = new Map();
let devMode = false;

console.log(`did exhibitDir get passed as a command-line argument ? ${exhibitDir === 'undefined\\' ? 'no' : 'yes'}`);

// get dropbox path if exhibitDir is passed as an argument
if (exhibitDir !== 'undefined\\') {
    fse.readJSON(`${process.env.LOCALAPPDATA}//Dropbox//info.json`, 'utf8', (err2, dropbox) => {
        if (err2) {
            console.log(dialog.showErrorBox('Dropbox Error', `Error getting Dropbox path: ${err2}`));
            return;
        }
        dropBoxPath = `${dropbox.business.path}\\`;
        console.log(`Main: Good DropBox Path:${dropBoxPath}`);
    });
}


function createWindow() {
    screenWidth = electron.screen.getPrimaryDisplay().workAreaSize.width;
    screenHeight = electron.screen.getPrimaryDisplay().workAreaSize.height;
    // BrowserWindow.addDevToolsExtension(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/2.0.12_0');
    // Create the browser window.
    mainWindow = new BrowserWindow(
        {
            width: 1440,
            height: screenHeight - 50,
            x: 10,
            y: 50,
            webPreferences: {
                webSecurity: false
            },
            icon: path.join(__dirname, '/../public/icon.ico')
        });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    devMode = process.env.ELECTRON_START_URL;

    if (exhibitDir === 'undefined\\') {
        dialog.showOpenDialog(mainWindow, {
            filters: [{name: "Exhibit Reference", extensions: ['json'] }]
        }, (selectDir) => {
            exhibitDir = selectDir[0].split(exhibitFile)[0];
            console.log(`exhibitDir updated to ${dropBoxPath}${exhibitDir}`);
            console.log(`Main: ${devMode ? `DevMode ` : `Build Mode `}loading file at ${startUrl}`);
            // and load the index.html of the app.
            mainWindow.loadURL(startUrl);
            // Add the react tools and Open the DevTools.
            // mainWindow.webContents.openDevTools();
        });
    } else {
        console.log(`Main: ${devMode ? `DevMode ` : `Build Mode `}loading file at ${startUrl}`);
        // and load the index.html of the app.
        mainWindow.loadURL(startUrl);
        // Add the react tools and Open the DevTools.
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('close', (e) => {
        // catch a 'close' of the main window and put all of the other windows down first
        console.log(`Main: closing application${openExhibits.size > 0 ? `, first closing ${openExhibits.size} Exhibits` : ''}`);
        if (openExhibits.size > 0) {
            openExhibits.forEach( (win, ex) => {
                console.log(`Main: closing ${ex}`);
                win.close();
            });
        }
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object
        mainWindow = null
    });
//Set native menubar
  var template = [
    {
      label: "&File",
      submenu: [
        {label: "New", accelerator: "CmdOrCtrl+N", click: () => {
          var focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-new');
        }},
        {label: "Open", accelerator: "CmdOrCtrl+O", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-open');
        }},
        {label: "Save", accelerator: "CmdOrCtrl+S", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-save');
        }},
        {label: "Save As", accelerator: "CmdOrCtrl+Shift+S", click: () => {
          var focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-save-as');
        }},
        {label: "Save As PDF", accelerator: "CmdOrCtrl+Shift+P", click: () => {
          focusedWindow.webContents.send('file-pdf');
        }},
        {label: "Quit", accelerator: "Command+Q", click: app.quit}
      ]
    },
    {
      label: "&Edit",
      submenu: [
        {label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo"},
        {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo"},
        {type: "separator"},
        {label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut"},
        {label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy"},
        {label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste"},
        {label: "Select All", accelerator: "CmdOrCtrl+A", role: 'selectall'},
        {type: "separator"},
        {label: "Search", accelerator: "CmdOrCtrl+F", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('ctrl+f');
        }},
        {label: "Replace", accelerator: "CmdOrCtrl+Shift+F", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('ctrl+shift+f');
        }}
      ]
    },
    {
      label: "&View",
      submenu: [
        {label: "Toggle Full Screen", accelerator:"F11", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          let isFullScreen = focusedWindow.isFullScreen();
          focusedWindow.setFullScreen(!isFullScreen);
        }}
      ]
    },
    {
      label: "&Help",
      submenu: [
        {label: "Documentation", click:  () => {
          shell.openExternal(Config.repository.docs);
        }},
        {label: "Report Issue", click: () => {
          shell.openExternal(Config.bugs.url);
        }},
        {label: "About Markdownify", click: () => {
          dialog.showMessageBox({title: "About Markdownify", type:"info", message: "A minimal Markdown Editor desktop app. \nMIT Copyright (c) 2016 Amit Merchant <bullredeyes@gmail.com>", buttons: ["Close"] });
        }}
      ]
    }
  ];

  ipcMain.on('print-to-pdf', (event, filePath) => {

    const win = BrowserWindow.fromWebContents(event.sender)
    // Use default printing options
    win.webContents.printToPDF({pageSize: 'A4'}, (error, data) => {
      if (error) throw error
      fs.writeFile(filePath, data, (error) => {
        if (error) {
          throw error
        }
      })
    })

  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Registering shortcuts for formatting markdown
  var focusedWindow = BrowserWindow.getFocusedWindow();
  localShortcut.register('CmdOrCtrl+b', () => {
      focusedWindow.webContents.send('ctrl+b');
  });

  localShortcut.register('CmdOrCtrl+i', () => {
      focusedWindow.webContents.send('ctrl+i');
  });

  localShortcut.register('CmdOrCtrl+/', () => {
      focusedWindow.webContents.send('ctrl+/');
  });

  localShortcut.register('CmdOrCtrl+l', () => {
      focusedWindow.webContents.send('ctrl+l');
  });

  localShortcut.register('CmdOrCtrl+h', () => {
      focusedWindow.webContents.send('ctrl+h');
  });

  localShortcut.register('CmdOrCtrl+Alt+i', () => {
      focusedWindow.webContents.send('ctrl+alt+i');
  });

  localShortcut.register('CmdOrCtrl+Shift+t', () => {
      focusedWindow.webContents.send('ctrl+shift+t');
  });

  tray.create(mainWindow);
}




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// ipc events



// when the react app is ready it will send this ipc call
ipcMain.on('window_ready', () => {
    console.log(`Main: received window ready message from renderer window`);
    // send the full path to the exhibitfile to the renderer window, used to locate files
    mainWindow.webContents.send('exhibitpath', `${devMode ? '.\\public\\' : `${dropBoxPath}${exhibitDir}`}`);
    // now read the exhibit list into a local object
    fse.readJSON(`${devMode ? `.\\public\\` : `${dropBoxPath}${exhibitDir}`}${exhibitFile}`, (error, resultObj) => {
        if (error) console.log(error);
        exhibitList = resultObj;
        mainWindow.webContents.send('new_folder', exhibitList);
        mainWindow.title = `${exhibitList.meta.matter.Patent} ${exhibitList.meta.matter.Party} ${exhibitList.meta.doctype}`;
        console.log(`Main: exhibitList sent to render window`);
    });
});

// when the react app selects a PDF for viewing, this ipc call is trapped
ipcMain.on('select_viewer', (event, exhibitNo) => {
    console.log(`Main: received call to activate pdf viewer window for ${exhibitList[exhibitNo].file}`);
    let alreadyOpen = false;
    // check to see if window already opened - if so just give it the focus 
    if (openExhibits.has(exhibitNo)) {
        console.log(`Main: match found with id ${openExhibits.get(exhibitNo).id}`)
        BrowserWindow.fromId(openExhibits.get(exhibitNo).id).focus();
        alreadyOpen = true;
    };

    if (!alreadyOpen) {
        //else open new window
        console.log(`Main: screen size ${screenWidth}x${screenHeight}: x position ${screenWidth - defaultWidth} height ${screenHeight - 50}`);
        // create the new browserwindow object
        const viewerWindow = new PDFWindow({
            width: defaultWidth,
            height: screenHeight - 50,
            x: screenWidth - defaultWidth,
            y: 50,
            title: `${exhibitNo} - ${exhibitList[exhibitNo].alias || exhibitList[exhibitNo].title}`,
            transparent: true,
            autoHideMenuBar: true,
            webPreferences: {
                webSecurity: false
            },
            icon: path.join(__dirname, '/../public/icon.ico')
        })
        // trap any attempt to change the window title
        viewerWindow.on('page-title-updated', (event) => {
            event.preventDefault();
        });

        // When the exhibit is closed, delete it from the map of open exhibits
        viewerWindow.on('closed', function () {
            console.log(`Main: window closed: ${exhibitNo}`);
            openExhibits.delete(exhibitNo);
        });

        // now open the window
        viewerWindow.loadURL(`${dropBoxPath}${exhibitDir}${exhibitList[exhibitNo].file}${exhibitList[exhibitNo].hasOwnProperty('offset') ? `#page=${exhibitList[exhibitNo].offset}` : ''}`);
        // viewerWindow.webContents.openDevTools();
        openExhibits.set(exhibitNo, viewerWindow);
    }
});