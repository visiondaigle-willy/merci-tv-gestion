'use strict';
/* Écran « Bible Louis Segond 1910 » : lecture, recherche, marque-pages et projection. */
const BIBLE_UI = (() => {
  const st = () => App.ui.bible || (App.ui.bible = { b: 42, c: 3, sel: [], size: 17, flash: null, proj: null, q: '', scope: 'all' });
  const B = BIBLE.BOOKS;

  async function copy(txt) {
    try { await api.copyText(txt); App.toast('Copié dans le presse-papiers.'); } catch (e) { App.toast(e.message, true); }
  }

  const passageText = (ref, verses) => `« ${verses.map(v => (verses.length > 1 ? `${v.v} ` : '') + v.t).join(' ')} »\n— ${ref} (Louis Segond 1910)`;

  function passageHTML(verses) {
    return verses.map((v, i) => `${i && v.c !== verses[i - 1].c ? `<h4 style="margin:12px 0 4px;color:#c9a24a">Chapitre ${v.c}</h4>` : ''}<p style="margin:0 0 6px;line-height:1.6"><sup style="color:#b18a35;font-weight:700;margin-right:3px">${v.v}</sup>${U.esc(v.t)}</p>`).join('');
  }
  const printPassage = (ref, verses) => App.printMenu(PRINT.raw('Louis Segond 1910', ref, `<div style="font-family:Georgia,serif;font-size:13px">${passageHTML(verses)}</div>`), ref.replace(/[^\wÀ-ÿ]+/g, '-'));

  /* ---------- Projection ---------- */
  function project(b, c, v1, v2) {
    const s = st();
    const ref = { b, c1: c, v1, c2: c, v2 };
    const verses = BIBLE.passage(ref);
    if (!verses.length) return;
    s.proj = { ...(s.proj || { scale: 1, background: 'default' }), b, c, v1: verses[0].v, v2: verses[verses.length - 1].v, black: false };
    send();
    App.log('Projection', BIBLE.label(ref));
  }
  function send() {
    const p = st().proj;
    if (!p) return;
    const ref = { b: p.b, c1: p.c, v1: p.v1, c2: p.c, v2: p.v2 };
    api.projectorShow({ ref: BIBLE.label(ref), verses: BIBLE.passage(ref), black: p.black, background: p.background, scale: p.scale });
    renderProjBar();
  }
  // Passe au verset suivant / précédent (en franchissant les chapitres et les livres)
  function step(dir) {
    const p = st().proj;
    if (!p) return;
    let { b, c } = p;
    let v = dir > 0 ? p.v2 + 1 : p.v1 - 1;
    if (v < 1) { if (c > 1) c--; else if (b > 0) { b--; c = BIBLE.chapters(b); } else return; v = BIBLE.passage({ b, c1: c, c2: c }).length; }
    else if (v > BIBLE.passage({ b, c1: c, c2: c }).length) { if (c < BIBLE.chapters(b)) c++; else if (b < 65) { b++; c = 1; } else return; v = 1; }
    Object.assign(p, { b, c, v1: v, v2: v, black: false });
    send();
    const s = st();
    if (App.view === 'bible' && (s.b !== b || s.c !== c)) { s.b = b; s.c = c; s.sel = []; App.refresh(); }
    else markProjected();
  }
  function stop() {
    st().proj = null;
    api.projectorClose();
    renderProjBar();
    markProjected();
  }

  function renderProjBar() {
    document.querySelectorAll('.proj-bar').forEach(x => x.remove());
    const p = st().proj;
    if (!p || App.view !== 'bible') return;
    const bar = U.h(`<div class="proj-bar">
      <span class="live">● EN PROJECTION</span><b>${U.esc(BIBLE.label({ b: p.b, c1: p.c, v1: p.v1, c2: p.c, v2: p.v2 }))}</b>
      <button class="btn sm" data-p="prev" title="Verset précédent (←)">◀ Précédent</button>
      <button class="btn sm gold" data-p="next" title="Verset suivant (→)">Suivant ▶</button>
      <button class="btn sm ${p.black ? 'primary' : ''}" data-p="black" title="Écran noir (B)">Écran noir</button>
      <button class="btn sm ${p.background === 'green' ? 'primary' : ''}" data-p="green" title="Fond vert pour l’incrustation en régie">Fond vert</button>
      <button class="btn sm" data-p="minus" title="Texte plus petit">A−</button><button class="btn sm" data-p="plus" title="Texte plus grand">A+</button>
      <button class="btn sm" data-p="fs" title="Plein écran sur la fenêtre de projection">Plein écran</button>
      <button class="btn sm danger" data-p="stop">Arrêter</button></div>`);
    bar.querySelectorAll('[data-p]').forEach(btn => (btn.onclick = () => {
      const a = btn.dataset.p;
      if (a === 'prev') step(-1);
      else if (a === 'next') step(1);
      else if (a === 'black') { p.black = !p.black; send(); }
      else if (a === 'green') { p.background = p.background === 'green' ? 'default' : 'green'; send(); }
      else if (a === 'minus') { p.scale = Math.max(0.6, p.scale - 0.1); send(); }
      else if (a === 'plus') { p.scale = Math.min(1.8, p.scale + 0.1); send(); }
      else if (a === 'fs') api.projectorFullscreen();
      else if (a === 'stop') stop();
    }));
    document.getElementById('main').append(bar);
  }
  function markProjected() {
    const p = st().proj, s = st();
    document.querySelectorAll('.vs').forEach(el => el.classList.toggle('projected', !!p && p.b === s.b && p.c === s.c && +el.dataset.v >= p.v1 && +el.dataset.v <= p.v2));
  }

  /* ---------- Écran principal ---------- */
  function view(el) {
    const s = st();
    el.innerHTML = `<div class="page">${App.pageHead('', 'La Sainte Bible', 'Louis Segond 1910', `<form id="goref" class="row-flex"><input class="field-inline" id="refin" placeholder="Aller à… ex. Jean 3:16, 1 Co 13, Ps 23" style="width:300px"><button class="btn primary">Ouvrir</button></form>`)}
      <div id="bbody"><div class="empty"><b>Chargement de la Bible…</b></div></div></div>`;
    const go = el.querySelector('#goref');
    go.onsubmit = ev => { ev.preventDefault(); openRef(el.querySelector('#refin').value); };
    BIBLE.load().then(() => {
      const body = el.querySelector('#bbody');
      if (!body) return;
      body.innerHTML = '';
      App.tabs('t:bible', [['read', 'Lecture'], ['search', 'Recherche'], ['marks', `Marque-pages (${App.data.bibleBookmarks.length})`]], body, { read, search, marks });
      renderProjBar();
    }).catch(e => { el.querySelector('#bbody').innerHTML = `<div class="note bad">${U.esc(e.message)}</div>`; });
  }

  function openRef(input) {
    const ref = BIBLE.parse(input);
    if (!ref || !BIBLE.passage(ref).length) return App.toast(`Référence non reconnue : « ${input} ». Exemples : Jean 3:16, 1 Co 13:4-7, Psaumes 23.`, true);
    const s = st();
    Object.assign(s, { b: ref.b, c: ref.c1, sel: [], flash: ref.v1 ? [ref.v1, ref.c2 === ref.c1 ? (ref.v2 || ref.v1) : 999] : null });
    if (ref.v1) s.sel = BIBLE.passage({ ...ref, c2: ref.c1, v2: ref.c2 === ref.c1 ? ref.v2 : null }).map(v => v.v);
    App.ui['t:bible'] = 'read';
    if (App.view === 'bible') App.refresh(); else App.go('bible');
  }

  function read(box) {
    const s = st();
    const nCh = BIBLE.chapters(s.b);
    s.c = Math.min(Math.max(1, s.c), nCh);
    const verses = BIBLE.passage({ b: s.b, c1: s.c, c2: s.c });
    box.innerHTML = `<div class="toolbar">
        <select class="field-inline" id="bk">${[['Ancien Testament', B.filter(b => !b.nt)], ['Nouveau Testament', B.filter(b => b.nt)]].map(([g, list]) => `<optgroup label="${g}">${list.map(b => `<option value="${b.i}" ${b.i === s.b ? 'selected' : ''}>${U.esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select>
        <select class="field-inline" id="ch">${Array.from({ length: nCh }, (_, i) => `<option value="${i + 1}" ${i + 1 === s.c ? 'selected' : ''}>Chapitre ${i + 1}</option>`).join('')}</select>
        <button class="btn sm" id="pc" title="Chapitre précédent">◀</button><button class="btn sm" id="nc" title="Chapitre suivant">▶</button>
        <span class="count"></span>
        <button class="btn sm" id="fm" title="Texte plus petit">A−</button><button class="btn sm" id="fp" title="Texte plus grand">A+</button>
        <button class="btn sm" id="pch">Imprimer le chapitre</button>
        <button class="btn sm gold" id="prj">Ouvrir la projection</button>
      </div>
      <div class="bible-page" style="font-size:${s.size}px">
        <h2 class="bible-title">${U.esc(B[s.b].name)} <span>${s.c}</span></h2>
        ${verses.map(v => `<p class="vs ${s.sel.includes(v.v) ? 'sel' : ''}" data-v="${v.v}"><sup>${v.v}</sup>${U.esc(v.t)}</p>`).join('')}
        <p class="muted bible-hint">Cliquez sur un verset pour le sélectionner (Maj + clic pour une plage), puis copiez-le, ajoutez un marque-page ou projetez-le.</p>
      </div>
      <div class="sel-bar" id="selbar"></div>`;
    const $ = q => box.querySelector(q);
    const goTo = (b, c) => { s.b = b; s.c = c; s.sel = []; s.flash = null; App.refresh(); };
    $('#bk').onchange = e => goTo(+e.target.value, 1);
    $('#ch').onchange = e => goTo(s.b, +e.target.value);
    $('#pc').onclick = () => (s.c > 1 ? goTo(s.b, s.c - 1) : s.b > 0 && goTo(s.b - 1, BIBLE.chapters(s.b - 1)));
    $('#nc').onclick = () => (s.c < nCh ? goTo(s.b, s.c + 1) : s.b < 65 && goTo(s.b + 1, 1));
    $('#fm').onclick = () => { s.size = Math.max(13, s.size - 1); App.refresh(); };
    $('#fp').onclick = () => { s.size = Math.min(28, s.size + 1); App.refresh(); };
    $('#pch').onclick = () => printPassage(`${B[s.b].name} ${s.c}`, verses);
    $('#prj').onclick = () => { if (s.sel.length) project(s.b, s.c, Math.min(...s.sel), Math.max(...s.sel)); else { api.projectorOpen(); App.toast('Sélectionnez un verset puis cliquez sur « Projeter ».'); } };

    let anchor = null;
    box.querySelectorAll('.vs').forEach(p => p.addEventListener('mousedown', ev => { if (ev.shiftKey) ev.preventDefault(); }));
    box.querySelectorAll('.vs').forEach(p => (p.onclick = ev => {
      const v = +p.dataset.v;
      if (ev.shiftKey && anchor) {
        const [a, z] = [Math.min(anchor, v), Math.max(anchor, v)];
        s.sel = [...new Set([...s.sel, ...Array.from({ length: z - a + 1 }, (_, i) => a + i)])];
      } else {
        s.sel = s.sel.includes(v) ? s.sel.filter(x => x !== v) : [...s.sel, v];
        anchor = v;
      }
      box.querySelectorAll('.vs').forEach(x => x.classList.toggle('sel', s.sel.includes(+x.dataset.v)));
      renderSel();
    }));
    p_dbl(box);

    function renderSel() {
      const bar = $('#selbar');
      if (!s.sel.length) { bar.innerHTML = ''; bar.classList.remove('show'); return; }
      const ref = BIBLE.labelVerses(s.b, s.c, s.sel);
      const sel = verses.filter(v => s.sel.includes(v.v));
      bar.classList.add('show');
      bar.innerHTML = `<b>${U.esc(ref)}</b><span class="muted">${sel.length} verset(s)</span>
        <button class="btn sm" data-s="copy">Copier</button><button class="btn sm" data-s="mark">Marque-page</button>
        <button class="btn sm" data-s="print">Imprimer / PDF</button><button class="btn sm gold" data-s="proj">Projeter</button><button class="btn sm ghost" data-s="clear">Effacer</button>`;
      bar.querySelector('[data-s=copy]').onclick = () => copy(passageText(ref, sel));
      bar.querySelector('[data-s=print]').onclick = () => printPassage(ref, sel);
      bar.querySelector('[data-s=proj]').onclick = () => project(s.b, s.c, Math.min(...s.sel), Math.max(...s.sel));
      bar.querySelector('[data-s=clear]').onclick = () => { s.sel = []; box.querySelectorAll('.vs.sel').forEach(x => x.classList.remove('sel')); renderSel(); };
      bar.querySelector('[data-s=mark]').onclick = async () => {
        const note = await App.prompt('Ajouter un marque-page', `${ref} — note (facultative)`);
        if (note === null) return;
        App.data.bibleBookmarks.unshift({ id: U.uid(), b: s.b, c: s.c, verses: [...s.sel].sort((x, y) => x - y), ref, note, by: App.user.name, at: U.now() });
        App.log('Marque-page', ref);
        await App.persist();
        App.toast('Marque-page ajouté.');
      };
    }
    renderSel();
    markProjected();
    if (s.flash) {
      const target = box.querySelector(`.vs[data-v="${s.flash[0]}"]`);
      if (target) setTimeout(() => target.scrollIntoView({ block: 'center' }), 30);
      s.flash = null;
    }
  }
  // Double-clic sur un verset : projection immédiate
  function p_dbl(box) {
    const s = st();
    box.querySelectorAll('.vs').forEach(p => (p.ondblclick = () => { s.sel = [+p.dataset.v]; project(s.b, s.c, +p.dataset.v, +p.dataset.v); App.refresh(); }));
  }

  function search(box) {
    const s = st();
    box.innerHTML = `<form class="toolbar" id="sf">
        <input type="search" id="sq" placeholder="Mots à rechercher (ex. grâce paix) ou &quot;expression exacte&quot;" value="${U.esc(s.q)}" style="max-width:none;flex:2">
        <select class="field-inline" id="ss"><option value="all">Toute la Bible</option><option value="at">Ancien Testament</option><option value="nt">Nouveau Testament</option>
          <optgroup label="Un livre">${B.map(b => `<option value="b${b.i}">${U.esc(b.name)}</option>`).join('')}</optgroup></select>
        <button class="btn primary">Rechercher</button></form><div id="sr"></div>`;
    box.querySelector('#ss').value = s.scope;
    const run = () => {
      s.q = box.querySelector('#sq').value;
      s.scope = box.querySelector('#ss').value;
      const opt = s.scope.startsWith('b') ? { book: +s.scope.slice(1) } : { scope: s.scope };
      const r = BIBLE.search(s.q, opt);
      const out = box.querySelector('#sr');
      if (!s.q.trim()) { out.innerHTML = '<p class="muted">Recherche sans tenir compte des accents ni des majuscules. Tous les mots doivent figurer dans le verset ; mettez une expression entre guillemets pour la chercher telle quelle.</p>'; return; }
      out.innerHTML = `<p class="muted">${U.int(r.total)} verset(s) trouvé(s)${r.total > r.results.length ? ` — ${r.results.length} premiers affichés` : ''}.
        ${r.results.length ? '<button class="btn sm" id="scsv">Exporter CSV</button>' : ''}</p>
        <div class="results">${r.results.map(v => `<div class="res" data-b="${v.b}" data-c="${v.c}" data-v="${v.v}"><b>${U.esc(B[v.b].name)} ${v.c}:${v.v}</b><span>${BIBLE.highlight(v.t, r.words)}</span></div>`).join('')}</div>`;
      out.querySelectorAll('.res').forEach(x => (x.onclick = () => { Object.assign(s, { b: +x.dataset.b, c: +x.dataset.c, sel: [+x.dataset.v], flash: [+x.dataset.v] }); App.ui['t:bible'] = 'read'; App.refresh(); }));
      out.querySelector('#scsv')?.addEventListener('click', () => App.exportCSV(`Recherche-Bible-${s.q}`.replace(/[^\wÀ-ÿ-]+/g, '-'), [['Référence', 'Texte'], ...r.results.map(v => [`${B[v.b].name} ${v.c}:${v.v}`, v.t])]));
    };
    box.querySelector('#sf').onsubmit = ev => { ev.preventDefault(); run(); };
    run();
    box.querySelector('#sq').focus();
  }

  function marks(box) {
    const M = App.data.bibleBookmarks;
    const s = st();
    if (!M.length) { box.innerHTML = '<div class="empty"><b>Aucun marque-page</b>Sélectionnez des versets dans l’onglet « Lecture » puis cliquez sur « Marque-page ».</div>'; return; }
    box.innerHTML = `<div class="results">${M.map(m => {
      const t = BIBLE.passage({ b: m.b, c1: m.c, c2: m.c }).filter(v => m.verses.includes(v.v)).map(v => v.t).join(' ');
      return `<div class="res mark" data-id="${m.id}"><b>${U.esc(m.ref)}</b><span>${U.esc(t.length > 260 ? t.slice(0, 260) + '…' : t)}${m.note ? `<em>${U.esc(m.note)}</em>` : ''}<small class="muted">${U.esc(m.by)} · ${new Date(m.at).toLocaleDateString('fr-FR')}</small></span>
        <div class="act"><button class="btn sm gold" data-m="proj">Projeter</button><button class="btn sm" data-m="copy">Copier</button><button class="btn sm ghost danger" data-m="del" title="Supprimer">✕</button></div></div>`;
    }).join('')}</div>`;
    box.querySelectorAll('.res').forEach(x => {
      const m = M.find(y => y.id === x.dataset.id);
      x.onclick = ev => {
        const a = ev.target.closest('[data-m]')?.dataset.m;
        const sel = BIBLE.passage({ b: m.b, c1: m.c, c2: m.c }).filter(v => m.verses.includes(v.v));
        if (a === 'proj') return project(m.b, m.c, Math.min(...m.verses), Math.max(...m.verses));
        if (a === 'copy') return copy(passageText(m.ref, sel));
        if (a === 'del') return (async () => { if (!await App.confirm(`Supprimer le marque-page « ${U.esc(m.ref)} » ?`, 'Supprimer', true)) return; App.data.bibleBookmarks = M.filter(y => y !== m); await App.persist(); App.refresh(); })();
        Object.assign(s, { b: m.b, c: m.c, sel: [...m.verses], flash: [m.verses[0]] });
        App.ui['t:bible'] = 'read';
        App.refresh();
      };
    });
  }

  /* ---------- Aperçu d'un passage depuis un autre module (champ « texte biblique ») ---------- */
  async function preview(input) {
    const ref = BIBLE.parse(input);
    if (!ref) return App.toast(`Référence non reconnue : « ${input || ''} ». Exemples : Jean 3:16, 1 Co 13:4-7.`, true);
    await BIBLE.load();
    const verses = BIBLE.passage(ref);
    if (!verses.length) return App.toast('Ce passage n’existe pas dans la Bible.', true);
    const label = BIBLE.label(ref);
    const m = App.modal({ title: `${label} — Louis Segond 1910`, body: `<div class="bible-page" style="font-size:16px;padding:4px 6px">${verses.map(v => `<p class="vs"><sup>${v.v}</sup>${U.esc(v.t)}</p>`).join('')}</div>`,
      footer: `<button class="btn" data-a="copy">Copier</button><button class="btn" data-a="print">Imprimer / PDF</button>${verses.length <= 40 && ref.c1 === ref.c2 ? '<button class="btn gold" data-a="proj">Projeter</button>' : ''}<button class="btn primary" data-a="open">Ouvrir dans la Bible</button>` });
    m.el.querySelector('[data-a=copy]').onclick = () => copy(passageText(label, verses));
    m.el.querySelector('[data-a=print]').onclick = () => printPassage(label, verses);
    m.el.querySelector('[data-a=proj]')?.addEventListener('click', () => project(ref.b, ref.c1, verses[0].v, verses[verses.length - 1].v));
    m.el.querySelector('[data-a=open]').onclick = () => { document.querySelectorAll('.overlay').forEach(o => o.remove()); openRef(input); };
  }

  // Raccourcis clavier pendant la projection
  document.addEventListener('keydown', e => {
    if (!st().proj || App.view !== 'bible' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.querySelector('.overlay')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    if (e.key === 'b' || e.key === 'B') { st().proj.black = !st().proj.black; send(); }
  });
  if (window.api?.onProjectorClosed) api.onProjectorClosed(() => { if (st().proj) { st().proj = null; renderProjBar(); markProjected(); } });

  return { view, preview, openRef, renderProjBar };
})();
