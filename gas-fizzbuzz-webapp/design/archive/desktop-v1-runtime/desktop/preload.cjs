'use strict';
const {contextBridge,ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('valis',Object.freeze({
  testMode:process.argv.includes('--valis-test-mode'),
  listSpecimens:() => ipcRenderer.invoke('valis:list'),
  saveSpecimen:record => ipcRenderer.invoke('valis:save',record),
  onPrepareClose:callback => {
    if (typeof callback !== 'function') throw new TypeError('終了前の処理が必要です');
    const listener = () => callback();
    ipcRenderer.on('valis:prepare-close',listener);
    return () => ipcRenderer.removeListener('valis:prepare-close',listener);
  },
  closeReady:() => ipcRenderer.invoke('valis:close-ready')
}));
