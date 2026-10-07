// Tests de la Bible Louis Segond 1910 : intégrité du texte, références, recherche (node test/bible.test.js)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {}, console, crypto: require('crypto'), Intl, document: { head: { append(s) { s.onload(); } }, createElement: () => ({}) } };
vm.createContext(ctx);
for (const f of ['js/util.js', 'data/lsg1910.js', 'js/bible.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/renderer', f), 'utf8'), ctx);
const BIBLE = vm.runInContext('BIBLE', ctx);
const T = ctx.window.LSG1910_TEXT;

(async () => {
  // Intégrité : 66 livres, 1 189 chapitres, 31 102 versets
  assert.strictEqual(T.length, 66);
  assert.strictEqual(T.reduce((n, b) => n + b.length, 0), 1189);
  assert.strictEqual(T.reduce((n, b) => n + b.reduce((m, c) => m + c.length, 0), 0), 31102);
  assert.strictEqual(BIBLE.BOOKS.length, 66);
  await BIBLE.load();

  const P = s => { const r = BIBLE.parse(s); return r && [r.b, r.c1, r.v1, r.c2, r.v2]; };
  assert.deepStrictEqual(P('Jean 3:16'), [42, 3, 16, 3, 16]);
  assert.deepStrictEqual(P('jn 3.16-18'), [42, 3, 16, 3, 18]);
  assert.deepStrictEqual(P('Jean 3,16'), [42, 3, 16, 3, 16]);
  assert.deepStrictEqual(P('1 Co 13:4-7'), [45, 13, 4, 13, 7]);
  assert.deepStrictEqual(P('1Co 14:40'), [45, 14, 40, 14, 40]);
  assert.deepStrictEqual(P('1 Jean 4:8'), [61, 4, 8, 4, 8]);
  assert.deepStrictEqual(P('Ps 23'), [18, 23, null, 23, null]);
  assert.deepStrictEqual(P('Psaume 23:1'), [18, 23, 1, 23, 1]);
  assert.deepStrictEqual(P('Esaie 53:5'), [22, 53, 5, 53, 5]);
  assert.deepStrictEqual(P('Isaïe 53:5'), [22, 53, 5, 53, 5]);
  assert.deepStrictEqual(P('Genèse 1-2'), [0, 1, null, 2, null]);
  assert.deepStrictEqual(P('Jean 3:36-4:2'), [42, 3, 36, 4, 2]);
  assert.deepStrictEqual(P('Apocalypse'), [65, 1, null, 1, null]);
  assert.deepStrictEqual(P('Actes des apôtres 2:42'), [43, 2, 42, 2, 42]);
  assert.deepStrictEqual(P('II Rois 2:11'), [11, 2, 11, 2, 11]);
  assert.deepStrictEqual(P('Philémon 1:4'), [56, 1, 4, 1, 4]);
  assert.strictEqual(BIBLE.parse('Toto 3:16'), null);
  assert.strictEqual(BIBLE.parse(''), null);

  // Passages
  const pass = s => BIBLE.passage(BIBLE.parse(s));
  assert.strictEqual(pass('Jean 3:16')[0].t, "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.");
  assert.strictEqual(pass('1 Co 14:40')[0].t, 'Mais que tout se fasse avec bienséance et avec ordre.');
  assert.strictEqual(pass('Ps 23').length, 6);
  assert.strictEqual(pass('Jean 3:36-4:2').length, 3);
  assert.strictEqual(pass('Ps 119').length, 176);
  assert.strictEqual(BIBLE.label(BIBLE.parse('jn 3.16-18')), 'Jean 3:16-18');
  assert.strictEqual(BIBLE.labelVerses(42, 3, [18, 16, 17, 21]), 'Jean 3:16-18, 21');

  // Tous les versets du jour existent
  for (let d = 0; d < 366; d++) assert.ok(pass(BIBLE.daily(new Date(2028, 0, 1 + d))).length, 'verset du jour ' + d);

  // Recherche insensible aux accents
  const r = BIBLE.search('eternel est mon berger');
  assert.ok(r.results.some(v => v.b === 18 && v.c === 23 && v.v === 1));
  assert.ok(BIBLE.search('"tant aimé le monde"').results.some(v => v.b === 42 && v.c === 3 && v.v === 16));
  assert.ok(BIBLE.search('maranatha').total >= 0);
  const nt = BIBLE.search('grâce', { scope: 'nt' });
  assert.ok(nt.total > 100 && nt.results.every(v => v.b >= 39));
  assert.strictEqual(BIBLE.search('lumière', { book: 0 }).results.every(v => v.b === 0), true);
  assert.ok(BIBLE.highlight('L\'Éternel est mon berger', ['eternel']).includes('<mark>Éternel</mark>'));
  console.log('OK — tests de la Bible Louis Segond 1910 réussis');
})().catch(e => { console.error(e); process.exit(1); });
