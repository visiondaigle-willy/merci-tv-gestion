'use strict';
/* Bible Louis Segond 1910 : livres, chargement, références et recherche. */
const BIBLE = (() => {
  // [nom, abréviations usuelles]
  const BOOKS = [
    ['Genèse', 'Gn Ge Gen'], ['Exode', 'Ex Exo'], ['Lévitique', 'Lv Lé Lev'], ['Nombres', 'Nb No Nom'], ['Deutéronome', 'Dt De Deu'],
    ['Josué', 'Jos'], ['Juges', 'Jg Jug'], ['Ruth', 'Rt Ru'], ['1 Samuel', '1S 1Sa 1Sam'], ['2 Samuel', '2S 2Sa 2Sam'],
    ['1 Rois', '1R 1Ro'], ['2 Rois', '2R 2Ro'], ['1 Chroniques', '1Ch 1Chr'], ['2 Chroniques', '2Ch 2Chr'], ['Esdras', 'Esd'],
    ['Néhémie', 'Né Ne Neh'], ['Esther', 'Est'], ['Job', 'Jb'], ['Psaumes', 'Ps Psa Psaume'], ['Proverbes', 'Pr Pro Prov'],
    ['Ecclésiaste', 'Ec Ecc Qo'], ['Cantique des cantiques', 'Ct Ca Cant Cantique'], ['Ésaïe', 'Es És Esa Isaïe Is'], ['Jérémie', 'Jr Jé Jer'], ['Lamentations', 'Lm La Lam'],
    ['Ézéchiel', 'Ez Éz Eze'], ['Daniel', 'Dn Da Dan'], ['Osée', 'Os'], ['Joël', 'Jl Joe'], ['Amos', 'Am'],
    ['Abdias', 'Ab Abd'], ['Jonas', 'Jon'], ['Michée', 'Mi Mic'], ['Nahum', 'Na Nah'], ['Habacuc', 'Ha Hab'],
    ['Sophonie', 'So Sop'], ['Aggée', 'Ag Agg'], ['Zacharie', 'Za Zac'], ['Malachie', 'Ml Mal'],
    ['Matthieu', 'Mt Mat'], ['Marc', 'Mc Mr Mar'], ['Luc', 'Lc Lu'], ['Jean', 'Jn Jea'], ['Actes', 'Ac Act Actes_des_apôtres'],
    ['Romains', 'Rm Ro Rom'], ['1 Corinthiens', '1Co 1Cor'], ['2 Corinthiens', '2Co 2Cor'], ['Galates', 'Ga Gal'], ['Éphésiens', 'Ep Éph Eph'],
    ['Philippiens', 'Ph Phi Phil'], ['Colossiens', 'Col'], ['1 Thessaloniciens', '1Th 1Thes'], ['2 Thessaloniciens', '2Th 2Thes'], ['1 Timothée', '1Tm 1Ti 1Tim'],
    ['2 Timothée', '2Tm 2Ti 2Tim'], ['Tite', 'Tt Tit'], ['Philémon', 'Phm Phlm'], ['Hébreux', 'Hé He Heb'], ['Jacques', 'Jc Ja Jac'],
    ['1 Pierre', '1P 1Pi 1Pie'], ['2 Pierre', '2P 2Pi 2Pie'], ['1 Jean', '1Jn 1Jea'], ['2 Jean', '2Jn 2Jea'], ['3 Jean', '3Jn 3Jea'],
    ['Jude', 'Jd Jud'], ['Apocalypse', 'Ap Apo Apoc']
  ].map(([name, abbr], i) => ({ i, name, abbr: abbr.split(' ')[0], keys: [name, ...abbr.split(' ').map(k => k.replace(/_/g, ' '))], nt: i >= 39 }));

  // Versets proposés comme « verset du jour »
  const DAILY = ['Jean 3:16', 'Psaumes 23:1-3', 'Philippiens 4:13', 'Romains 8:28', 'Josué 1:9', 'Ésaïe 40:31', 'Proverbes 3:5-6', 'Matthieu 6:33', 'Jérémie 29:11', 'Psaumes 46:2',
    'Matthieu 11:28', 'Romains 12:2', '2 Timothée 1:7', 'Hébreux 11:1', 'Galates 5:22-23', 'Éphésiens 2:8-9', '1 Corinthiens 13:4-7', 'Psaumes 119:105', 'Jean 14:6', 'Actes 1:8',
    'Matthieu 28:19-20', 'Ésaïe 41:10', 'Psaumes 37:5', 'Lamentations 3:22-23', 'Jean 15:5', 'Romains 10:9', 'Hébreux 13:8', '1 Pierre 5:7', 'Psaumes 121:1-2', 'Michée 6:8',
    'Colossiens 3:23', '1 Thessaloniciens 5:16-18', 'Jacques 1:5', 'Apocalypse 22:20', '2 Corinthiens 5:17', 'Psaumes 91:1-2', 'Proverbes 18:10', 'Jean 8:32', 'Romains 15:13', 'Néhémie 8:10',
    'Matthieu 5:14-16', 'Psaumes 27:1', 'Ésaïe 53:5', '1 Jean 1:9', 'Habacuc 2:3', 'Zacharie 4:6', 'Actes 2:42', 'Hébreux 10:25', 'Malachie 3:10', '1 Corinthiens 14:40',
    'Psaumes 133:1', 'Jean 13:34-35', 'Marc 16:15', 'Romains 1:16', 'Éphésiens 6:10-11', 'Philippiens 4:6-7', 'Tite 2:13', '1 Thessaloniciens 4:16-17', 'Matthieu 24:42', 'Apocalypse 3:20'];

  const norm = s => U.norm(s).replace(/[\s.]+/g, '');
  const index = new Map();
  for (const b of BOOKS) for (const k of b.keys) index.set(norm(k), b.i);

  let text = null;
  let loading = null;
  let searchIndex = null;

  // Le texte (4 Mo) n'est chargé qu'à la première utilisation.
  function load() {
    if (text) return Promise.resolve(text);
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'data/lsg1910.js';
        s.onload = () => { text = window.LSG1910_TEXT; resolve(text); };
        s.onerror = () => { loading = null; reject(new Error('Texte biblique introuvable.')); };
        document.head.append(s);
      });
    }
    return loading;
  }
  const ready = () => !!text;

  function lookup(k) {
    if (index.has(k)) return index.get(k);
    const hits = BOOKS.filter(b => norm(b.name).startsWith(k) && k.length >= 2);
    return hits.length === 1 ? hits[0].i : -1;
  }
  function findBook(raw) {
    const k = norm(raw).replace(/^(1er|1re|premier|premiere)/, '1').replace(/^(deuxieme|second|seconde)/, '2').replace(/^troisieme/, '3');
    const direct = lookup(k);
    if (direct >= 0) return direct;
    // chiffres romains : « II Rois », « I Jean »
    return /^i{1,3}[a-z]/.test(k) ? lookup(k.replace(/^i{1,3}/, m => String(m.length))) : -1;
  }

  // « Jean 3:16 », « 1 Co 13.4-7 », « Ps 23 », « Jean 3,16-4:2 », « Gn 1-2 »
  function parse(input) {
    const s = String(input || '').trim();
    const m = s.match(/^((?:[1-3]|i{1,3}|1er|1re)?\s*[^\d]+?)\s*(\d+)?(?:\s*[:.,]\s*(\d+))?(?:\s*[-–]\s*(\d+)(?:\s*[:.,]\s*(\d+))?)?\s*$/i);
    if (!m) return null;
    const b = findBook(m[1]);
    if (b < 0) return null;
    const c1 = m[2] ? +m[2] : 1;
    let v1 = m[3] ? +m[3] : null, c2 = c1, v2 = v1;
    if (m[4]) {
      if (m[5]) { c2 = +m[4]; v2 = +m[5]; }
      else if (v1 !== null) v2 = +m[4];
      else c2 = +m[4];
    }
    return { b, c1, v1, c2, v2 };
  }

  // Liste de versets [{b,c,v,t}] d'une référence analysée (texte chargé requis).
  function passage(ref) {
    if (!text || !ref) return [];
    const book = text[ref.b];
    const out = [];
    const cEnd = Math.min(ref.c2, book.length);
    for (let c = ref.c1; c <= cEnd; c++) {
      const verses = book[c - 1];
      if (!verses) continue;
      const from = c === ref.c1 && ref.v1 ? ref.v1 : 1;
      const to = c === ref.c2 && ref.v2 ? Math.min(ref.v2, verses.length) : verses.length;
      for (let v = from; v <= to; v++) out.push({ b: ref.b, c, v, t: verses[v - 1] });
    }
    return out;
  }

  function label(ref) {
    if (!ref) return '';
    const n = BOOKS[ref.b].name;
    if (ref.v1 == null) return ref.c2 !== ref.c1 ? `${n} ${ref.c1}-${ref.c2}` : `${n} ${ref.c1}`;
    if (ref.c2 !== ref.c1) return `${n} ${ref.c1}:${ref.v1}-${ref.c2}:${ref.v2}`;
    return ref.v2 && ref.v2 !== ref.v1 ? `${n} ${ref.c1}:${ref.v1}-${ref.v2}` : `${n} ${ref.c1}:${ref.v1}`;
  }

  // Libellé d'une suite de versets sélectionnés dans un même chapitre, ex. « Jean 3:16-18, 21 »
  function labelVerses(b, c, verses) {
    const vs = [...verses].sort((x, y) => x - y);
    const parts = [];
    for (let i = 0; i < vs.length; i++) {
      let j = i;
      while (j + 1 < vs.length && vs[j + 1] === vs[j] + 1) j++;
      parts.push(i === j ? `${vs[i]}` : `${vs[i]}-${vs[j]}`);
      i = j;
    }
    return `${BOOKS[b].name} ${c}:${parts.join(', ')}`;
  }

  function search(query, { scope = 'all', book = -1, limit = 500 } = {}) {
    if (!text) return { results: [], total: 0 };
    if (!searchIndex) {
      searchIndex = [];
      text.forEach((chs, b) => chs.forEach((vs, c) => vs.forEach((t, v) => searchIndex.push({ b, c: c + 1, v: v + 1, n: U.norm(t) }))));
    }
    const words = U.norm(query).replace(/[^\p{L}\p{N}' -]/gu, ' ').split(/\s+/).filter(w => w.length > 1);
    const phrase = /^".*"$/.test(query.trim()) ? U.norm(query.trim().slice(1, -1)) : null;
    if (!words.length && !phrase) return { results: [], total: 0 };
    const results = [];
    let total = 0;
    for (const e of searchIndex) {
      if (book >= 0 && e.b !== book) continue;
      if (scope === 'at' && e.b >= 39) continue;
      if (scope === 'nt' && e.b < 39) continue;
      if (phrase ? !e.n.includes(phrase) : !words.every(w => e.n.includes(w))) continue;
      total++;
      if (results.length < limit) results.push({ b: e.b, c: e.c, v: e.v, t: text[e.b][e.c - 1][e.v - 1] });
    }
    return { results, total, words: phrase ? [phrase] : words };
  }

  // Surligne les mots recherchés sans tenir compte des accents.
  function highlight(t, words) {
    if (!words || !words.length) return U.esc(t);
    const n = U.norm(t);
    const marks = new Array(t.length).fill(false);
    for (const w of words) { let i = n.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) marks[k] = true; i = n.indexOf(w, i + 1); } }
    let out = '', open = false;
    for (let i = 0; i < t.length; i++) {
      if (marks[i] && !open) { out += '<mark>'; open = true; }
      if (!marks[i] && open) { out += '</mark>'; open = false; }
      out += U.esc(t[i]);
    }
    return out + (open ? '</mark>' : '');
  }

  function daily(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    const day = Math.floor((date - start) / 86400000);
    return DAILY[day % DAILY.length];
  }

  const chapters = b => (text ? text[b].length : 0);

  return { BOOKS, load, ready, parse, passage, label, labelVerses, search, highlight, daily, chapters, findBook };
})();
