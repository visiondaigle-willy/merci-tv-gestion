// Tests unitaires du stockage et du hachage des mots de passe (node test/store.test.js)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../src/main/store');
const { hashPassword, verifyPassword } = require('../src/main/auth');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtv-store-'));
const s = new Store(dir);
assert.strictEqual(s.load(), null, 'aucune donnée au départ');
s.save({ meta: { app: 'merci-tv-gestion' }, members: [1, 2] });
assert.deepStrictEqual(s.load().members, [1, 2], 'relecture');
fs.writeFileSync(path.join(dir, 'donnees.json'), '{corrompu');
assert.deepStrictEqual(s.load().members, [1, 2], 'repli sur la sauvegarde si le fichier principal est corrompu');

const h = hashPassword('motdepasse1');
assert.ok(verifyPassword('motdepasse1', h.salt, h.hash, h.iter));
assert.ok(!verifyPassword('mauvais', h.salt, h.hash, h.iter));
assert.ok(!verifyPassword('x', undefined, undefined));
console.log('OK — tests du stockage et de l’authentification réussis');
