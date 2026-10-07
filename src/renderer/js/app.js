'use strict';
/* Noyau de l'application : état, authentification, navigation, listes et formulaires génériques. */
const LOGO = `<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#c9a24a" stroke-width="2.5"/><circle cx="50" cy="50" r="40" fill="none" stroke="#c9a24a" stroke-opacity=".35" stroke-width="1"/><rect x="45" y="22" width="10" height="56" rx="1.5" fill="#c9a24a"/><rect x="31" y="35" width="38" height="9" rx="1.5" fill="#c9a24a"/><path d="M24 40 Q19 50 24 60" fill="none" stroke="#e6d4a6" stroke-width="2.4" stroke-linecap="round"/><path d="M76 40 Q81 50 76 60" fill="none" stroke="#e6d4a6" stroke-width="2.4" stroke-linecap="round"/><path d="M18 36 Q11 50 18 64" fill="none" stroke="#8a93a6" stroke-width="2" stroke-linecap="round"/><path d="M82 36 Q89 50 82 64" fill="none" stroke="#8a93a6" stroke-width="2" stroke-linecap="round"/></svg>`;

const NAV = [
  { group: 'Pilotage', items: [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'rapports', label: 'Rapports et indicateurs', num: '09' },
    { id: 'calendrier', label: 'Calendrier de gestion', num: '10' }
  ] },
  { group: 'Administration', items: [
    { id: 'gouvernance', label: 'Gouvernance', num: '02' },
    { id: 'membres', label: 'Membres', num: '03' }
  ] },
  { group: 'Finances', items: [
    { id: 'dons', label: 'Dîmes, offrandes et dons', num: '04' },
    { id: 'budget', label: 'Budget', num: '05' },
    { id: 'depenses', label: 'Dépenses', num: '05' }
  ] },
  { group: 'Vie de l’Église', items: [
    { id: 'predication', label: 'Prédicateurs et cultes', num: '06' },
    { id: 'ministeres', label: 'Ministères et bénévoles', num: '07' }
  ] },
  { group: 'Ministère média', items: [
    { id: 'mercitv', label: 'MERCI TV', num: '08' }
  ] },
  { group: 'Redevabilité', items: [
    { id: 'archives', label: 'Archives', num: '09' }
  ] },
  { group: 'Référence', items: [
    { id: 'bible', label: 'Bible Louis Segond 1910', num: '✝' },
    { id: 'guide', label: 'Guide de gestion', num: '01' },
    { id: 'parametres', label: 'Paramètres', roles: ['admin', 'pasteur'] }
  ] }
];

