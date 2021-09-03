const Sentry = require("@sentry/electron");
Sentry.init({ dsn: 'https://5ff48b9a970746fcb3f2cfdb33bf406b@o962298.ingest.sentry.io/5910717' });
const bytenode = require('bytenode');
const fs = require('fs');
const fetch = require('node-fetch');
const util = require('util');
const path = require('path');

const WINDOWS = {
  main: null,
  tiktok: null,
  settings: null,
  camvas: null,
  screenvas: null,
  clips: null
}

exports.WINDOWS = WINDOWS;

const awaitAllFileCompilations = async () => {
  return Promise.all(  
    [createBytecodeFile('main'),
    createBytecodeFile('sendMailOnError'),
    createBytecodeFile('pollclips'),
    createBytecodeFile('tiktokclickclock'),
    createBytecodeFile('downloadvideo'),
    createBytecodeFile('settings'),
    createBytecodeFile('editVideo'),
    createBytecodeFile('clipqueue')
  ]
  );
}

async function createBytecodeFile(fileName) {
  console.log("Attempting to compile " + fileName);
  if (fs.existsSync(path.join(__dirname, `../old/${fileName}.js`))) {
    console.log(`Found ${fileName}.js`);
    if(fs.existsSync(path.join(__dirname, `../compiled/${fileName}.jsc`))) {
      console.log(`Deleting ${fileName}.jsc`);
      fs.unlinkSync(path.join(__dirname, `../compiled/${fileName}.jsc`));
    }
    console.log("Actually compiling");
    let compiled = await bytenode.compileFile(path.join(__dirname, `../old/${fileName}.js`), path.join(__dirname, `../compiled/${fileName}.jsc`));
    console.log("Compilation: " + compiled);
  }
}


