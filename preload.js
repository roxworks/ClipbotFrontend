const Sentry = require("@sentry/electron");
Sentry.init({ dsn: 'https://5ff48b9a970746fcb3f2cfdb33bf406b@o962298.ingest.sentry.io/5910717' });

window.ipcRenderer = window.require('electron').ipcRenderer;
if(!(window.ipcRenderer)) {
    window.ipcRenderer = require('electron').ipcRenderer
}

console.log("preload renderer: " + window.ipcRenderer.send);

const { shell } = require('electron');
window.shell = shell;