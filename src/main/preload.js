'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: data => ipcRenderer.invoke('data:save', data),
  hashPassword: pw => ipcRenderer.invoke('auth:hash', pw),
  verifyPassword: (pw, salt, hash, iter) => ipcRenderer.invoke('auth:verify', pw, salt, hash, iter),
  info: () => ipcRenderer.invoke('app:info'),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  openExternal: url => ipcRenderer.invoke('app:openExternal', url),
  exportBackup: data => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  exportCSV: (name, csv) => ipcRenderer.invoke('csv:export', name, csv),
  exportPDF: (html, name) => ipcRenderer.invoke('pdf:export', html, name),
  printHTML: html => ipcRenderer.invoke('print:html', html),
  attachFile: () => ipcRenderer.invoke('file:attach'),
  openFile: stored => ipcRenderer.invoke('file:open', stored),
  copyText: txt => ipcRenderer.invoke('clipboard:write', txt),
  projectorOpen: () => ipcRenderer.invoke('projector:open'),
  projectorShow: payload => ipcRenderer.invoke('projector:show', payload),
  projectorClose: () => ipcRenderer.invoke('projector:close'),
  projectorFullscreen: () => ipcRenderer.invoke('projector:fullscreen'),
  onProjectorData: cb => ipcRenderer.on('projector:data', (_e, d) => cb(d)),
  onProjectorClosed: cb => ipcRenderer.on('projector:closed', () => cb())
});