const App = {
  data: null,
  user: null,
  info: {},
  view: 'dashboard',
  ui: {},          // état par liste : recherche, filtres, tri, onglets
  saving: Promise.resolve(),
  idleTimer: null,

  async boot() {
    this.info = await api.info();
    let data = await api.load();
    if (!data) data = SEED.initialData();
    this.data = this.migrate(data);
    if (!this.data.users.length) this.renderSetup(); else this.renderLogin();
  },

  // Garantit la présence de toutes les collections (mises à jour du logiciel).
  migrate(data) {
    const base = SEED.initialData();
    for (const k of Object.keys(base)) if (data[k] === undefined) data[k] = base[k];
    for (const k of Object.keys(base.settings)) if (data.settings[k] === undefined) data.settings[k] = base.settings[k];
    return data;
  },

  persist() {
    const snapshot = JSON.parse(JSON.stringify(this.data));
    this.saving = this.saving.then(() => api.save(snapshot)).catch(err => this.toast('Erreur d’enregistrement : ' + err.message, true));
    return this.saving;
  },

  log(action, what) {
    this.data.log.unshift({ at: U.now(), user: this.user?.name || '—', action, what });
    if (this.data.log.length > 2000) this.data.log.length = 2000;
  },

  /* ---------------- Authentification ---------------- */
  renderSetup() {
    document.body.innerHTML = `<div class="auth"><form class="auth-card" id="f">
      ${LOGO}<h1>Bienvenue</h1><div class="sub">Configuration initiale de MERCI TV Gestion</div>
      <p class="hint">Créez le compte administrateur. Il pourra ensuite créer les comptes du secrétariat, de la trésorerie et de l’équipe média.</p>
      <label>Nom de l’Église</label><input name="church" placeholder="Ex. : Église …">
      <label>Votre nom</label><input name="name" required value="Angelex Willy MEANGNIN">
      <label>Identifiant de connexion</label><input name="login" required value="admin" autocomplete="username">
      <label>Mot de passe (8 caractères minimum)</label><input name="pw" type="password" required minlength="8" autocomplete="new-password">
      <label>Confirmer le mot de passe</label><input name="pw2" type="password" required autocomplete="new-password">
      <div class="err" id="err"></div>
      <button class="btn gold">Créer le compte et commencer</button>
    </form></div>`;
    document.getElementById('f').onsubmit = async ev => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      const err = document.getElementById('err');
      if (f.pw.length < 8) return (err.textContent = 'Le mot de passe doit contenir au moins 8 caractères.');
      if (f.pw !== f.pw2) return (err.textContent = 'Les mots de passe ne correspondent pas.');
      const h = await api.hashPassword(f.pw);
      const user = { id: U.uid(), name: f.name.trim(), login: f.login.trim().toLowerCase(), role: 'admin', active: true, ...h, createdAt: U.now() };
      this.data.users.push(user);
      if (f.church.trim()) this.data.settings.churchName = f.church.trim();
      this.user = user;
      this.log('Création', 'Compte administrateur');
      await this.persist();
      this.start();
    };
  },

  renderLogin(msg = '') {
    const s = this.data.settings;
    document.body.innerHTML = `<div class="auth"><form class="auth-card" id="f">
      ${LOGO}<h1>MERCI TV Gestion</h1><div class="sub">${U.esc(s.churchName || 'Guide de gestion d’Église et du ministère média')}</div>
      <label>Identifiant</label><input name="login" required autofocus autocomplete="username">
      <label>Mot de passe</label><input name="pw" type="password" required autocomplete="current-password">
      <div class="err" id="err">${U.esc(msg)}</div>
      <button class="btn gold">Se connecter</button>
      <div class="verse">« Que tout se fasse avec bienséance et avec ordre. »<b>1 CORINTHIENS 14:40</b></div>
    </form></div>`;
    document.getElementById('f').onsubmit = async ev => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      const u = this.data.users.find(x => x.login === f.login.trim().toLowerCase() && x.active !== false);
      const ok = u && await api.verifyPassword(f.pw, u.salt, u.hash, u.iter);
      if (!ok) return (document.getElementById('err').textContent = 'Identifiant ou mot de passe incorrect.');
      this.user = u;
      u.lastLogin = U.now();
      this.log('Connexion', u.name);
      this.persist();
      this.start();
    };
  },

  logout(msg) {
    if (this.user) this.log('Déconnexion', this.user.name);
    this.persist();
    this.user = null;
    clearTimeout(this.idleTimer);
    this.renderLogin(msg);
  },

  // Verrouillage automatique après 30 minutes d'inactivité (données confidentielles).
  armIdle() {
    const reset = () => {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.user && this.logout('Session verrouillée après 30 minutes d’inactivité.'), 30 * 60 * 1000);
    };
    ['mousemove', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    reset();
  },

  role() { return SEED.ROLES[this.user?.role] || { modules: [] }; },
  can(roles) { return roles.includes(this.user?.role); },
  canModule(id) {
    const item = NAV.flatMap(g => g.items).find(i => i.id === id);
    if (item?.roles && !this.can(item.roles)) return false;
    const m = this.role().modules;
    return m === '*' || m.includes(id);
  },

  /* ---------------- Coquille ---------------- */
  start() {
    document.body.innerHTML = `<div class="shell">
      <aside class="side">
        <div class="brand">${LOGO}<div><b>MERCI TV</b><span id="church-name"></span></div></div>
        <nav class="nav" id="nav"></nav>
        <div class="side-foot"><div class="who"><b>${U.esc(this.user.name)}</b><span>${U.esc(this.role().label)}</span></div>
          <button id="btn-pw" title="Changer mon mot de passe">Compte</button><button id="btn-out" title="Se déconnecter">Quitter</button></div>
      </aside>
      <main class="main" id="main"></main>
    </div>`;
    document.getElementById('btn-out').onclick = () => this.logout();
    document.getElementById('btn-pw').onclick = () => this.changePassword();
    this.armIdle();
    if (!this.canModule(this.view)) this.view = 'dashboard';
    this.go(this.view);
  },

  renderNav() {
    document.getElementById('church-name').textContent = this.data.settings.churchName || 'Gestion d’Église';
    const badges = { depenses: this.pendingApprovals().length, dons: this.data.collections.filter(c => c.status === 'Compté').length };
    document.getElementById('nav').innerHTML = NAV.map(g => {
      const items = g.items.filter(i => this.canModule(i.id));
      if (!items.length) return '';
      return `<h6>${U.esc(g.group)}</h6>` + items.map(i => `<button data-go="${i.id}" class="${this.view === i.id ? 'active' : ''}">
        <span class="num">${i.num || '·'}</span>${U.esc(i.label)}${badges[i.id] ? `<span class="badge">${badges[i.id]}</span>` : ''}</button>`).join('');
    }).join('');
    document.querySelectorAll('[data-go]').forEach(b => (b.onclick = () => this.go(b.dataset.go)));
  },

  go(view) {
    if (!this.canModule(view)) return this.toast('Accès réservé à d’autres fonctions.', true);
    this.view = view;
    this.renderNav();
    const main = document.getElementById('main');
    main.innerHTML = '';
    main.scrollTop = 0;
    (VIEWS[view] || VIEWS.dashboard)(main);
  },

  refresh() { this.go(this.view); },

  pageHead(num, eyebrow, title, actions = '') {
    return `<div class="page-head">${num ? `<div class="n">${num}</div>` : ''}<div><div class="eyebrow">${U.esc(eyebrow)}</div><h1>${U.esc(title)}</h1></div><div class="actions">${actions}</div></div>`;
  },

  tabs(key, tabs, el, renderers) {
    const cur = this.ui[key] || tabs[0][0];
    const bar = U.h(`<div class="tabs">${tabs.map(([id, label]) => `<button data-t="${id}" class="${id === cur ? 'active' : ''}">${U.esc(label)}</button>`).join('')}</div>`);
    const body = document.createElement('div');
    el.append(bar, body);
    bar.querySelectorAll('button').forEach(b => (b.onclick = () => { this.ui[key] = b.dataset.t; this.refresh(); }));
    renderers[cur](body);
  },

  toast(msg, err = false) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = U.h(`<div class="toast ${err ? 'err' : ''}">${U.esc(msg)}</div>`);
    document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  },

  /* ---------------- Boîtes de dialogue ---------------- */
  modal({ title, body, size = '', footer = '' }) {
    const o = U.h(`<div class="overlay"><div class="modal ${size}"><header><h3>${U.esc(title)}</h3><button class="x" title="Fermer">×</button></header><div class="body"></div><footer>${footer}</footer></div></div>`);
    const close = () => o.remove();
    o.querySelector('.x').onclick = close;
    o.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    if (typeof body === 'string') o.querySelector('.body').innerHTML = body; else o.querySelector('.body').append(body);
    document.body.append(o);
    return { el: o, close };
  },

  confirm(message, okLabel = 'Confirmer', danger = false) {
    return new Promise(resolve => {
      const m = this.modal({ title: 'Confirmation', size: 'sm', body: `<p style="line-height:1.5;margin:0">${message}</p>`,
        footer: `<button class="btn" data-a="no">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok">${U.esc(okLabel)}</button>` });
      m.el.querySelector('[data-a=no]').onclick = () => { m.close(); resolve(false); };
      m.el.querySelector('[data-a=ok]').onclick = () => { m.close(); resolve(true); };
      m.el.querySelector('[data-a=ok]').focus();
    });
  },

  prompt(title, label, { value = '', required = false } = {}) {
    return new Promise(resolve => {
      const m = this.modal({ title, size: 'sm', body: `<div class="f"><label>${U.esc(label)}</label><textarea id="pv">${U.esc(value)}</textarea></div>`,
        footer: `<button class="btn" data-a="no">Annuler</button><button class="btn primary" data-a="ok">Valider</button>` });
      const ta = m.el.querySelector('#pv');
      ta.focus();
      m.el.querySelector('[data-a=no]').onclick = () => { m.close(); resolve(null); };
      m.el.querySelector('[data-a=ok]').onclick = () => { if (required && !ta.value.trim()) return ta.focus(); m.close(); resolve(ta.value.trim()); };
    });
  },

  async changePassword() {
    const m = this.modal({ title: 'Changer mon mot de passe', size: 'sm', body: `<div class="form-error" id="pe"></div>
      <div class="f"><label>Mot de passe actuel</label><input type="password" id="p0"></div>
      <div class="f mt"><label>Nouveau mot de passe (8 caractères min.)</label><input type="password" id="p1"></div>
      <div class="f mt"><label>Confirmer</label><input type="password" id="p2"></div>`,
      footer: `<button class="btn" data-a="no">Annuler</button><button class="btn primary" data-a="ok">Enregistrer</button>` });
    const $ = s => m.el.querySelector(s);
    $('[data-a=no]').onclick = m.close;
    $('[data-a=ok]').onclick = async () => {
      const err = t => { $('#pe').textContent = t; $('#pe').classList.add('show'); };
      if (!await api.verifyPassword($('#p0').value, this.user.salt, this.user.hash, this.user.iter)) return err('Mot de passe actuel incorrect.');
      if ($('#p1').value.length < 8) return err('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      if ($('#p1').value !== $('#p2').value) return err('Les mots de passe ne correspondent pas.');
      Object.assign(this.user, await api.hashPassword($('#p1').value));
      this.log('Modification', 'Mot de passe de ' + this.user.name);
      await this.persist();
      m.close();
      this.toast('Mot de passe modifié.');
    };
  },

  /* ---------------- Données ---------------- */
  upsert(coll, rec) {
    const list = this.data[coll];
    const i = list.findIndex(x => x.id === rec.id);
    rec.updatedAt = U.now();
    rec.updatedBy = this.user?.name;
    if (i >= 0) list[i] = rec; else { rec.createdAt = rec.updatedAt; rec.createdBy = this.user?.name; list.push(rec); }
    return rec;
  },

  references(coll, id) {
    let n = 0;
    for (const s of Object.values(SCHEMAS)) for (const f of s.fields) if (f.type === 'ref' && f.ref === coll) n += this.data[s.coll].filter(r => r[f.k] === id).length;
    if (coll === 'meetings') n += this.data.decisions.filter(d => d.meetingId === id).length;
    return n;
  },

  label(schema, r) {
    return r.name || r.title || [r.lastName, r.firstName].filter(Boolean).join(' ') || r.object || r.text || r.service || U.date(r.date) || '';
  },

  budgetLineNames(year) {
    const b = this.data.budgets[year];
    const lines = (b ? b.lines : SEED.budgetLines()).filter(l => l.kind === 'depense').map(l => l.name);
    return lines;
  },

  pendingApprovals() {
    if (!this.user) return [];
    const S = SCHEMAS.expenses;
    return this.data.expenses.filter(r => !r.rejected && !r.paid && S.LEVELS.some(l => !r['ok_' + l.k] && this.can(l.roles) && this.canSign(r, l) === true));
  },

  // Séparation des tâches : un même utilisateur ne peut ni autoriser sa propre demande ni signer deux niveaux.
  canSign(r, level) {
    const me = this.user;
    if (r.requesterId === me.id || U.norm(r.requester).trim() === U.norm(me.name).trim()) return 'Vous ne pouvez pas autoriser votre propre demande de dépense.';
    const other = SCHEMAS.expenses.LEVELS.find(l => l.k !== level.k && r['ok_' + l.k]?.userId === me.id);
    if (other) return `Vous avez déjà autorisé cette demande au niveau « ${other.label} ». Un autre signataire est requis.`;
    return true;
  },

  async approveExpense(r, level) {
    const ok = this.canSign(r, level);
    if (ok !== true) return this.toast(ok, true);
    if (!await this.confirm(`Autoriser la dépense « ${U.esc(r.object)} » de <b>${U.money(r.amount)}</b> au niveau <b>${level.label}</b> ?`, 'Autoriser')) return;
    r['ok_' + level.k] = { by: this.user.name, userId: this.user.id, at: U.now() };
    this.upsert('expenses', r);
    this.log('Autorisation ' + level.label, `${r.object} (${U.money(r.amount)})`);
    await this.persist();
    this.toast('Autorisation enregistrée.');
    this.refresh();
  },

  async payExpense(r) {
    const m = this.modal({ title: 'Enregistrer le paiement', size: 'sm', body: `
      <div class="f"><label>Date de paiement</label><input type="date" id="pd" value="${U.today()}"></div>
      <div class="f mt"><label>Mode de paiement</label><select id="pm"><option>Espèces</option><option>Chèque</option><option>Virement</option><option>Mobile Money</option></select></div>
      <div class="f mt"><label>Référence</label><input id="pr"></div>`,
      footer: `<button class="btn" data-a="no">Annuler</button><button class="btn primary" data-a="ok">Marquer payée</button>` });
    m.el.querySelector('[data-a=no]').onclick = m.close;
    m.el.querySelector('[data-a=ok]').onclick = async () => {
      r.paid = { by: this.user.name, userId: this.user.id, at: U.now() };
      r.paidDate = m.el.querySelector('#pd').value || U.today();
      r.paymentMode = m.el.querySelector('#pm').value;
      r.paymentRef = m.el.querySelector('#pr').value;
      this.upsert('expenses', r);
      this.log('Paiement', `${r.object} (${U.money(r.amount)})`);
      await this.persist();
      m.close();
      this.toast('Paiement enregistré.');
      this.refresh();
    };
  },

  async rejectExpense(r) {
    const reason = await this.prompt('Rejeter la demande', 'Motif du rejet', { required: true });
    if (reason === null) return;
    r.rejected = { by: this.user.name, userId: this.user.id, at: U.now(), reason };
    this.upsert('expenses', r);
    this.log('Rejet', `${r.object} — ${reason}`);
    await this.persist();
    this.refresh();
  },

  /* ---------------- Export / impression ---------------- */
  async exportPDF(html, name) {
    try { const p = await api.exportPDF(html, name); if (p) this.toast('PDF enregistré.'); } catch (e) { this.toast(e.message, true); }
  },
  async print(html) { try { await api.printHTML(html); } catch (e) { this.toast(e.message, true); } },
  async exportCSV(name, rows) {
    try { const p = await api.exportCSV(name, U.toCSV(rows)); if (p) this.toast('Fichier CSV enregistré (ouvrable dans Excel).'); } catch (e) { this.toast(e.message, true); }
  },

  /* ---------------- Liste générique ---------------- */
  list(el, key, opts = {}) {
    const S = SCHEMAS[key];
    const st = this.ui['list:' + key] || (this.ui['list:' + key] = { q: '', f: {}, sort: { ...S.sort } });
    const wrap = document.createElement('div');
    el.append(wrap);

    const filterOptions = f => f.options || (f.optionsFn ? f.optionsFn() : f.ref ? this.data[f.ref].map(x => [x.id, x.name]) : []);
    const monthsFor = f => [...new Set(this.data[S.coll].map(r => U.monthKey(r[f.month])).filter(Boolean))].sort().reverse();

    const rowsFiltered = () => {
      let rows = this.data[S.coll].slice();
      if (opts.where) rows = rows.filter(opts.where);
      const q = U.norm(st.q).trim();
      if (q) rows = rows.filter(r => (S.search || []).some(k => U.norm(r[k]).includes(q)));
      for (const f of S.filters || []) {
        const v = st.f[f.k];
        if (!v) continue;
        if (f.month) rows = rows.filter(r => U.monthKey(r[f.month]) === v);
        else if (f.test) rows = rows.filter(r => f.test(r, v));
        else rows = rows.filter(r => String(r[f.k] ?? '') === v);
      }
      const col = S.columns.find(c => c.k === st.sort.k);
      const val = r => col?.sortVal ? col.sortVal(r) : r[st.sort.k];
      rows.sort((a, b) => {
        const x = val(a), y = val(b);
        const nx = typeof x === 'number' || (col?.num), c = nx ? U.num(x) - U.num(y) : String(x ?? '').localeCompare(String(y ?? ''), 'fr', { numeric: true });
        return c * st.sort.dir;
      });
      return rows;
    };

    const render = () => {
      const rows = rowsFiltered();
      const hasActions = !!(S.rowActions || S.print);
      const foot = S.footer && rows.length ? S.footer(rows) : null;
      wrap.innerHTML = `
        <div class="toolbar">
          <input type="search" placeholder="Rechercher…" value="${U.esc(st.q)}" data-q>
          ${(S.filters || []).map(f => {
            const o = f.month ? monthsFor(f).map(m => [m, U.monthLabel(m)]) : filterOptions(f).map(x => Array.isArray(x) ? x : [x, x]);
            return `<select data-f="${f.k}"><option value="">${U.esc(f.label)} : tous</option>${o.map(([v, l]) => `<option value="${U.esc(v)}" ${st.f[f.k] === v ? 'selected' : ''}>${U.esc(l)}</option>`).join('')}</select>`;
          }).join('')}
          <span class="count">${rows.length} enregistrement${rows.length > 1 ? 's' : ''}</span>
          <button class="btn sm" data-csv title="Exporter vers Excel">Exporter CSV</button>
          <button class="btn sm" data-pdf>PDF</button>
          ${opts.readOnly ? '' : `<button class="btn primary" data-new>+ Ajouter ${U.esc(S.singular)}</button>`}
        </div>
        <div class="table-wrap">${rows.length ? `<table class="grid"><thead><tr>
          ${S.columns.map(c => `<th class="sortable ${c.num ? 'num' : ''}" data-s="${c.k}">${U.esc(c.label)}${st.sort.k === c.k ? (st.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}
          ${hasActions ? '<th></th>' : ''}</tr></thead>
          <tbody>${rows.map(r => `<tr class="clickable" data-id="${r.id}">${S.columns.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.fmt ? c.fmt(r) : U.esc(r[c.k] ?? '')}</td>`).join('')}
            ${hasActions ? `<td class="act">${(S.rowActions || []).filter(a => a.show(r)).map((a, i) => `<button class="btn sm ${a.cls || ''}" data-ra="${S.rowActions.indexOf(a)}">${U.esc(a.label)}</button>`).join(' ')}
              ${S.print ? `<button class="btn sm ghost" data-pr title="Imprimer / PDF">🖨</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody>
          ${foot ? `<tfoot><tr>${S.columns.map((c, i) => `<td class="${c.num ? 'num' : ''}">${foot[c.k] ?? (i === 0 ? 'Total' : '')}</td>`).join('')}${hasActions ? '<td></td>' : ''}</tr></tfoot>` : ''}
          </table>` : `<div class="empty"><b>Aucun enregistrement</b>${st.q || Object.values(st.f).some(Boolean) ? 'Modifiez la recherche ou les filtres.' : `Cliquez sur « Ajouter ${U.esc(S.singular)} » pour commencer.`}</div>`}</div>`;

      const q = wrap.querySelector('[data-q]');
      q.oninput = () => { st.q = q.value; const pos = q.selectionStart; render(); const n = wrap.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); };
      wrap.querySelectorAll('[data-f]').forEach(s => (s.onchange = () => { st.f[s.dataset.f] = s.value; render(); }));
      wrap.querySelectorAll('[data-s]').forEach(th => (th.onclick = () => { const k = th.dataset.s; st.sort = st.sort.k === k ? { k, dir: -st.sort.dir } : { k, dir: 1 }; render(); }));
      const nb = wrap.querySelector('[data-new]');
      if (nb) nb.onclick = () => this.form(key, null, opts.presets ? opts.presets() : {});
      wrap.querySelectorAll('tbody tr').forEach(tr => (tr.onclick = ev => {
        if (ev.target.closest('button')) return;
        this.form(key, this.data[S.coll].find(x => x.id === tr.dataset.id));
      }));
      wrap.querySelectorAll('[data-ra]').forEach(b => (b.onclick = () => {
        const r = this.data[S.coll].find(x => x.id === b.closest('tr').dataset.id);
        S.rowActions[+b.dataset.ra].run(r);
      }));
      wrap.querySelectorAll('[data-pr]').forEach(b => (b.onclick = () => {
        const r = this.data[S.coll].find(x => x.id === b.closest('tr').dataset.id);
        this.printMenu(S.print(r), `${S.title}-${this.label(S, r)}`.slice(0, 80));
      }));
      const csvRows = () => [S.columns.map(c => c.label), ...rows.map(r => S.columns.map(c => c.csv ? c.csv(r) : (r[c.k] ?? '')))];
      wrap.querySelector('[data-csv]').onclick = () => this.exportCSV(S.title.replace(/[^\wÀ-ÿ]+/g, '-'), csvRows());
      wrap.querySelector('[data-pdf]').onclick = () => {
        const strip = h => String(h).replace(/<[^>]+>/g, '');
        this.exportPDF(PRINT.table(S.title, 'Registre', S.columns.map(c => c.label), rows.map(r => S.columns.map(c => c.csv ? c.csv(r) : strip(c.fmt ? c.fmt(r) : r[c.k] ?? ''))), foot ? S.columns.map((c, i) => strip(foot[c.k] ?? (i === 0 ? 'Total' : ''))) : null), S.title);
      };
    };
    render();
  },

  printMenu(html, name) {
    const m = this.modal({ title: 'Imprimer', size: 'sm', body: '<p style="margin:0">Que souhaitez-vous faire de ce document ?</p>',
      footer: `<button class="btn" data-a="pdf">Enregistrer en PDF</button><button class="btn primary" data-a="print">Imprimer</button>` });
    m.el.querySelector('[data-a=pdf]').onclick = () => { m.close(); this.exportPDF(html, name); };
    m.el.querySelector('[data-a=print]').onclick = () => { m.close(); this.print(html); };
  },

  /* ---------------- Formulaire générique ---------------- */
  form(key, rec, presets = {}) {
    const S = SCHEMAS[key];
    const isNew = !rec;
    const r = isNew ? { id: U.uid() } : JSON.parse(JSON.stringify(rec));
    if (isNew) {
      for (const f of S.fields) if (f.k && f.def !== undefined) r[f.k] = typeof f.def === 'function' ? f.def(r) : f.def;
      Object.assign(r, presets);
      if (key === 'expenses') r.requesterId = this.user.id;
    }
    const locked = !isNew && S.locked && S.locked(rec);
    const editable = f => !locked || (S.lockedEditable || []).includes(f.k);

    const fileInner = f => {
      const v = r[f.k];
      return `${v ? `<button type="button" class="btn sm" data-open>📎 ${U.esc(v.name)}</button>` : '<span class="muted">Aucun fichier</span>'}
        ${editable(f) ? `<button type="button" class="btn sm" data-attach>${v ? 'Remplacer' : 'Joindre…'}</button>${v ? '<button type="button" class="btn sm ghost danger" data-detach>Retirer</button>' : ''}` : ''}`;
    };
    const fieldHTML = f => {
      if (f.sec) return `</div><div class="form-sec">${U.esc(f.sec)}</div><div class="fgrid">`;
      const v = r[f.k];
      const dis = editable(f) ? '' : 'disabled';
      const req = f.req ? ' <span class="req">*</span>' : '';
      const lab = `<label for="fld-${f.k}">${U.esc(f.label)}${req}</label>`;
      const help = f.help ? `<div class="help">${U.esc(f.help)}</div>` : '';
      const cls = `f ${f.full ? 'full' : ''}`;
      let input;
      switch (f.type) {
        case 'textarea': input = `<textarea id="fld-${f.k}" name="${f.k}" rows="${f.rows || 3}" ${dis}>${U.esc(v ?? '')}</textarea>`; break;
        case 'select': {
          const opts = f.options || f.optionsFn(r);
          const all = v && !opts.includes(v) ? [v, ...opts] : opts;
          input = `<select id="fld-${f.k}" name="${f.k}" ${dis}>${f.req && !v ? '<option value=""></option>' : ''}${all.map(o => `<option ${o === v ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}</select>`;
          break;
        }
        case 'ref': {
          const items = this.data[f.ref].slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) * -1 || String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
          const lbl = f.refLabel || (x => x.name || x.title || '');
          input = `<select id="fld-${f.k}" name="${f.k}" ${dis}><option value=""></option>${items.map(x => `<option value="${x.id}" ${x.id === v ? 'selected' : ''}>${U.esc(lbl(x))}</option>`).join('')}</select>`;
          break;
        }
        case 'checkbox': return `<div class="${cls}"><div class="checks"><label><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''} ${dis}> ${U.esc(f.label)}</label></div>${help}</div>`;
        case 'checks': input = `<div class="checks ${f.col ? 'col' : ''}">${f.options.map(o => `<label><input type="checkbox" data-checks="${f.k}" value="${U.esc(o)}" ${(v || []).includes(o) ? 'checked' : ''} ${dis}> ${U.esc(o)}</label>`).join('')}</div>`; break;
        case 'computed': input = `<div class="computed" data-computed="${f.k}">${U.esc(f.compute(r))}</div>`; break;
        case 'file': input = `<div class="attach" data-file="${f.k}">${fileInner(f)}</div>`; break;
        case 'scripture': input = `<div class="attach"><input id="fld-${f.k}" name="${f.k}" type="text" value="${U.esc(v ?? '')}" placeholder="ex. Jean 3:16-18" ${dis}><button type="button" class="btn sm" data-bible="${f.k}" title="Lire le passage (Louis Segond 1910)">📖 Lire</button></div>`; break;
        case 'money': case 'number': input = `<input id="fld-${f.k}" name="${f.k}" type="number" step="${f.type === 'money' ? '1' : 'any'}" min="0" value="${U.esc(v ?? '')}" ${dis}>`; break;
        default: input = `<input id="fld-${f.k}" name="${f.k}" type="${f.type || 'text'}" value="${U.esc(v ?? '')}" ${dis}>`;
      }
      return `<div class="${cls}">${lab}${input}${help}</div>`;
    };

    const bodyHTML = `<div class="form-error" id="ferr"></div>${locked ? `<div class="note">${U.esc(S.lockedMsg || 'Enregistrement verrouillé.')}</div>` : ''}<div class="fgrid">${S.fields.map(fieldHTML).join('')}</div>`
      .replace(/<div class="fgrid"><\/div>/g, '');
    const m = this.modal({
      title: (isNew ? 'Ajouter ' : 'Modifier ') + S.singular,
      body: bodyHTML,
      footer: `<div class="left">${!isNew && !locked ? '<button class="btn danger" data-a="del">Supprimer</button>' : ''}${!isNew && S.print ? '<button class="btn" data-a="print">Imprimer / PDF</button>' : ''}</div>
        <button class="btn" data-a="cancel">Annuler</button><button class="btn primary" data-a="save">Enregistrer</button>`
    });
    const $ = s => m.el.querySelector(s);

    const read = () => {
      for (const f of S.fields) {
        if (!f.k || !editable(f)) continue;
        if (f.type === 'checkbox') r[f.k] = !!m.el.querySelector(`[name="${f.k}"]`)?.checked;
        else if (f.type === 'checks') r[f.k] = [...m.el.querySelectorAll(`[data-checks="${f.k}"]:checked`)].map(c => c.value);
        else if (f.type === 'computed' || f.type === 'file') continue;
        else { const el = m.el.querySelector(`[name="${f.k}"]`); if (el) r[f.k] = f.type === 'money' || f.type === 'number' ? (el.value === '' ? '' : U.num(el.value)) : el.value.trim(); }
      }
    };
    const recompute = () => { read(); m.el.querySelectorAll('[data-computed]').forEach(c => { c.textContent = S.fields.find(f => f.k === c.dataset.computed).compute(r); }); };
    m.el.querySelector('.body').addEventListener('input', recompute);
    m.el.querySelector('.body').addEventListener('change', recompute);

    const bindFile = box => {
      const k = box.dataset.file;
      const f = S.fields.find(x => x.k === k);
      const repaint = () => { box.innerHTML = fileInner(f); bindFile(box); };
      box.querySelector('[data-open]')?.addEventListener('click', () => api.openFile(r[k].stored).catch(e => this.toast(e.message, true)));
      box.querySelector('[data-attach]')?.addEventListener('click', async () => { const file = await api.attachFile(); if (file) { r[k] = file; repaint(); } });
      box.querySelector('[data-detach]')?.addEventListener('click', () => { r[k] = null; repaint(); });
    };
    m.el.querySelectorAll('[data-file]').forEach(bindFile);
    m.el.querySelectorAll('[data-bible]').forEach(b => (b.onclick = () => BIBLE_UI.preview(m.el.querySelector(`[name="${b.dataset.bible}"]`).value)));

    $('[data-a=cancel]').onclick = m.close;
    $('[data-a=print]')?.addEventListener('click', () => { read(); this.printMenu(S.print(r), `${S.title}-${this.label(S, r)}`.slice(0, 80)); });
    $('[data-a=del]')?.addEventListener('click', async () => {
      const n = this.references(S.coll, r.id);
      const warn = n ? `<br><br><b>Attention :</b> ${n} autre(s) enregistrement(s) y font référence.` : '';
      if (!await this.confirm(`Supprimer définitivement ${U.esc(S.singular)} « ${U.esc(this.label(S, rec))} » ?${warn}`, 'Supprimer', true)) return;
      this.data[S.coll] = this.data[S.coll].filter(x => x.id !== r.id);
      this.log('Suppression', `${S.title} — ${this.label(S, rec)}`);
      await this.persist();
      m.close();
      this.toast('Supprimé.');
      this.refresh();
    });
    $('[data-a=save]').onclick = async () => {
      $('#ferr').classList.remove('show');
      read();
      if (S.beforeSave) S.beforeSave(r);
      const errs = S.fields.filter(f => f.req && editable(f) && (r[f.k] === '' || r[f.k] == null || (Array.isArray(r[f.k]) && !r[f.k].length))).map(f => `« ${f.label} » est obligatoire.`);
      if (S.validate) errs.push(...S.validate(r));
      if (errs.length) { const e = $('#ferr'); e.innerHTML = errs.map(U.esc).join('<br>'); e.classList.add('show'); m.el.querySelector('.body').scrollTop = 0; return; }
      const warns = S.warnings ? S.warnings(r) : [];
      if (warns.length && !await this.confirm(warns.map(U.esc).join('<br>') + '<br><br>Enregistrer quand même ?', 'Enregistrer')) return;
      this.upsert(S.coll, r);
      this.log(isNew ? 'Création' : 'Modification', `${S.title} — ${this.label(S, r)}`);
      await this.persist();
      m.close();
      this.toast('Enregistré.');
      this.refresh();
    };
    setTimeout(() => m.el.querySelector('.body input:not([disabled]), .body select:not([disabled]), .body textarea:not([disabled])')?.focus(), 30);
  }
};

window.addEventListener('DOMContentLoaded', () => App.boot().catch(e => { document.body.innerHTML = `<pre style="padding:20px">Erreur au démarrage : ${U.esc(e.stack || e)}</pre>`; }));