if(process.argv[2] == "test") {
  (async () => {
    await awaitAllFileCompilations();
    console.log('this is a test run');
    process.exit(0);
  })()
}
else {
  const { app, BrowserWindow, ipcMain, crashReporter, globalShortcut, Menu } = require("electron");
  const AutoLaunch = require('auto-launch');
  const server = require("../compiled/main.jsc");
  console.log("Server running on: " + JSON.stringify(server));
  const { autoUpdater } = require('electron-updater');
  crashReporter.start({
    companyName: "Rox Works",
    productName: "Clipbot",
    ignoreSystemCrashHandler: true,
    submitURL: "https://o962298.ingest.sentry.io/api/5910717/minidump/?sentry_key=5ff48b9a970746fcb3f2cfdb33bf406b",
  });
  process?.crashReporter?.start({
    companyName: "Rox Works",
    productName: "Clipbot",
    ignoreSystemCrashHandler: true,
    submitURL: "https://o962298.ingest.sentry.io/api/5910717/minidump/?sentry_key=5ff48b9a970746fcb3f2cfdb33bf406b",
  });
  
  let autoLaunchFunc = () => {
    // jesus christ i think this is right
    console.log("dir: " + path.join(app.getAppPath(), '..\\..\\Clipbot.exe'));
    let autoLaunch = new AutoLaunch({
      name: 'Clipbot',
      path:  path.join(app.getAppPath(), '..\\..\\Clipbot.exe') // maybe
    });
    autoLaunch.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLaunch.enable();
    });
  }

  const updateGlobalShortcut = (command = 'F10') => {
    console.log('updating shortcut');
    globalShortcut.unregisterAll()

    // Register a 'CommandOrControl+X' shortcut listener.

    const ret = globalShortcut.register(command, async () => {
      //hit backend clip endpoint
      console.log('creating clip from frontend');
      let clipResponse = await fetch(`http://localhost:42074/clip`, {method: 'post'}).then(response => response.json());
      console.log('clip creation finished or failed');
      if(clipResponse.status == 200) {
        WINDOWS.main.webContents.send('clip_success', JSON.stringify(clipResponse));
      }
      else {
        WINDOWS.main.webContents.send('clip_failed', JSON.stringify(clipResponse));
      }
      
      console.log('Clip command pressed');

    })
  
    if (!ret) {
      console.log('registration failed')
    }
  
    // Check whether a shortcut is registered.
    console.log(globalShortcut.isRegistered(command))
    
    app.on('will-quit', () => {
      // Unregister a shortcut.
      globalShortcut.unregister(command)
    
      // Unregister all shortcuts.
      globalShortcut.unregisterAll()
    })
  };

  let mainWindow;

  async function createWindow() {

    mainWindow = new BrowserWindow({
      width: 600,
      height: 925,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });



    WINDOWS.main = mainWindow;
    WINDOWS.main.webContents.on('crashed', function() {
      console.log('dont');
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
    mainWindow.on("closed", function () {
      console.log('main window closed');
      mainWindow = null;
      WINDOWS.main = null;
    });
    mainWindow.setResizable(false);
    autoLaunchFunc();
    // copilot, write a function that crashes my electron app

    mainWindow.once('ready-to-show', () => {
      autoUpdater.autoDownload = false;
      // autoUpdater.allowPrerelease = true;
      autoUpdater.checkForUpdatesAndNotify();
    });
    autoUpdater.on('update-available', () => {
      mainWindow.webContents.send('update_available');
    });
    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update_downloaded');
    });

    process.on('crash', (e) => {
      console.log('rip: ' + e);
    });

    // const tiktokWindow = createTikTokWindow();
  }

  const createClipsWindow = () => {
    let clipsWindow = new BrowserWindow({
      width: 550,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });
    WINDOWS.clips = clipsWindow;
    console.log('settings window set: ' + WINDOWS.settings);


    
    clipsWindow.setResizable(false);

    clipsWindow.loadFile(path.join(__dirname, "clips.html"));
    clipsWindow.on("closed", function () {
      clipsWindow = null;
      WINDOWS.clips = null;
    });
    mainWindow.on("closed", () => {
      //also close tiktokWindow
      if(clipsWindow) {
        clipsWindow.close();
        clipsWindow = null;
        WINDOWS.clips = null;
      }
    });
  }

  const createSettingsWindow = () => {
    let settingsWindow = new BrowserWindow({
      width: 550,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });
    WINDOWS.settings = settingsWindow;
    console.log('settings window set: ' + WINDOWS.settings);


    settingsWindow.setResizable(false);

    settingsWindow.loadFile(path.join(__dirname, "settings.html"));
    settingsWindow.on("closed", function () {
      settingsWindow = null;
      WINDOWS.settings = null;
    });
    mainWindow.on("closed", () => {
      //also close tiktokWindow
      if(settingsWindow) {
        settingsWindow.close();
        settingsWindow = null;
        WINDOWS.settings = null;
      }
    });
  }

  const createTikTokWindow = async () => {
    let tiktokWindow = new BrowserWindow({
      width: 550,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });
    WINDOWS.tiktok = tiktokWindow;

    // tiktokWindow.setResizable(false);
    const cookieClear = { url: 'https://www.tiktok.com/', name: 'sessionid', value: '' }
    const cookieClear2 = { url: 'https://www.tiktok.com/login', name: 'sessionid', value: '' }
    //clear cookieClear from tiktokWindow
    await tiktokWindow.webContents.session.clearStorageData([], (data) => {});
    // await tiktokWindow.webContents.session.cookies.set(cookieClear2);

    await tiktokWindow.loadURL("https://www.tiktok.com/login");
    // await tiktokWindow.webContents.session.cookies.set(cookieClear);
    // await tiktokWindow.webContents.session.cookies.set(cookieClear2);
    // await tiktokWindow.loadURL("https://www.tiktok.com/login");


    tiktokWindow.on("closed", function () {
      tiktokWindow = null;
      WINDOWS.tiktok = null;
    });
    mainWindow.on("closed", () => {
      //also close tiktokWindow
      if(tiktokWindow) {
        tiktokWindow.close();
        tiktokWindow = null;
        WINDOWS.tiktok = null;
      }
    });

    return tiktokWindow;
  }

  const createCamvasWindow = (cropData) => {
    let canvasWindow = new BrowserWindow({
      width: 975,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });
    WINDOWS.camvas = canvasWindow;

    canvasWindow.setResizable(false);
    canvasWindow.loadFile(path.join(__dirname, "canvas.html"));
    canvasWindow.on("closed", function () {
      canvasWindow = null;
    });
    mainWindow.on("closed", () => {
      //also close tiktokWindow
      if(canvasWindow) {
        canvasWindow.close();
        canvasWindow = null;
        WINDOWS.camvas = null;
      }
    });

    canvasWindow.webContents.on('did-finish-load', function() {
      canvasWindow.webContents.send('crop_data', cropData);
    });

    return canvasWindow;
  }

  const createScreenvasWindow = (camData) => {
    let canvasWindow = new BrowserWindow({
      width: 1920/2,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: 'icon.png'
    });
    WINDOWS.screenvas = canvasWindow;

    canvasWindow.setResizable(false);
    canvasWindow.loadFile(path.join(__dirname, "canvas.html"));
    canvasWindow.on("closed", function () {
      canvasWindow = null;
    });
    mainWindow.on("closed", () => {
      //also close tiktokWindow
      if(canvasWindow) {
        canvasWindow.close();
        canvasWindow = null;
        WINDOWS.screenvas = null;
      }
    });

    

    canvasWindow.webContents.on('did-finish-load', function() {
      canvasWindow.webContents.send('crop_data', JSON.stringify(camData));
      canvasWindow.webContents.send('screenvas_data', JSON.stringify(camData));
    });

    return canvasWindow;
  }


  app.on("ready", async () => {
    //TODO: reenable this
    if(!(process.env.LETMEIN)) {
      Menu.setApplicationMenu(null);
    }
    
    // Must do this before window gets made so we
    // have correct settings
    // let appDir = app.getAppPath();
    // if(!appDir.includes('system32')) {
    //   console.log("Settings folder: " + appDir);
    //   let result = await fetch(`http://localhost:42074/update?folder=${encodeURIComponent(appDir)}`);
    //   console.log(result);
    // }
    // else {
    //   console.log("Bad app dir");
    // }
    
    ipcMain.on('app_version', (event) => {
      console.log("app version located: " + app.getVersion());
      event.sender.send('app_version', { version: app.getVersion() });
    });

    ipcMain.on('open-settings', (event) => {
      console.log("open settings called, creating settings window");
      createSettingsWindow();
    });

    ipcMain.on('open_clips', (event) => {
      console.log("open clips called, creating clips window");
      createClipsWindow();
    });

    ipcMain.on('close_clips', (event) => {
      console.log("close clips called, close clips window");
      WINDOWS.clips.close();
    });

    ipcMain.on('settings_updated', (event, data) => {
      console.log("settings updated event");
      WINDOWS.main.webContents.send('settings_updated', data);
    });

    ipcMain.on('status_update', (event, data) => {
      console.log("Status update from uploadClip");
      WINDOWS.main.webContents.send('status_update', data);
    });

    ipcMain.on('camvas_closed', (event, data) => {
      console.log("caught in main: " + data);
      console.log(util.inspect(WINDOWS));
      WINDOWS.main.webContents.send('camvas_closed', data);
    });

    ipcMain.on('screenvas_closed', (event, data) => {
      console.log("caught in main: " + data);
      let parsedData = JSON.parse(data);
      let callback = parsedData.callback;
      if(callback == 'custom_crop') {
        WINDOWS.clips.webContents.send('custom_crop', data);
      }
      else {
        WINDOWS.main.webContents.send('screenvas_closed', data);
      }
    });

    ipcMain.on('restart_app', () => {
      console.log("restarting app");
      autoUpdater.quitAndInstall();
    });

    ipcMain.on('hotkey_changed', (event, data) => {
      updateGlobalShortcut(data);
    });

    ipcMain.on('check_for_updates', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });
    
    ipcMain.on('download_update', () => {
      console.log("downloading update");
      autoUpdater.downloadUpdate();
    });

    ipcMain.on('camvas_open', (event, cropData) => {
      console.log("Opening camvas");
      camvasWindow = createCamvasWindow(cropData);
    });

    ipcMain.on('screenvas_open', (event, camData) => {
      console.log("Opening screenvas: " + camData);
      screenvasWindow = createScreenvasWindow(camData);
    });

    
    // Set tiktokwindow to open when a button is clicked in mainWindow
    ipcMain.on('tiktok_open', async () => {
      console.log("Opening tiktok");
      let tiktokWindow = await createTikTokWindow();
      console.log("TT cookies: " + JSON.stringify(tiktokWindow?.webContents?.session?.cookies));
      // send cookies to main window session_token exists
      let tiktokChecker = setInterval(() => {
        console.log("Checking for TT Token");
        tiktokWindow.webContents.session.cookies.get({"name": "sessionid"})
        .then((cookies) => {
          console.log("found anything: " + cookies);
          console.log(JSON.stringify(cookies));
          console.log(tiktokWindow.webContents.session.cookies);
          if (cookies?.length > 0 && cookies?.[0]?.value) {
            clearInterval(tiktokChecker);
            let sessionId = cookies[0].value;
            console.log("Sending TT Token:" + cookies[0].value);
            mainWindow.webContents.send('tiktok_login', sessionId);
            console.log("Sent to main window: " + sessionId);
            setTimeout(() => {
              tiktokWindow.removeAllListeners();
              tiktokWindow.close();
            }, 3000);
          }
        }).catch((error) => {console.log("ERROR: " + error);});
      }
      , 1000);
      tiktokWindow.on('close', () => {
        console.log("tiktokWindow is closed");
        clearInterval(tiktokChecker);
        if(mainWindow) {
          mainWindow.webContents.send('tiktok_login', "failed");
        }
      });

    });

    console.log("Making window");
    return createWindow();
  });

  app.on("resize", function (e, x, y) {
    mainWindow.setSize(x, y);
  });

  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", function () {
    if (mainWindow === null) {
      createWindow();
    }
  });
}
