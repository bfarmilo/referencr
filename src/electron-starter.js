const electron = require('electron');
const { app, ipcMain, BrowserWindow, dialog } = electron;
const { PDFWindow, getHighlightCoords } = require('./processtext');

const path = require('path');
const url = require('url');
const fse = require('fs-extra');

let exhibitFile = 'exhibitlist.json';
let exhibitDir = `${process.argv[2]}\\`;
let dropBoxPath = '';
let exhibitList = {};
let screenWidth = 0;
let screenHeight = 0;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let openExhibits = new Map();
let devMode = false;

console.log(`did exhibitDir get passed as a command-line argument ? ${exhibitDir === 'undefined\\' ? 'no' : 'yes'}`);

// get dropbox path if exhibitDir is specified
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
    //BrowserWindow.addDevToolsExtension(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/0.15.6_0');
    // Create the browser window.
    mainWindow = new BrowserWindow(
        {
            width: 1440,
            height: screenHeight - 50,
            x: 10,
            y: 50,
            webPreferences: {
                webSecurity: false
            }
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
        // probably need to catch a 'close' and put all of the other windows down first
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
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.

        mainWindow = null
    })
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('window_ready', () => {
    // main process
    console.log(`Main: received window ready message from renderer window`);
    // send the full path to the exhibitfile to the renderer window, used to locate files
    mainWindow.webContents.send('exhibitpath', `${devMode ? '.\\public\\' : `${dropBoxPath}${exhibitDir}`}`);
    // now read the exhibit list into a local object

    fse.readJSON(`${devMode ? `.\\public\\` : `${dropBoxPath}${exhibitDir}`}${exhibitFile}`, (error, resultObj) => {
        if (error) console.log(error);
        exhibitList = resultObj;
        mainWindow.webContents.send('new_folder', exhibitList);
        console.log(`Main: exhibitList sent to render window`);
    });
});


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
        console.log(`Main: screen size ${screenWidth}x${screenHeight}: x position ${screenWidth - 768} height ${screenHeight - 50}`);

        const viewerWindow = new PDFWindow({
            width: 768,
            height: screenHeight - 50,
            x: screenWidth - 768,
            y: 50,
            title: `${exhibitNo} - ${exhibitList[exhibitNo].alias || exhibitList[exhibitNo].title}`,
            transparent: true,
            autoHideMenuBar: true,
            webPreferences: {
                webSecurity: false
            }
        })
        
        viewerWindow.on('page-title-updated', (event) => {
            // don't let the window override the title
            event.preventDefault();
        });

        // Emitted when the window is closed.
        viewerWindow.on('closed', function () {
            console.log(`Main: window closed: ${exhibitNo}`);
            openExhibits.delete(exhibitNo);
        });

        viewerWindow.loadURL(`${dropBoxPath}${exhibitDir}${exhibitList[exhibitNo].file}${exhibitList[exhibitNo].hasOwnProperty('offset') ? `#page=${exhibitList[exhibitNo].offset}` : ''}`);
        // viewerWindow.webContents.openDevTools();
        openExhibits.set(exhibitNo, viewerWindow);
    }
});