//TODO: modify exhibit handler to deal with file arrays (open all files simultaneously ?)
//TODO: modify exhibit handler to deal with offsets (save last page as offset ?)
//TODO: allow resizing of PDF windows, or resize to better default zoom level (landscape width and height/width zoom level)
//TODO: allow search exhibits by alias
//TODO: add an alias and a default offset to the exhibitList.json
//TODO: make exhibitlist generator more complete, take offline
//TODO: Better start screen so people know what to do

const electron = require('electron');
const { app, ipcMain, BrowserWindow, dialog } = electron;
const { PDFWindow, getHighlightCoords } = require('./processtext');
const exec = require('child_process').exec

const path = require('path');
const url = require('url');
const fse = require('fs-extra');

const defaultWidth=1024;

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
        mainWindow.setTitle(`${exhibitList.meta.matter.Patent} ${exhibitList.meta.matter.Party} ${exhibitList.meta.doctype}`);
        console.log(`Main: exhibitList sent to render window`);
    });
});

// when the react app wants to open an editor, this ipc call is trapped
ipcMain.on('open_editor', (event) => {
    // open VSCode with in a 'Comments' folder
    console.info(`Main: open editor captured, attempting to open "${dropBoxPath}${exhibitDir}..\\Comments"`)
    exec(`code "${dropBoxPath}${exhibitDir}..\\Comments"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Main: exec error: ${error}`);
            // fallback if code doesn't open -- open the Comments folder in File Explorer
            exec(`explorer "${dropBoxPath}${exhibitDir}..\\Comments"`, (e, stdo, stde) => {
                if (e) console.error(`Main: file explorer error ${e}`);
            })
            return;
        }
    })
})

// when the react app wants to open the Exhibit folder, this ipc call is trapped
ipcMain.on('open_ex_folder', (event) => {
    // open File Explorer in the 'Exhibits' folder
    console.info(`Main: open exhibit folder captured, attempting to open "${dropBoxPath}${exhibitDir}"`)
    // fallback if code doesn't open -- open the Exhibits folder in File Explorer
            exec(`explorer "${dropBoxPath}${exhibitDir}"`, (e, stdo, stde) => {
                if (e) console.error(`Main: file explorer error ${e}`);
            });
            return;
        });


function openPDFWindow(file, winTitle, offset, exhibit, yIdx) {
    // takes a file argument and opens a window
    // also stops the title from changing
            const viewerWindow = new PDFWindow({
            width: defaultWidth,
            height: screenHeight - 50 -(25*yIdx),
            x: screenWidth - defaultWidth,
            y: 50 + 25*yIdx,
            title: winTitle,
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
            console.log(`Main: window closed: ${exhibit}.${yIdx}`);
            openExhibits.delete(`${exhibit}.${yIdx}`);
        });

        // now open the window
        viewerWindow.loadURL(`${file}`); // TODO figure out page #page=${offset}`);
        // viewerWindow.webContents.openDevTools();
        openExhibits.set(`${exhibit}.${yIdx}`, viewerWindow);
}

// when the react app selects a PDF for viewing, this ipc call is trapped
ipcMain.on('select_viewer', (event, exhibitNo) => {
    console.log(`Main: received call to activate pdf viewer window for ${exhibitList[exhibitNo].file}`);
    let alreadyOpen = false;
    // check to see if window already opened - if so just give it the focus 
    if (openExhibits.has(`${exhibitNo}.1`)) {
        console.log(`Main: match found with id ${openExhibits.get(`${exhibitNo}.1`).id}`)
        BrowserWindow.fromId(openExhibits.get(`${exhibitNo}.0`).id).focus();
        alreadyOpen = true;
    };

    if (!alreadyOpen) {
        //else open new window
        console.log(`Main: screen size ${screenWidth}x${screenHeight}: x position ${screenWidth - defaultWidth} height ${screenHeight - 50}`);
        // convert single files to an array, for easier processing
        let fileArray = (Array.isArray(exhibitList[exhibitNo].file) ? exhibitList[exhibitNo].file : [].concat(exhibitList[exhibitNo].file)); 
        // reverse it so the first parts show up on top and are loaded last
        fileArray.reverse();
        let part = fileArray.length;
        console.log(`Main: file Array to open`, fileArray);
        for (let eachFile of fileArray) {
            console.log(`Main: opening file ${dropBoxPath}${exhibitDir}${eachFile}`);
            openPDFWindow(
                `${dropBoxPath}${exhibitDir}${eachFile}`,
                `${exhibitNo} - ${exhibitList[exhibitNo].alias || exhibitList[exhibitNo].title}${(part!==0?` Part ${part}`:``)}`,
                (exhibitList[exhibitNo].hasOwnProperty('offset') ? exhibitList[exhibitNo].offset : 1),
                exhibitNo,
                (fileArray.length-part)
            )
            part--;
        }
        console.log(`Main: currently open windows:`, openExhibits);
    }
});