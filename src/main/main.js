'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Store } = require('./store');
const { hashPassword, verifyPassword } = require('./auth');

let win;
let projector = null;
let recovery = null; // { code, expires, attempts }
let store;
const isMac = process.platform === 'darwin';

function dataDir() {
  if (process.env.MERCI_TV_DATA_DIR) return process.env.MERCI_TV_DATA_DIR; // tests / installation personnalisée
  return path.join(app.getPath('userData'), 'MERCI-TV-Gestion');
}
function docsDir() {
  const d = path.join(dataDir(), 'documents');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'MERCI TV Gestion',
    backgroundColor: '#0f1a33',
    icon: path.join(__dirname, '..', 'renderer', 'img', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu', label: app.name }] : []),
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir le dossier des données', click: () => shell.openPath(dataDir()) },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fermer' } : { role: 'quit', label: 'Quitter' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
        { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Actualiser' },
        { role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Zoom avant' }, { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])
      ]
    },
    { role: 'windowMenu', label: 'Fenêtre' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Rend un document HTML dans une fenêtre cachée (impression / PDF).
async function renderHidden(html) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  const tmp = path.join(app.getPath('temp'), `merci-tv-${crypto.randomUUID()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  await w.loadFile(tmp);
  return { w, cleanup: () => { try { fs.unlinkSync(tmp); } catch (_) {} if (!w.isDestroyed()) w.close(); } };
}

// Fenêtre de projection des versets (écran secondaire / vidéoprojecteur / régie MERCI TV)
function openProjector() {
  if (projector && !projector.isDestroyed()) { projector.show(); return; }
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find(d => d.id !== primary.id);
  const target = (external || primary).bounds;
  projector = new BrowserWindow({
    x: target.x + (external ? 0 : 60), y: target.y + (external ? 0 : 60),
    width: external ? target.width : 960, height: external ? target.height : 540,
    fullscreen: !!external, backgroundColor: '#0f1a33', title: 'MERCI TV — Projection',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  projector.loadFile(path.join(__dirname, '..', 'renderer', 'projector.html'));
  projector.on('closed', () => { projector = null; if (win && !win.isDestroyed()) win.webContents.send('projector:closed'); });
}

function registerIpc() {
  ipcMain.handle('clipboard:write', (_e, txt) => { clipboard.writeText(String(txt)); return true; });
  ipcMain.handle('projector:open', () => { openProjector(); return true; });
  ipcMain.handle('projector:show', (_e, payload) => {
    if (!projector || projector.isDestroyed()) openProjector();
    const send = () => projector.webContents.send('projector:data', payload);
    if (projector.webContents.isLoading()) projector.webContents.once('did-finish-load', send); else send();
    return true;
  });
  ipcMain.handle('projector:close', () => { if (projector && !projector.isDestroyed()) projector.close(); return true; });
  ipcMain.handle('projector:fullscreen', () => { if (projector && !projector.isDestroyed()) projector.setFullScreen(!projector.isFullScreen()); return true; });

  ipcMain.handle('data:load', () => store.load());
  ipcMain.handle('data:save', (_e, data) => store.save(data));

  ipcMain.handle('auth:hash', (_e, pw) => hashPassword(pw));
  ipcMain.handle('auth:verify', (_e, pw, salt, hash, iter) => verifyPassword(pw, salt, hash, iter));

  // ---- Réinitialisation de l'accès (mot de passe oublié) ----
  // Le code est écrit dans un fichier du dossier des données : seule une personne ayant
  // accès à la session de l'ordinateur peut le lire (les données y sont déjà stockées).
  ipcMain.handle('recovery:start', () => {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 caractères
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
    recovery = { code, expires: Date.now() + 15 * 60 * 1000, attempts: 0 };
    const file = path.join(dataDir(), 'CODE-REINITIALISATION.txt');
    fs.writeFileSync(file, [
      'MERCI TV Gestion — code de réinitialisation de l’accès',
      '',
      `Code : ${code}`,
      '',
      `Généré le ${new Date().toLocaleString('fr-FR')} — valable 15 minutes, une seule fois.`,
      'Saisissez ce code dans le logiciel. Ce fichier est supprimé automatiquement après usage.',
      'Si vous n’êtes pas à l’origine de cette demande, supprimez simplement ce fichier.'
    ].join('\n'), 'utf8');
    shell.showItemInFolder(file);
    return { file };
  });
  ipcMain.handle('recovery:verify', (_e, input) => {
    const file = path.join(dataDir(), 'CODE-REINITIALISATION.txt');
    if (!recovery || Date.now() > recovery.expires) { recovery = null; return { ok: false, reason: 'Le code a expiré. Générez-en un nouveau.' }; }
    const clean = String(input || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    const ok = clean.length === 12 && crypto.timingSafeEqual(Buffer.from(clean), Buffer.from(recovery.code.replace(/-/g, '')));
    if (!ok) {
      recovery.attempts++;
      if (recovery.attempts >= 5) { recovery = null; try { fs.unlinkSync(file); } catch (_) {} return { ok: false, reason: 'Trop d’essais. Générez un nouveau code.' }; }
      return { ok: false, reason: `Code incorrect (${5 - recovery.attempts} essai(s) restant(s)).` };
    }
    recovery = null;
    try { fs.unlinkSync(file); } catch (_) {}
    return { ok: true };
  });
  // Copie de sécurité nommée avant une remise à zéro complète.
  ipcMain.handle('data:archive', (_e, data, label) => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const file = path.join(dataDir(), 'sauvegardes', `${label || 'archive'}-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    return file;
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    dataPath: dataDir(),
    platform: process.platform
  }));
  ipcMain.handle('app:openDataFolder', () => shell.openPath(dataDir()));
  ipcMain.handle('app:openExternal', (_e, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('backup:export', async (_e, data) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exporter une sauvegarde',
      defaultPath: `MERCI-TV-sauvegarde-${stamp}.json`,
      filters: [{ name: 'Sauvegarde MERCI TV', extensions: ['json'] }]
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  });

  ipcMain.handle('backup:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Restaurer une sauvegarde',
      properties: ['openFile'],
      filters: [{ name: 'Sauvegarde MERCI TV', extensions: ['json'] }]
    });
    if (canceled || !filePaths[0]) return null;
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (!data || !data.meta || data.meta.app !== 'merci-tv-gestion') {
      throw new Error("Ce fichier n'est pas une sauvegarde MERCI TV Gestion.");
    }
    return data;
  });

  ipcMain.handle('csv:export', async (_e, name, csv) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exporter en CSV (Excel)',
      defaultPath: `${name}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, '﻿' + csv, 'utf8'); // BOM pour Excel
    return filePath;
  });

  ipcMain.handle('pdf:export', async (_e, html, name) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Enregistrer en PDF',
      defaultPath: `${name}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return null;
    const { w, cleanup } = await renderHidden(html);
    try {
      const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } });
      fs.writeFileSync(filePath, pdf);
    } finally { cleanup(); }
    shell.openPath(filePath);
    return filePath;
  });

  ipcMain.handle('print:html', async (_e, html) => {
    const { w, cleanup } = await renderHidden(html);
    return new Promise(resolve => {
      w.webContents.print({ printBackground: true }, ok => { cleanup(); resolve(ok); });
    });
  });

  ipcMain.handle('file:attach', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Joindre un document',
      properties: ['openFile']
    });
    if (canceled || !filePaths[0]) return null;
    const src = filePaths[0];
    const base = path.basename(src);
    const stored = `${Date.now()}-${base.replace(/[^\w.\-À-ÿ ]/g, '_')}`;
    fs.copyFileSync(src, path.join(docsDir(), stored));
    return { name: base, stored };
  });

  ipcMain.handle('file:open', async (_e, stored) => {
    const p = path.join(docsDir(), path.basename(String(stored)));
    if (!fs.existsSync(p)) throw new Error('Document introuvable dans le dossier des données.');
    return shell.openPath(p);
  });
}

app.commandLine.appendSwitch('lang', 'fr'); // sélecteurs de dates en français

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(() => {
    store = new Store(dataDir());
    registerIpc();
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (!isMac) app.quit(); });
}
