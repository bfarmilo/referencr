const electron = require('electron');
const { app, ipcMain, BrowserWindow } = electron;

const path = require('path');
const url = require('url');
const fse = require('fs-extra');

const exhibitDir = `${process.argv[2]}\\`;
const exhibitFile = "exhibitlist.json";
let exhibitList = {};
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let devMode = false;


function createWindow() {
    BrowserWindow.addDevToolsExtension(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/0.15.5_0');
    // Create the browser window.
    mainWindow = new BrowserWindow(
        { 
            width: 1440, 
            height: 766,
            "web-preferences": {
                "web-security": false
            }
         });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    devMode = process.env.ELECTRON_START_URL;

    console.log(`${devMode ? `DevMode: ` : `Build Mode:`}loading file at ${startUrl}`);
    // and load the index.html of the app.
    mainWindow.loadURL(startUrl);
    // Add the react tools and Open the DevTools.
    mainWindow.webContents.openDevTools();

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
    fse.readJSON(`${process.env.LOCALAPPDATA}//Dropbox//info.json`, 'utf8', (err2, dropbox) => {
        if (err2) {
            console.log(dialog.showErrorBox('Dropbox Error', `Error getting Dropbox path: ${err2}`));
            return;
        }
        console.log(`Main: Good DropBox Path:${dropbox.business.path}\\`);
        // send the full path to the exhibitfile to the renderer window, used to locate files
        mainWindow.webContents.send('exhibitpath', `${devMode ? '.\\public\\' : `${dropbox.business.path}\\${exhibitDir}`}`);
        // now read the exhibit list into a local object
        fse.readJSON(`${devMode ? `.\\public\\`: `${dropbox.business.path}\\${exhibitDir}`}${exhibitFile}`, (error, resultObj) => {
            if (error) console.log(error);
            exhibitList = resultObj;
            mainWindow.webContents.send('new_folder', exhibitList);
            console.log(`Main: exhibitList sent to render window`);
        });
    });
});