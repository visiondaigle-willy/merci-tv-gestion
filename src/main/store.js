'use strict';
// Stockage local : un fichier JSON écrit de façon atomique,
// avec sauvegardes automatiques tournantes.
const fs = require('fs');
const path = require('path');

const MAX_BACKUPS = 15;

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'donnees.json');
    this.backupDir = path.join(dir, 'sauvegardes');
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  load() {
    const candidates = [this.file, this.file + '.tmp', ...this.listBackups().map(b => path.join(this.backupDir, b))];
    for (const f of candidates) {
      try {
        if (!fs.existsSync(f)) continue;
        const data = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (data && typeof data === 'object' && data.meta) return data;
      } catch (_) { /* fichier corrompu : on essaie le suivant */ }
    }
    return null;
  }

  save(data) {
    const json = JSON.stringify(data);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, this.file);
    this.rotateBackup(json);
    return true;
  }

  // Une sauvegarde par heure au maximum, on garde les MAX_BACKUPS plus récentes.
  rotateBackup(json) {
    const stamp = new Date().toISOString().slice(0, 13).replace(/[:T]/g, '-');
    const target = path.join(this.backupDir, `donnees-${stamp}.json`);
    fs.writeFileSync(target, json, 'utf8');
    const all = this.listBackups();
    for (const old of all.slice(MAX_BACKUPS)) {
      try { fs.unlinkSync(path.join(this.backupDir, old)); } catch (_) {}
    }
  }

  listBackups() {
    try {
      return fs.readdirSync(this.backupDir).filter(f => /^donnees-.*\.json$/.test(f)).sort().reverse();
    } catch (_) { return []; }
  }
}

module.exports = { Store };
