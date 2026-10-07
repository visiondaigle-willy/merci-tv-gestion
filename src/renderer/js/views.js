'use strict';
/* Écrans de l'application (un par chapitre du guide). */
const IND = (() => {
  const d = () => App.data;
  const inMonth = (s, m) => (s || '').slice(0, 7) === m;
  const inRange = (s, from, to) => { const k = (s || '').slice(0, 7); return k >= from && k <= to; };
  const collTotal = r => SCHEMAS.collections.total(r);

  // Indicateurs du tableau de bord mensuel (chapitre 09). range = [moisDébut, moisFin]
  const DEFS = [
    { k: 'attendance', label: 'Présence moyenne au culte', fn: (a, b) => { const s = d().services.filter(x => inRange(x.date, a, b) && U.num(x.attendance) > 0); return s.length ? Math.round(U.sum(s, 'attendance') / s.length) : 0; } },
    { k: 'visitors', label: 'Nouveaux visiteurs', fn: (a, b) => U.sum(d().services.filter(x => inRange(x.date, a, b)), 'visitors') },
    { k: 'newMembers', label: 'Nouveaux membres / baptêmes', fn: (a, b) => `${d().members.filter(x => inRange(x.arrival, a, b)).length} / ${d().members.filter(x => inRange(x.baptism, a, b)).length}` },
    { k: 'tithes', label: 'Dîmes reçues', money: true, fn: (a, b) => U.sum(d().collections.filter(x => inRange(x.date, a, b)), 'tithes') },
    { k: 'offerings', label: 'Offrandes reçues', money: true, fn: (a, b) => U.sum(d().collections.filter(x => inRange(x.date, a, b)), r => U.num(r.offerings) + U.num(r.project) + U.num(r.other)) },
    { k: 'expenses', label: 'Dépenses réalisées', money: true, fn: (a, b) => U.sum(d().expenses.filter(x => x.paid && inRange(x.paidDate, a, b)), 'amount') },
    { k: 'bank', label: 'Solde bancaire', money: true, manual: true },
    { k: 'social', label: 'Actions sociales réalisées', fn: (a, b) => U.sum(d().ministryReports.filter(x => inRange(x.month, a, b)), 'socialActions') },
    { k: 'recorded', label: 'Prédications enregistrées', fn: (a, b) => d().services.filter(x => x.recorded && inRange(x.date, a, b)).length },
    { k: 'episodes', label: 'Émissions MERCI TV produites', fn: (a, b) => d().tvEpisodes.filter(x => ['Diffusée', 'Archivée'].includes(x.status) && inRange(x.date, a, b)).length },
    { k: 'live', label: 'Cultes diffusés en direct', fn: (a, b) => d().services.filter(x => x.live && inRange(x.date, a, b)).length },
    { k: 'testimonies', label: 'Témoignages ou retours reçus', fn: (a, b) => U.sum(d().ministryReports.filter(x => inRange(x.month, a, b)), 'testimonies') + U.sum(d().tvEpisodes.filter(x => inRange(x.date, a, b)), 'feedback') }
  ];

  function finance(month) {
    const y = month.slice(0, 4), from = `${y}-01`;
    const cols = r => d().collections.filter(x => inRange(x.date, r[0], r[1]));
    const cats = [['Dîmes', 'tithes'], ['Offrandes', 'offerings'], ['Projet', 'project'], ['Autres', 'other']];
    const rec = cats.map(([l, k]) => ({ label: l, month: U.sum(cols([month, month]), k), ytd: U.sum(cols([from, month]), k) }));
    const paid = r => d().expenses.filter(x => x.paid && inRange(x.paidDate, r[0], r[1]));
    const lines = [...new Set([...App.budgetLineNames(y), ...paid([from, month]).map(x => x.budgetLine)])];
    const budget = d().budgets[y];
    const dep = lines.map(l => ({ label: l, month: U.sum(paid([month, month]).filter(x => x.budgetLine === l), 'amount'), ytd: U.sum(paid([from, month]).filter(x => x.budgetLine === l), 'amount'), budget: U.num(budget?.lines.find(b => b.name === l)?.budget) }));
    const commitments = U.sum(d().expenses.filter(x => SCHEMAS.expenses.status(x) === 'Autorisée'), 'amount');
    return { rec, dep, commitments, totalRecMonth: U.sum(rec, 'month'), totalRecYtd: U.sum(rec, 'ytd'), totalDepMonth: U.sum(dep, 'month'), totalDepYtd: U.sum(dep, 'ytd') };
  }

  return { DEFS, finance, inMonth, inRange, collTotal };
})();

const VIEWS = {
  /* ================= Tableau de bord ================= */
  dashboard(el) {
    const D = App.data, today = U.today(), month = today.slice(0, 7);
    const weekStart = U.startOfWeek(new Date()), weekEnd = U.addDays(weekStart, 6);
    const ws = U.iso(weekStart), we = U.iso(weekEnd);
    const recMonth = U.sum(D.collections.filter(c => IND.inMonth(c.date, month)), IND.collTotal);
    const depMonth = U.sum(D.expenses.filter(e => e.paid && IND.inMonth(e.paidDate, month)), 'amount');
    const active = D.members.filter(m => ['Actif', 'Nouveau membre'].includes(m.status)).length;
    const nextServices = D.services.filter(s => s.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
    const nextEps = D.tvEpisodes.filter(e => e.date >= today && !['Diffusée', 'Archivée'].includes(e.status)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const pending = App.pendingApprovals();
    const allowed = id => App.canModule(id);

    const alerts = [];
    const twoDaysAgo = U.iso(U.addDays(new Date(), -2));
    const notDeposited = D.collections.filter(c => c.status === 'Compté' && c.date <= twoDaysAgo);
    if (allowed('dons') && notDeposited.length) alerts.push(['bad', `${notDeposited.length} bordereau(x) de collecte compté(s) depuis plus de 2 jours sans dépôt bancaire — les fonds doivent être déposés rapidement.`, 'dons']);
    if (allowed('depenses') && pending.length) alerts.push(['', `${pending.length} demande(s) de dépense attendent votre autorisation.`, 'depenses']);
    const late = D.decisions.filter(x => x.due && x.due < today && !['Réalisée', 'Annulée'].includes(x.status));
    if (allowed('gouvernance') && late.length) alerts.push(['bad', `${late.length} décision(s) du conseil ont dépassé leur échéance.`, 'gouvernance']);
    const toVisit = D.members.filter(m => m.status === 'À visiter');
    if (allowed('membres') && toVisit.length) alerts.push(['', `${toVisit.length} membre(s) à visiter.`, 'membres']);
    const unvalidated = D.tvEpisodes.filter(e => e.date >= today && e.date <= we && !['Validée', 'Diffusée', 'Archivée'].includes(e.status));
    if (allowed('mercitv') && unvalidated.length) alerts.push(['', `${unvalidated.length} émission(s) MERCI TV prévue(s) cette semaine ne sont pas encore validées.`, 'mercitv']);
    const guestIssues = D.services.filter(s => s.date >= today).map(s => D.preachers.find(p => p.id === s.preacherId)).filter(p => p && p.kind === 'Invité' && !p.validatedBy);
    if (allowed('predication') && guestIssues.length) alerts.push(['bad', `Un prédicateur invité programmé n’est pas validé : ${[...new Set(guestIssues.map(p => p.name))].join(', ')}.`, 'predication']);
    const prevMonth = U.iso(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
    const missing = D.ministries.filter(mi => mi.frequency === 'Mensuel' && !D.ministryReports.some(r => r.ministryId === mi.id && r.month === prevMonth));
    if (allowed('ministeres') && missing.length && new Date().getDate() > 7) alerts.push(['', `${missing.length} ministère(s) n’ont pas remis leur rapport de ${U.monthLabel(prevMonth)}.`, 'ministeres']);
    const cal = VIEWS._calendarPending();
    if (allowed('calendrier') && cal) alerts.push(['', `${cal} action(s) du calendrier de gestion restent à cocher pour la période en cours.`, 'calendrier']);

    const s = D.settings;
    el.innerHTML = `<div class="page">
      ${App.pageHead('', U.dateLong(today), `Bonjour, ${App.user.name.split(' ')[0]}`)}
      <div class="kpis">
        <div class="kpi"><div class="l">Membres actifs</div><div class="v">${U.int(active)}</div><div class="s">${D.members.length} au registre</div></div>
        ${allowed('dons') || allowed('rapports') ? `<div class="kpi"><div class="l">Recettes du mois</div><div class="v">${U.money(recMonth)}</div><div class="s">${U.monthLabel(month)}</div></div>
        <div class="kpi"><div class="l">Dépenses payées</div><div class="v">${U.money(depMonth)}</div><div class="s">${U.monthLabel(month)}</div></div>` : ''}
        <div class="kpi"><div class="l">Dépenses à autoriser</div><div class="v">${pending.length}</div><div class="s">à votre niveau</div></div>
        <div class="kpi"><div class="l">Émissions cette semaine</div><div class="v">${D.tvEpisodes.filter(e => e.date >= ws && e.date <= we).length}</div><div class="s">MERCI TV</div></div>
      </div>
      ${alerts.length ? `<h2 class="sec">Points d’attention</h2><div class="alerts">${alerts.map(([c, t, go]) => `<div class="note ${c}" style="cursor:pointer" data-go2="${go}">${U.esc(t)} <span class="muted">→ ouvrir</span></div>`).join('')}</div>` : `<div class="note ok mt">Tout est en ordre : aucun point d’attention pour le moment.</div>`}
      <div class="cols mt">
        <div class="card"><h3>Prochains cultes</h3>${nextServices.length ? `<ul class="list">${nextServices.map(x => `<li><span class="d">${U.date(x.date)} ${U.esc(x.time || '')}</span><span class="t"><b>${U.esc(x.type)}</b> — ${U.esc(D.preachers.find(p => p.id === x.preacherId)?.name || 'prédicateur à définir')}${x.theme ? ` · <span class="muted">${U.esc(x.theme)}</span>` : ''}</span>${x.live ? '<span class="pill info">Direct</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">Aucun culte programmé. Ajoutez-les dans « Prédicateurs et cultes ».</p>'}</div>
        <div class="card"><h3>Prochaines émissions MERCI TV</h3>${nextEps.length ? `<ul class="list">${nextEps.map(x => `<li><span class="d">${U.date(x.date)}</span><span class="t"><b>${U.esc(x.title)}</b> <span class="muted">${U.esc(D.tvPrograms.find(p => p.id === x.programId)?.name || '')}</span></span><span class="pill">${U.esc(x.status)}</span></li>`).join('')}</ul>` : '<p class="muted">Aucune émission planifiée.</p>'}</div>
      </div>
      <div class="banner mt"><div class="eyebrow">Déclaration d’identité</div><p>${U.esc(s.identity)}</p></div>
    </div>`;
    el.querySelectorAll('[data-go2]').forEach(n => (n.onclick = () => App.go(n.dataset.go2)));
  },

  /* ================= 02 Gouvernance ================= */
  gouvernance(el) {
    el.innerHTML = `<div class="page">${App.pageHead('02', 'Structure', 'Organisation et gouvernance')}</div>`;
    const p = el.firstChild;
    App.tabs('t:gouv', [['meetings', 'Réunions'], ['decisions', 'Décisions et suivi'], ['instances', 'Instances et fonctions']], p, {
      meetings: b => {
        b.innerHTML = `<p class="intro">Le conseil se réunit au minimum une fois par mois. Chaque réunion fait l’objet d’un ordre du jour, d’une feuille de présence, d’un procès-verbal, d’une liste de décisions, des responsables désignés et des échéances. Les conflits d’intérêts doivent être déclarés avant toute décision concernée.</p>`;
        App.list(b, 'meetings');
      },
      decisions: b => App.list(b, 'decisions'),
      instances: b => App.list(b, 'instances')
    });
  },

  /* ================= 03 Membres ================= */
  membres(el) {
    el.innerHTML = `<div class="page">${App.pageHead('03', 'Communauté', 'Gestion des membres')}</div>`;
    const p = el.firstChild;
    App.tabs('t:mem', [['list', 'Registre'], ['integ', 'Parcours d’intégration']], p, {
      list: b => {
        b.innerHTML = `<p class="intro">Le registre des membres est tenu à jour par le secrétariat, avec accès limité aux personnes autorisées. Les informations collectées doivent être pertinentes, sécurisées et utilisées uniquement pour la vie pastorale et administrative de l’Église.</p>`;
        App.list(b, 'members');
      },
      integ: b => {
        const M = App.data.members.filter(m => m.status !== 'Transféré');
        b.innerHTML = `<div class="steps">${SEED.INTEGRATION.map((s, i) => { const n = M.filter(m => (m.integration || []).includes(s)).length; return `<div class="st"><i>${i + 1}</i><div>${U.esc(s)}<small>${n} / ${M.length} membre(s)</small></div></div>`; }).join('')}</div>
          <h2 class="sec">Membres en cours d’intégration</h2>`;
        App.list(b, 'members', { where: m => (m.integration || []).length < 6 && m.status !== 'Transféré' });
      }
    });
  },

  /* ================= 04 Dons ================= */
  dons(el) {
    el.innerHTML = `<div class="page">${App.pageHead('04', 'Finances', 'Dîmes, offrandes et dons')}
      <p class="intro">Les dons sont reçus avec respect, enregistrés avec exactitude et utilisés conformément à leur affectation. Le montant donné par une personne est confidentiel et ne doit pas être communiqué en dehors des personnes habilitées.</p>
      <div class="steps" style="margin-bottom:18px">${[['Réception', 'Enveloppes identifiées ou moyens électroniques approuvés ; catégories séparées'], ['Comptage', 'Au moins deux personnes désignées, sans lien de subordination direct'], ['Bordereau', 'Date, culte, catégories, espèces, chèques, Mobile Money, total et signatures'], ['Dépôt', 'Dépôt rapide sur le compte de l’Église ; aucune conservation personnelle'], ['Enregistrement', 'Saisie des opérations et classement des justificatifs'], ['Rapprochement', 'Comparer registre de dons, dépôts bancaires et comptabilité']].map(([t, d], i) => `<div class="st"><i>${i + 1}</i><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
      <div class="note bad"><b>Interdiction :</b> aucune personne ne doit utiliser les recettes avant leur comptabilisation et leur dépôt. Toute dépense doit suivre la procédure d’autorisation.</div>
      <h2 class="sec">Bordereaux de collecte</h2></div>`;
    App.list(el.firstChild, 'collections');
  },

  /* ================= 05 Budget ================= */
  budget(el) {
    const D = App.data;
    const y = App.ui.budgetYear || String(new Date().getFullYear());
    const years = [...new Set([...Object.keys(D.budgets), String(new Date().getFullYear() - 1), String(new Date().getFullYear()), String(new Date().getFullYear() + 1)])].sort();
    const b = D.budgets[y];
    const head = App.pageHead('05', 'Finances', 'Budget, dépenses et contrôle', `<select class="field-inline" id="by">${years.map(x => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select>
      ${b ? '<button class="btn" id="bcsv">Exporter CSV</button><button class="btn" id="bpdf">PDF</button><button class="btn primary" id="badd">+ Ajouter un poste</button>' : ''}`);
    el.innerHTML = `<div class="page">${head}<p class="intro">Chaque département propose son plan annuel et son budget. Le comité administratif et financier consolide les demandes, estime les revenus, fixe les priorités et soumet le budget au conseil compétent avant le début de l’exercice.</p><div id="bb"></div></div>`;
    el.querySelector('#by').onchange = e => { App.ui.budgetYear = e.target.value; App.refresh(); };
    const box = el.querySelector('#bb');
    if (!b) {
      const prev = D.budgets[String(+y - 1)];
      box.innerHTML = `<div class="card"><div class="empty"><b>Aucun budget pour ${y}</b>Créez le budget à partir des postes du guide${prev ? ' ou en reprenant celui de ' + (+y - 1) : ''}.<div class="row-flex" style="justify-content:center;margin-top:14px">
        <button class="btn primary" id="bnew">Créer le budget ${y}</button>${prev ? `<button class="btn" id="bcopy">Reprendre le budget ${+y - 1}</button>` : ''}</div></div></div>`;
      box.querySelector('#bnew').onclick = async () => { D.budgets[y] = { lines: SEED.budgetLines(), status: 'Brouillon' }; App.log('Création', 'Budget ' + y); await App.persist(); App.refresh(); };
      box.querySelector('#bcopy')?.addEventListener('click', async () => { D.budgets[y] = { lines: prev.lines.map(l => ({ ...l, id: U.uid(), notes: '' })), status: 'Brouillon' }; App.log('Création', 'Budget ' + y + ' (repris)'); await App.persist(); App.refresh(); });
      return;
    }
    const exp = D.expenses.filter(e => !e.rejected);
    const realised = l => l.kind === 'recette'
      ? (l.auto !== false && b.lines.find(x => x.kind === 'recette') === l ? U.sum(D.collections.filter(c => (c.date || '').startsWith(y)), IND.collTotal) : U.num(l.realised))
      : U.sum(exp.filter(e => e.paid && (e.paidDate || '').startsWith(y) && e.budgetLine === l.name), 'amount');
    const committed = l => l.kind === 'recette' ? 0 : U.sum(exp.filter(e => !e.paid && SCHEMAS.expenses.status(e) === 'Autorisée' && (e.date || '').startsWith(y) && e.budgetLine === l.name), 'amount');
    const rows = b.lines.map(l => { const r = realised(l), c = committed(l), gap = l.kind === 'recette' ? r - U.num(l.budget) : U.num(l.budget) - r - c; return { l, r, c, gap, pct: U.num(l.budget) ? Math.round((r / U.num(l.budget)) * 100) : 0 }; });
    const tot = k => ({ budget: U.sum(rows.filter(x => x.l.kind === k), x => x.l.budget), r: U.sum(rows.filter(x => x.l.kind === k), 'r'), c: U.sum(rows.filter(x => x.l.kind === k), 'c') });
    const R = tot('recette'), Dp = tot('depense');
    const editable = App.can(['admin', 'pasteur', 'tresorerie']) && b.status !== 'Adopté';

    box.innerHTML = `<div class="row-flex" style="margin-bottom:12px"><span>Statut du budget :</span>
        <select class="field-inline" id="bst" ${App.can(['admin', 'pasteur']) ? '' : 'disabled'}>${['Brouillon', 'Soumis au conseil', 'Adopté'].map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        ${b.status === 'Adopté' ? `<span class="pill ok">Adopté${b.adoptedOn ? ' le ' + U.date(b.adoptedOn) : ''} — montants verrouillés</span>` : ''}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Recettes prévues</div><div class="v">${U.money(R.budget)}</div><div class="s">Réalisé : ${U.money(R.r)}</div></div>
        <div class="kpi"><div class="l">Dépenses prévues</div><div class="v">${U.money(Dp.budget)}</div><div class="s">Payé : ${U.money(Dp.r)} · Engagé : ${U.money(Dp.c)}</div></div>
        <div class="kpi"><div class="l">Solde prévisionnel</div><div class="v">${U.money(R.budget - Dp.budget)}</div><div class="s">Solde réalisé : ${U.money(R.r - Dp.r)}</div></div>
      </div>
      <div class="table-wrap mt"><table class="grid"><thead><tr><th>Poste</th><th>Type</th><th class="num">Budget annuel</th><th class="num">Réalisé</th><th class="num">Engagé</th><th class="num">Écart</th><th class="num">%</th><th>Observations</th><th></th></tr></thead><tbody>
      ${rows.map(({ l, r, c, gap, pct }) => `<tr data-id="${l.id}">
        <td class="strong">${editable ? `<input class="cell text" data-k="name" value="${U.esc(l.name)}">` : U.esc(l.name)}</td>
        <td>${l.kind === 'recette' ? '<span class="pill ok">Recette</span>' : '<span class="pill">Dépense</span>'}</td>
        <td class="num">${editable ? `<input class="cell" type="number" min="0" data-k="budget" value="${U.num(l.budget) || ''}">` : U.money(l.budget)}</td>
        <td class="num">${l.kind === 'recette' && b.lines.find(x => x.kind === 'recette') !== l && editable ? `<input class="cell" type="number" min="0" data-k="realised" value="${U.num(l.realised) || ''}">` : U.money(r)}</td>
        <td class="num">${l.kind === 'recette' ? '—' : U.money(c)}</td>
        <td class="num"><span class="pill ${gap < 0 ? 'bad' : 'ok'}">${U.money(gap)}</span></td>
        <td class="num">${pct} %</td>
        <td>${App.can(['admin', 'pasteur', 'tresorerie']) ? `<input class="cell text" data-k="notes" value="${U.esc(l.notes || '')}" placeholder="…">` : U.esc(l.notes || '')}</td>
        <td class="act">${editable ? '<button class="btn sm ghost danger" data-del title="Supprimer le poste">✕</button>' : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total dépenses</td><td></td><td class="num">${U.money(Dp.budget)}</td><td class="num">${U.money(Dp.r)}</td><td class="num">${U.money(Dp.c)}</td><td class="num">${U.money(Dp.budget - Dp.r - Dp.c)}</td><td></td><td></td><td></td></tr></tfoot></table></div>
      <p class="muted" style="font-size:12px;margin-top:8px">Le réalisé des recettes provient des bordereaux de collecte ; le réalisé des dépenses provient des demandes de dépense payées, rattachées au poste. « Engagé » = dépenses autorisées non encore payées. Écart des dépenses = budget − réalisé − engagé.</p>`;

    box.querySelector('#bst').onchange = async e => { b.status = e.target.value; if (b.status === 'Adopté') b.adoptedOn = U.today(); App.log('Budget ' + y, 'Statut : ' + b.status); await App.persist(); App.refresh(); };
    box.querySelectorAll('input.cell').forEach(inp => (inp.onchange = async () => {
      const l = b.lines.find(x => x.id === inp.closest('tr').dataset.id);
      const k = inp.dataset.k;
      if (k === 'name') {
        const old = l.name, nu = inp.value.trim();
        if (!nu) return App.refresh();
        D.expenses.filter(e => e.budgetLine === old && (e.date || '').startsWith(y)).forEach(e => (e.budgetLine = nu));
        l.name = nu;
      } else l[k] = k === 'notes' ? inp.value : U.num(inp.value);
      App.log('Budget ' + y, `${l.name} : ${k} modifié`);
      await App.persist();
      App.refresh();
    }));
    box.querySelectorAll('[data-del]').forEach(btn => (btn.onclick = async () => {
      const l = b.lines.find(x => x.id === btn.closest('tr').dataset.id);
      const used = D.expenses.filter(e => e.budgetLine === l.name && (e.date || '').startsWith(y)).length;
      if (used) return App.toast(`Ce poste est utilisé par ${used} dépense(s) : impossible de le supprimer.`, true);
      if (!await App.confirm(`Supprimer le poste « ${U.esc(l.name)} » ?`, 'Supprimer', true)) return;
      b.lines = b.lines.filter(x => x !== l);
      await App.persist();
      App.refresh();
    }));
    el.querySelector('#badd')?.addEventListener('click', () => {
      if (!editable) return App.toast('Le budget adopté est verrouillé. Repassez-le en « Brouillon » pour le modifier.', true);
      const m = App.modal({ title: 'Ajouter un poste budgétaire', size: 'sm', body: `<div class="f"><label>Intitulé</label><input id="pn"></div><div class="f mt"><label>Type</label><select id="pk"><option value="depense">Dépense</option><option value="recette">Recette</option></select></div><div class="f mt"><label>Budget annuel (FCFA)</label><input id="pb" type="number" min="0"></div>`,
        footer: `<button class="btn" data-a="no">Annuler</button><button class="btn primary" data-a="ok">Ajouter</button>` });
      m.el.querySelector('[data-a=no]').onclick = m.close;
      m.el.querySelector('[data-a=ok]').onclick = async () => {
        const name = m.el.querySelector('#pn').value.trim();
        if (!name) return;
        b.lines.push({ id: U.uid(), name, kind: m.el.querySelector('#pk').value, budget: U.num(m.el.querySelector('#pb').value), notes: '', auto: false });
        await App.persist(); m.close(); App.refresh();
      };
    });
    const tableRows = () => rows.map(({ l, r, c, gap }) => [l.name, l.kind === 'recette' ? 'Recette' : 'Dépense', U.num(l.budget), r, c, gap, l.notes || '']);
    el.querySelector('#bcsv')?.addEventListener('click', () => App.exportCSV(`Budget-${y}`, [['Poste', 'Type', 'Budget annuel', 'Réalisé', 'Engagé', 'Écart', 'Observations'], ...tableRows()]));
    el.querySelector('#bpdf')?.addEventListener('click', () => App.exportPDF(PRINT.table(`Budget ${y} (${b.status})`, 'Finances', ['Poste', 'Type', 'Budget annuel', 'Réalisé', 'Engagé', 'Écart', 'Observations'],
      rows.map(({ l, r, c, gap }) => [l.name, l.kind === 'recette' ? 'Recette' : 'Dépense', U.money(l.budget), U.money(r), l.kind === 'recette' ? '—' : U.money(c), U.money(gap), l.notes || '']),
      ['Total dépenses', '', U.money(Dp.budget), U.money(Dp.r), U.money(Dp.c), U.money(Dp.budget - Dp.r - Dp.c), '']), `Budget-${y}`));
  },

  /* ================= 05 Dépenses ================= */
  depenses(el) {
    el.innerHTML = `<div class="page">${App.pageHead('05', 'Finances', 'Dépenses et paiements')}
      <p class="intro">Toute dépense doit être justifiée, autorisée avant paiement et enregistrée. Les signataires bancaires, demandeurs et contrôleurs ne doivent pas être une seule et même personne.</p>
      <div class="note">Circuit d’autorisation : <b>Responsable</b> → <b>Trésorier</b> → <b>Pasteur / Conseil</b>, puis paiement par la trésorerie. Le logiciel empêche un même utilisateur d’autoriser sa propre demande ou de signer deux niveaux.</div></div>`;
    App.list(el.firstChild, 'expenses');
  },

  /* ================= 06 Prédication ================= */
  predication(el) {
    el.innerHTML = `<div class="page">${App.pageHead('06', 'Chaire', 'Prédicateurs et programme des cultes')}</div>`;
    const p = el.firstChild;
    App.tabs('t:pred', [['services', 'Programme des cultes'], ['preachers', 'Fiches prédicateurs'], ['charter', 'Charte de conduite']], p, {
      services: b => {
        b.innerHTML = `<p class="intro">Le ministère de prédication est organisé dans le respect de la doctrine de l’Église, de l’autorité spirituelle et d’un planning validé. Après chaque culte, saisissez la présence et les visiteurs : ces chiffres alimentent automatiquement le tableau de bord mensuel.</p>`;
        App.list(b, 'services');
      },
      preachers: b => {
        b.innerHTML = `<p class="intro">Tout prédicateur invité doit être identifié, recommandé ou validé selon les règles internes.</p>`;
        App.list(b, 'preachers');
      },
      charter: b => { b.innerHTML = `<div class="card guide"><h3>Charte de conduite</h3><p>Les prédicateurs et intervenants s’engagent à :</p><ul><li>respecter la doctrine et la vision de l’Église ;</li><li>préserver l’unité ;</li><li>éviter tout abus spirituel, financier ou moral ;</li><li>respecter la confidentialité ;</li><li>ne pas collecter de fonds sans autorisation explicite de l’Église.</li></ul><p class="muted">L’acceptation de la charte est enregistrée sur chaque fiche prédicateur et figure sur la fiche imprimable.</p></div>`; }
    });
  },

  /* ================= 07 Ministères ================= */
  ministeres(el) {
    el.innerHTML = `<div class="page">${App.pageHead('07', 'Service', 'Ministères et bénévoles')}</div>`;
    const p = el.firstChild;
    App.tabs('t:min', [['ministries', 'Ministères'], ['plans', 'Plans d’action trimestriels'], ['reports', 'Rapports d’activité'], ['volunteers', 'Bénévoles']], p, {
      ministries: b => App.list(b, 'ministries'),
      plans: b => { b.innerHTML = `<p class="intro">Chaque ministère établit un plan d’action trimestriel : objectif, activités, responsables, budget demandé, ressources nécessaires, indicateurs et bilan.</p>`; App.list(b, 'actionPlans'); },
      reports: b => App.list(b, 'ministryReports'),
      volunteers: b => {
        b.innerHTML = `<p class="intro">Les bénévoles sont les membres dont le « Service actuel » est renseigné dans le registre. Les mineurs doivent être encadrés selon des règles de protection spécifiques et leurs données ne doivent pas être diffusées sans autorisation appropriée.</p>`;
        App.list(b, 'members', { where: m => !!m.ministryId, readOnly: true });
      }
    });
  },

  /* ================= 08 MERCI TV ================= */
  mercitv(el) {
    el.innerHTML = `<div class="page">${App.pageHead('08', 'Ministère média', 'MERCI TV : média, web TV et communication')}</div>`;
    const p = el.firstChild;
    App.tabs('t:tv', [['week', 'Grille de la semaine'], ['episodes', 'Émissions et diffusions'], ['programs', 'Programmes'], ['rules', 'Mission et règles']], p, {
      week: b => VIEWS._tvWeek(b),
      episodes: b => App.list(b, 'tvEpisodes'),
      programs: b => {
        const P = App.data.tvPrograms;
        b.innerHTML = `<div class="prog-cards" style="margin-bottom:20px">${P.filter(x => x.active).map(x => `<div class="prog-card" data-id="${x.id}"><b>${U.esc(x.name)}</b><span>${U.esc(x.description)}</span><div class="meta">${x.day ? `<span class="pill">${U.esc(x.day)} ${U.esc(x.time || '')}</span>` : ''}<span class="pill gold">${App.data.tvEpisodes.filter(e => e.programId === x.id).length} émission(s)</span></div></div>`).join('')}</div>`;
        b.querySelectorAll('.prog-card').forEach(c => (c.onclick = () => App.form('tvPrograms', P.find(x => x.id === c.dataset.id))));
        App.list(b, 'tvPrograms');
      },
      rules: b => {
        b.innerHTML = `<div class="banner"><div class="eyebrow">Mission de MERCI TV</div><p>Ministère de communication audiovisuelle de l’Église, MERCI TV soutient l’évangélisation, retransmet les cultes autorisés et diffuse prédications, enseignements bibliques, prières, témoignages et programmes chrétiens — dans le respect de la vérité biblique, de la dignité humaine et de la confidentialité.</p></div>
          <div class="cols"><div class="card guide"><h3>Fonctions du département média</h3><ul>
            <li><b>Coordination éditoriale :</b> thèmes, conducteurs, programmation et validation des contenus.</li>
            <li><b>Production :</b> scripts, captation, interviews, reportages, enregistrement et montage.</li>
            <li><b>Technique :</b> sonorisation, caméras, éclairage, régie, direct, connexion Internet et sauvegardes.</li>
            <li><b>Publication numérique :</b> titres, visuels, descriptions, extraits, modération et archivage.</li></ul></div>
          <div class="card guide"><h3>Règles de diffusion</h3><ul>${SEED.BROADCAST_RULES.map(r => `<li>${U.esc(r)}.</li>`).join('')}</ul>
            <p class="muted">Ces 5 règles forment la liste de contrôle de chaque émission : une émission ne peut passer au statut « Validée » ou « Diffusée » que lorsqu’elles sont toutes cochées et qu’un responsable l’a validée.</p></div></div>`;
      }
    });
  },

  _tvWeek(b) {
    const off = App.ui.tvWeekOffset || 0;
    const start = U.addDays(U.startOfWeek(new Date()), off * 7);
    const days = [...Array(7)].map((_, i) => U.addDays(start, i));
    const D = App.data, today = U.today();
    const wk = U.isoWeek(start);
    b.innerHTML = `<div class="toolbar"><button class="btn sm" data-w="-1">◀ Semaine précédente</button><button class="btn sm" data-w="0">Cette semaine</button><button class="btn sm" data-w="1">Semaine suivante ▶</button>
      <b style="margin-left:8px">Semaine ${wk.week} — du ${U.date(U.iso(days[0]))} au ${U.date(U.iso(days[6]))}</b>
      <span class="count"></span><button class="btn primary" data-new>+ Planifier une émission</button></div>
      <div class="week">${days.map(d => { const k = U.iso(d); const eps = D.tvEpisodes.filter(e => e.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || '')); const svc = D.services.filter(s => s.date === k && s.live);
        return `<div class="day ${k === today ? 'today' : ''}"><h4>${d.toLocaleDateString('fr-FR', { weekday: 'long' })} <span>${d.getDate()}/${d.getMonth() + 1}</span></h4>
          ${svc.map(s => `<div class="ev cult" data-svc="${s.id}"><b>${U.esc(s.time || '')} ${U.esc(s.type)}</b>Direct du culte</div>`).join('')}
          ${eps.map(e => `<div class="ev" data-ep="${e.id}"><b>${U.esc(e.time || '')} ${U.esc(e.title)}</b>${U.esc(D.tvPrograms.find(p => p.id === e.programId)?.name || '')}<br><span class="pill" style="margin-top:4px">${U.esc(e.status)}</span></div>`).join('')}</div>`; }).join('')}</div>`;
    b.querySelectorAll('[data-w]').forEach(x => (x.onclick = () => { App.ui.tvWeekOffset = +x.dataset.w === 0 ? 0 : off + +x.dataset.w; App.refresh(); }));
    b.querySelectorAll('[data-ep]').forEach(x => (x.onclick = () => App.form('tvEpisodes', D.tvEpisodes.find(e => e.id === x.dataset.ep))));
    b.querySelectorAll('[data-svc]').forEach(x => (x.onclick = () => App.canModule('predication') ? App.form('services', D.services.find(e => e.id === x.dataset.svc)) : null));
    b.querySelector('[data-new]').onclick = () => App.form('tvEpisodes', null, { date: off ? U.iso(start) : today });
  },

  /* ================= 09 Archives ================= */
  archives(el) {
    el.innerHTML = `<div class="page">${App.pageHead('09', 'Redevabilité', 'Archives')}
      <p class="intro">La communication officielle est coordonnée par une personne désignée. Les annonces, affiches, publications sur les réseaux sociaux, photos et vidéos doivent respecter l’image de l’Église, la dignité des personnes et les règles de consentement applicables.</p>
      <div class="table-wrap" style="margin-bottom:20px"><table class="grid"><thead><tr><th>Document</th><th>Responsable</th><th>Classement / conservation</th><th class="num">Au registre</th></tr></thead><tbody>
      ${SEED.ARCHIVE_RULES.map(([d, r, c]) => `<tr><td class="strong">${U.esc(d)}</td><td>${U.esc(r)}</td><td>${U.esc(c)}</td><td class="num">${App.data.archives.filter(a => a.category === d).length}</td></tr>`).join('')}</tbody></table></div>
      <h2 class="sec">Registre des archives</h2></div>`;
    App.list(el.firstChild, 'archives');
  },

  /* ================= 09 Rapports ================= */
  rapports(el) {
    el.innerHTML = `<div class="page">${App.pageHead('09', 'Redevabilité', 'Rapports, tableau de bord et audit')}</div>`;
    const p = el.firstChild;
    const tabs = [['board', 'Tableau de bord mensuel'], ['fin', 'Rapport financier mensuel']];
    if (App.can(['admin', 'pasteur'])) tabs.push(['log', 'Journal des opérations']);
    App.tabs('t:rep', tabs, p, {
      board: b => VIEWS._board(b),
      fin: b => VIEWS._finance(b),
      log: b => VIEWS._log(b)
    });
  },

  _monthPicker(b) {
    const m = App.ui.repMonth || U.today().slice(0, 7);
    const bar = U.h(`<div class="toolbar"><label>Mois : <input type="month" class="field-inline" value="${m}" id="rm"></label><span class="count"></span><button class="btn sm" data-csv>Exporter CSV</button><button class="btn sm" data-pdf>PDF</button><button class="btn sm" data-print>Imprimer</button></div>`);
    b.append(bar);
    bar.querySelector('#rm').onchange = e => { App.ui.repMonth = e.target.value || U.today().slice(0, 7); App.refresh(); };
    return { m, bar };
  },

  _board(b) {
    const { m, bar } = VIEWS._monthPicker(b);
    const from = m.slice(0, 4) + '-01';
    const man = App.data.indicators[m] || (App.data.indicators[m] = {});
    const fmt = (d, v) => d.money ? U.money(v) : (typeof v === 'number' ? U.int(v) : v);
    const rows = IND.DEFS.map(d => ({ d, month: d.manual ? U.num(man[d.k]) : d.fn(m, m), ytd: d.manual ? null : d.fn(from, m), comment: man['c_' + d.k] || '' }));
    const box = document.createElement('div');
    box.innerHTML = `<p class="intro">Les indicateurs sont calculés automatiquement à partir des cultes, bordereaux, dépenses, rapports de ministères et émissions MERCI TV. Seuls le solde bancaire et les commentaires se saisissent ici.</p>
      <div class="table-wrap"><table class="grid"><thead><tr><th>Indicateur</th><th class="num">${U.esc(U.monthLabel(m))}</th><th class="num">Cumul annuel</th><th>Commentaire</th></tr></thead><tbody>
      ${rows.map(({ d, month, ytd, comment }) => `<tr><td class="strong">${U.esc(d.label)}</td>
        <td class="num">${d.manual ? `<input class="cell" type="number" data-man="${d.k}" value="${man[d.k] ?? ''}" placeholder="à saisir">` : fmt(d, month)}</td>
        <td class="num">${ytd === null ? '—' : fmt(d, ytd)}</td>
        <td><input class="cell text" data-com="${d.k}" value="${U.esc(comment)}" placeholder="…"></td></tr>`).join('')}</tbody></table></div>`;
    b.append(box);
    box.querySelectorAll('[data-man]').forEach(i => (i.onchange = async () => { man[i.dataset.man] = i.value === '' ? '' : U.num(i.value); await App.persist(); App.refresh(); }));
    box.querySelectorAll('[data-com]').forEach(i => (i.onchange = async () => { man['c_' + i.dataset.com] = i.value; await App.persist(); }));
    const table = () => rows.map(({ d, month, ytd }) => [d.label, fmt(d, month), ytd === null ? '—' : fmt(d, ytd), man['c_' + d.k] || '']);
    const html = () => PRINT.table(`Tableau de bord — ${U.monthLabel(m)}`, 'Redevabilité', ['Indicateur', 'Mois', 'Cumul annuel', 'Commentaire'], table());
    bar.querySelector('[data-csv]').onclick = () => App.exportCSV(`Tableau-de-bord-${m}`, [['Indicateur', 'Mois', 'Cumul annuel', 'Commentaire'], ...rows.map(({ d, month, ytd }) => [d.label, month, ytd ?? '', man['c_' + d.k] || ''])]);
    bar.querySelector('[data-pdf]').onclick = () => App.exportPDF(html(), `Tableau-de-bord-${m}`);
    bar.querySelector('[data-print]').onclick = () => App.print(html());
  },

  _finance(b) {
    const { m, bar } = VIEWS._monthPicker(b);
    const F = IND.finance(m);
    const man = App.data.indicators[m] || (App.data.indicators[m] = {});
    const box = document.createElement('div');
    const tbl = (title, rows, totalM, totalY, withBudget) => `<h2 class="sec">${title}</h2><div class="table-wrap"><table class="grid"><thead><tr><th>Rubrique</th><th class="num">Mois</th><th class="num">Cumul annuel</th>${withBudget ? '<th class="num">Budget annuel</th><th class="num">Écart budgétaire</th>' : ''}</tr></thead><tbody>
      ${rows.map(r => `<tr><td class="strong">${U.esc(r.label)}</td><td class="num">${U.money(r.month)}</td><td class="num">${U.money(r.ytd)}</td>${withBudget ? `<td class="num">${U.money(r.budget)}</td><td class="num"><span class="pill ${r.budget - r.ytd < 0 ? 'bad' : 'ok'}">${U.money(r.budget - r.ytd)}</span></td>` : ''}</tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td class="num">${U.money(totalM)}</td><td class="num">${U.money(totalY)}</td>${withBudget ? `<td class="num">${U.money(U.sum(rows, 'budget'))}</td><td></td>` : ''}</tr></tfoot></table></div>`;
    box.innerHTML = `<p class="intro">Le trésorier prépare un rapport mensuel comprenant les recettes, les dépenses, le solde de caisse, le solde bancaire, les engagements et les écarts budgétaires. Un contrôle ou audit annuel indépendant est recommandé.</p>
      <div class="kpis"><div class="kpi"><div class="l">Recettes du mois</div><div class="v">${U.money(F.totalRecMonth)}</div></div><div class="kpi"><div class="l">Dépenses du mois</div><div class="v">${U.money(F.totalDepMonth)}</div></div><div class="kpi"><div class="l">Résultat du mois</div><div class="v">${U.money(F.totalRecMonth - F.totalDepMonth)}</div></div><div class="kpi"><div class="l">Engagements</div><div class="v">${U.money(F.commitments)}</div><div class="s">Dépenses autorisées non payées</div></div></div>
      ${tbl('Recettes', F.rec, F.totalRecMonth, F.totalRecYtd, false)}
      ${tbl('Dépenses par poste', F.dep, F.totalDepMonth, F.totalDepYtd, true)}
      <h2 class="sec">Soldes de fin de mois</h2>
      <div class="fgrid three"><div class="f"><label>Solde de caisse (FCFA)</label><input type="number" data-man="cash" value="${man.cash ?? ''}"></div><div class="f"><label>Solde bancaire (FCFA)</label><input type="number" data-man="bank" value="${man.bank ?? ''}"></div><div class="f"><label>Préparé par</label><input data-man="preparedBy" value="${U.esc(man.preparedBy ?? App.user.name)}"></div></div>
      <div class="f mt"><label>Commentaires du trésorier</label><textarea data-man="finComment">${U.esc(man.finComment || '')}</textarea></div>`;
    b.append(box);
    box.querySelectorAll('[data-man]').forEach(i => (i.onchange = async () => { const k = i.dataset.man; man[k] = i.type === 'number' ? (i.value === '' ? '' : U.num(i.value)) : i.value; await App.persist(); }));
    const html = () => PRINT.raw('Redevabilité', `Rapport financier — ${U.monthLabel(m)}`, `
      <h2>Recettes</h2><table><thead><tr><th>Rubrique</th><th class="r">Mois</th><th class="r">Cumul annuel</th></tr></thead><tbody>${F.rec.map(r => `<tr><td>${U.esc(r.label)}</td><td class="r">${U.money(r.month)}</td><td class="r">${U.money(r.ytd)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="r">${U.money(F.totalRecMonth)}</td><td class="r">${U.money(F.totalRecYtd)}</td></tr></tfoot></table>
      <h2>Dépenses par poste</h2><table><thead><tr><th>Poste</th><th class="r">Mois</th><th class="r">Cumul</th><th class="r">Budget</th><th class="r">Écart</th></tr></thead><tbody>${F.dep.map(r => `<tr><td>${U.esc(r.label)}</td><td class="r">${U.money(r.month)}</td><td class="r">${U.money(r.ytd)}</td><td class="r">${U.money(r.budget)}</td><td class="r">${U.money(r.budget - r.ytd)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="r">${U.money(F.totalDepMonth)}</td><td class="r">${U.money(F.totalDepYtd)}</td><td></td><td></td></tr></tfoot></table>
      <h2>Synthèse</h2><table><tbody><tr><td class="l">Résultat du mois</td><td>${U.money(F.totalRecMonth - F.totalDepMonth)}</td></tr><tr><td class="l">Solde de caisse</td><td>${man.cash !== undefined && man.cash !== '' ? U.money(man.cash) : ''}</td></tr><tr><td class="l">Solde bancaire</td><td>${man.bank !== undefined && man.bank !== '' ? U.money(man.bank) : ''}</td></tr><tr><td class="l">Engagements (dépenses autorisées non payées)</td><td>${U.money(F.commitments)}</td></tr><tr><td class="l">Commentaires</td><td class="pre">${U.esc(man.finComment || '')}</td></tr></tbody></table>
      <div class="sig"><div>Le trésorier<br>${U.esc(man.preparedBy || '')}</div><div>Le président du conseil</div><div>Le responsable principal</div></div>`, '09');
    bar.querySelector('[data-csv]').onclick = () => App.exportCSV(`Rapport-financier-${m}`, [['Type', 'Rubrique', 'Mois', 'Cumul annuel', 'Budget annuel'], ...F.rec.map(r => ['Recette', r.label, r.month, r.ytd, '']), ...F.dep.map(r => ['Dépense', r.label, r.month, r.ytd, r.budget])]);
    bar.querySelector('[data-pdf]').onclick = () => App.exportPDF(html(), `Rapport-financier-${m}`);
    bar.querySelector('[data-print]').onclick = () => App.print(html());
  },

  _log(b) {
    const L = App.data.log;
    b.innerHTML = `<p class="intro">Toutes les opérations (créations, modifications, autorisations, paiements, suppressions, connexions) sont tracées pour faciliter le contrôle et l’audit annuel.</p>
      <div class="toolbar"><span class="count">${L.length} opération(s) (2 000 dernières conservées)</span><button class="btn sm" data-csv>Exporter CSV</button></div>
      <div class="table-wrap"><table class="grid"><thead><tr><th>Date et heure</th><th>Utilisateur</th><th>Action</th><th>Objet</th></tr></thead><tbody>
      ${L.slice(0, 500).map(x => `<tr><td>${new Date(x.at).toLocaleString('fr-FR')}</td><td>${U.esc(x.user)}</td><td class="strong">${U.esc(x.action)}</td><td>${U.esc(x.what)}</td></tr>`).join('')}</tbody></table></div>`;
    b.querySelector('[data-csv]').onclick = () => App.exportCSV('Journal-des-operations', [['Date', 'Utilisateur', 'Action', 'Objet'], ...L.map(x => [x.at, x.user, x.action, x.what])]);
  },

  /* ================= 10 Calendrier ================= */
  _periods(offsets = {}) {
    const now = new Date();
    const o = k => offsets[k] || 0;
    const w = U.isoWeek(U.addDays(now, 7 * o('semaine')));
    const md = new Date(now.getFullYear(), now.getMonth() + o('mois'), 1);
    const qi = Math.floor(now.getMonth() / 3) + o('trimestre'); const qd = new Date(now.getFullYear(), qi * 3, 1);
    const si = Math.floor(now.getMonth() / 6) + o('semestre'); const sd = new Date(now.getFullYear(), si * 6, 1);
    const yd = now.getFullYear() + o('annee');
    return {
      semaine: { key: `${w.year}-S${U.pad(w.week)}`, label: `Semaine ${w.week} — ${w.year}` },
      mois: { key: U.iso(md).slice(0, 7), label: U.monthLabel(U.iso(md).slice(0, 7)) },
      trimestre: { key: `${qd.getFullYear()}-T${Math.floor(qd.getMonth() / 3) + 1}`, label: `${Math.floor(qd.getMonth() / 3) + 1}${Math.floor(qd.getMonth() / 3) ? 'e' : 'er'} trimestre ${qd.getFullYear()}` },
      semestre: { key: `${sd.getFullYear()}-H${sd.getMonth() ? 2 : 1}`, label: `${sd.getMonth() ? '2nd' : '1er'} semestre ${sd.getFullYear()}` },
      annee: { key: String(yd), label: `Année ${yd}` }
    };
  },

  _calendarPending() {
    const P = VIEWS._periods();
    let n = 0;
    for (const k of ['semaine', 'mois']) for (const t of SEED.CALENDAR[k].tasks) if (!App.data.calendarChecks[`${P[k].key}|${t}`]) n++;
    return n;
  },

  calendrier(el) {
    const offsets = App.ui.calOff || (App.ui.calOff = {});
    const P = VIEWS._periods(offsets);
    const C = App.data.calendarChecks;
    el.innerHTML = `<div class="page">${App.pageHead('10', 'Rythme', 'Calendrier annuel de gestion')}
      <p class="intro">Cochez les actions clés au fur et à mesure. Chaque case est horodatée avec le nom de la personne qui l’a cochée. Utilisez les flèches pour consulter les périodes précédentes.</p>
      <div class="period-grid">${Object.entries(SEED.CALENDAR).map(([k, def]) => {
        const done = def.tasks.filter(t => C[`${P[k].key}|${t}`]).length;
        return `<div class="card"><h3>${U.esc(def.label)}<small>${done}/${def.tasks.length}</small></h3>
          <div class="row-flex" style="justify-content:space-between"><button class="btn sm ghost" data-off="${k}" data-d="-1">◀</button><b style="font-size:13px">${U.esc(P[k].label)}</b><button class="btn sm ghost" data-off="${k}" data-d="1">▶</button></div>
          <div class="progress"><i style="width:${Math.round(done / def.tasks.length * 100)}%"></i></div>
          <div class="checks col">${def.tasks.map(t => { const v = C[`${P[k].key}|${t}`]; return `<label title="${v ? U.esc(`${v.by} — ${new Date(v.at).toLocaleString('fr-FR')}`) : ''}"><input type="checkbox" data-c="${U.esc(`${P[k].key}|${t}`)}" ${v ? 'checked' : ''}> <span>${U.esc(t)}${v ? `<br><small class="muted">${U.esc(v.by)}, ${new Date(v.at).toLocaleDateString('fr-FR')}</small>` : ''}</span></label>`; }).join('')}</div></div>`;
      }).join('')}</div></div>`;
    el.querySelectorAll('[data-off]').forEach(btn => (btn.onclick = () => { offsets[btn.dataset.off] = (offsets[btn.dataset.off] || 0) + +btn.dataset.d; App.refresh(); }));
    el.querySelectorAll('[data-c]').forEach(c => (c.onchange = async () => {
      if (c.checked) C[c.dataset.c] = { by: App.user.name, at: U.now() }; else delete C[c.dataset.c];
      App.log('Calendrier', `${c.checked ? 'Coché' : 'Décoché'} : ${c.dataset.c.replace('|', ' — ')}`);
      await App.persist();
      App.refresh();
    }));
  },

  /* ================= 01 Guide ================= */
  guide(el) {
    const s = App.data.settings;
    el.innerHTML = `<div class="page guide">${App.pageHead('01', 'Fondements', 'Objet du manuel')}
      <p class="intro">Ce manuel définit les procédures de gouvernance, d’administration, de gestion financière, de coordination des ministères et de communication audiovisuelle de l’Église. Il vise la fidélité dans le service, la transparence, la protection des personnes et la bonne utilisation des ressources confiées à l’œuvre de Dieu.</p>
      <div class="table-wrap"><table class="grid"><thead><tr><th style="width:200px">Élément</th><th>Déclaration</th></tr></thead><tbody>
        <tr><td class="strong">Vision</td><td>${U.esc(s.vision)}</td></tr><tr><td class="strong">Mission</td><td>${U.esc(s.mission)}</td></tr>
        <tr><td class="strong">Valeurs</td><td>${U.esc(s.values)}</td></tr><tr><td class="strong">Objectifs annuels</td><td>${U.esc(s.objectives)}</td></tr></tbody></table></div>
      <div class="banner mt"><div class="eyebrow">Déclaration d’identité</div><p>${U.esc(s.identity)}</p></div>
      <h2 class="sec">Principes directeurs</h2>
      <p>Toute décision doit respecter les statuts, les lois applicables, les principes bibliques et les décisions régulièrement adoptées par les instances habilitées. Les données personnelles, les informations financières individuelles, les dossiers pastoraux et les contenus sensibles sont strictement confidentiels.</p>
      <h2 class="sec">Où retrouver chaque chapitre dans le logiciel</h2>
      <div class="table-wrap"><table class="grid"><tbody>
        ${[['02', 'Organisation et gouvernance', 'Instances, réunions, procès-verbaux, décisions et échéances', 'gouvernance'], ['03', 'Gestion des membres', 'Registre, suivi, parcours d’intégration en 6 étapes', 'membres'], ['04', 'Dîmes, offrandes et dons', 'Bordereaux de collecte, double comptage, dépôt, rapprochement', 'dons'], ['05', 'Budget, dépenses et contrôle', 'Budget annuel, demandes de dépense et triple autorisation', 'budget'], ['06', 'Prédicateurs et programme des cultes', 'Fiches prédicateurs, charte, planning des cultes', 'predication'], ['07', 'Ministères et bénévoles', 'Ministères, plans d’action trimestriels, rapports', 'ministeres'], ['08', 'MERCI TV', 'Programmes, grille, émissions, contrôle de conformité', 'mercitv'], ['09', 'Archives, rapports et audit', 'Registre des archives, rapport financier, tableau de bord, journal', 'rapports'], ['10', 'Calendrier annuel de gestion', 'Actions hebdomadaires à annuelles, validation du manuel', 'calendrier']]
          .map(([n, t, d, go]) => `<tr class="${App.canModule(go) ? 'clickable' : ''}" data-go3="${go}"><td style="width:50px;font-family:var(--serif);color:var(--gold);font-size:18px">${n}</td><td class="strong">${t}</td><td>${d}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted mt">Document interne et confidentiel. À adapter aux statuts de l’Église, à la réglementation ivoirienne applicable et aux orientations de son autorité spirituelle.</p>
      <div class="banner mt" style="text-align:center"><p>« À Celui qui vient bientôt soient l’honneur, la puissance et la majesté aux siècles des siècles. Amen. »</p><div class="eyebrow" style="margin:8px 0 0">Maranatha</div></div>
    </div>`;
    el.querySelectorAll('[data-go3]').forEach(r => (r.onclick = () => App.canModule(r.dataset.go3) && App.go(r.dataset.go3)));
  },

  /* ================= Paramètres ================= */
  parametres(el) {
    el.innerHTML = `<div class="page">${App.pageHead('', 'Configuration', 'Paramètres')}</div>`;
    const p = el.firstChild;
    const tabs = [['church', 'Église'], ['vision', 'Vision et mission'], ['validation', 'Validation du manuel']];
    if (App.can(['admin'])) tabs.push(['users', 'Utilisateurs']);
    tabs.push(['backup', 'Sauvegardes']);
    App.tabs('t:set', tabs, p, {
      church: b => VIEWS._settingsForm(b, [['churchName', 'Nom de l’Église'], ['leader', 'Responsable principal'], ['denomination', 'Dénomination / réseau'], ['address', 'Adresse'], ['city', 'Ville / pays'], ['phone', 'Téléphone'], ['email', 'E-mail'], ['periodFrom', 'Période d’application — du', 'date'], ['periodTo', 'au', 'date']]),
      vision: b => VIEWS._settingsForm(b, [['vision', 'Vision', 'textarea'], ['mission', 'Mission', 'textarea'], ['values', 'Valeurs', 'textarea'], ['objectives', 'Objectifs annuels', 'textarea'], ['identity', 'Déclaration d’identité', 'textarea']]),
      validation: b => VIEWS._validation(b),
      users: b => VIEWS._users(b),
      backup: b => VIEWS._backup(b)
    });
  },

  _settingsForm(b, fields) {
    const s = App.data.settings;
    b.innerHTML = `<div class="card"><div class="fgrid">${fields.map(([k, l, t]) => `<div class="f ${t === 'textarea' ? 'full' : ''}"><label>${U.esc(l)}</label>${t === 'textarea' ? `<textarea data-k="${k}" rows="3">${U.esc(s[k] || '')}</textarea>` : `<input type="${t || 'text'}" data-k="${k}" value="${U.esc(s[k] || '')}">`}</div>`).join('')}</div>
      <div class="right mt"><button class="btn primary" id="ss">Enregistrer</button></div></div>`;
    b.querySelector('#ss').onclick = async () => {
      b.querySelectorAll('[data-k]').forEach(i => (s[i.dataset.k] = i.value.trim()));
      App.log('Modification', 'Paramètres de l’Église');
      await App.persist();
      App.toast('Paramètres enregistrés.');
      App.renderNav();
    };
  },

  _validation(b) {
    const V = App.data.settings.validation;
    b.innerHTML = `<p class="intro">Validation officielle du manuel de gestion par les responsables de l’Église.</p>
      <div class="table-wrap"><table class="grid"><thead><tr><th>Fonction</th><th>Nom</th><th>Date</th><th>Signé</th></tr></thead><tbody>
      ${V.map((v, i) => `<tr><td class="strong">${U.esc(v.role)}</td><td><input class="cell text" data-i="${i}" data-k="name" value="${U.esc(v.name)}"></td><td><input class="cell text" type="date" data-i="${i}" data-k="date" value="${U.esc(v.date)}"></td><td><input type="checkbox" data-i="${i}" data-k="signed" ${v.signed ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div>
      <div class="right mt"><button class="btn" id="vp">Imprimer la page de validation</button></div>`;
    b.querySelectorAll('[data-i]').forEach(i => (i.onchange = async () => { V[+i.dataset.i][i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; App.log('Validation du manuel', V[+i.dataset.i].role); await App.persist(); }));
    b.querySelector('#vp').onclick = () => App.printMenu(PRINT.raw('Rythme', 'Validation du manuel', `<table><thead><tr><th>Fonction</th><th>Nom</th><th>Signature</th><th>Date</th></tr></thead><tbody>${V.map(v => `<tr style="height:60px"><td><b>${U.esc(v.role)}</b></td><td>${U.esc(v.name)}</td><td></td><td>${U.date(v.date)}</td></tr>`).join('')}</tbody></table>
      <p style="text-align:center;font-family:Georgia,serif;font-style:italic;margin-top:30px">« À Celui qui vient bientôt soient l’honneur, la puissance et la majesté aux siècles des siècles. Amen. »<br><b style="color:#c9a24a;font-style:normal;letter-spacing:.2em;font-size:10px">MARANATHA</b></p>`, '10'), 'Validation-du-manuel');
  },

  _users(b) {
    const U2 = App.data.users;
    b.innerHTML = `<p class="intro">Chaque personne dispose de son propre compte. Le rôle détermine les modules accessibles (principe d’accès limité aux personnes autorisées).</p>
      <div class="toolbar"><span class="count">${U2.length} compte(s)</span><button class="btn primary" id="un">+ Ajouter un utilisateur</button></div>
      <div class="table-wrap"><table class="grid"><thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Dernière connexion</th><th>État</th><th></th></tr></thead><tbody>
      ${U2.map(u => `<tr data-id="${u.id}"><td class="strong">${U.esc(u.name)}</td><td>${U.esc(u.login)}</td><td>${U.esc(SEED.ROLES[u.role]?.label || u.role)}</td><td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString('fr-FR') : '—'}</td><td>${u.active === false ? '<span class="pill bad">Désactivé</span>' : '<span class="pill ok">Actif</span>'}</td>
        <td class="act"><button class="btn sm" data-ed>Modifier</button> <button class="btn sm" data-rs>Réinitialiser le mot de passe</button></td></tr>`).join('')}</tbody></table></div>
      <h2 class="sec">Rôles et accès</h2><div class="table-wrap"><table class="grid"><thead><tr><th>Rôle</th><th>Modules accessibles</th></tr></thead><tbody>
      ${Object.values(SEED.ROLES).map(r => `<tr><td class="strong">${U.esc(r.label)}</td><td>${r.modules === '*' ? 'Tous les modules' : r.modules.map(m => U.esc(NAV.flatMap(g => g.items).find(i => i.id === m)?.label || m)).join(', ')}</td></tr>`).join('')}</tbody></table></div>`;
    const edit = u => {
      const isNew = !u;
      const m = App.modal({ title: isNew ? 'Ajouter un utilisateur' : 'Modifier l’utilisateur', size: 'sm', body: `<div class="form-error" id="ue"></div>
        <div class="f"><label>Nom complet</label><input id="u1" value="${U.esc(u?.name || '')}"></div>
        <div class="f mt"><label>Identifiant de connexion</label><input id="u2" value="${U.esc(u?.login || '')}"></div>
        <div class="f mt"><label>Rôle</label><select id="u3">${Object.entries(SEED.ROLES).map(([k, r]) => `<option value="${k}" ${u?.role === k ? 'selected' : ''}>${U.esc(r.label)}</option>`).join('')}</select></div>
        ${isNew ? '<div class="f mt"><label>Mot de passe provisoire (8 caractères min.)</label><input id="u4" type="password"></div>' : `<div class="checks mt"><label><input type="checkbox" id="u5" ${u.active !== false ? 'checked' : ''}> Compte actif</label></div>`}`,
        footer: `<button class="btn" data-a="no">Annuler</button><button class="btn primary" data-a="ok">Enregistrer</button>` });
      const $ = s => m.el.querySelector(s);
      $('[data-a=no]').onclick = m.close;
      $('[data-a=ok]').onclick = async () => {
        const err = t => { $('#ue').textContent = t; $('#ue').classList.add('show'); };
        const name = $('#u1').value.trim(), login = $('#u2').value.trim().toLowerCase(), role = $('#u3').value;
        if (!name || !login) return err('Nom et identifiant obligatoires.');
        if (U2.some(x => x.login === login && x.id !== u?.id)) return err('Cet identifiant est déjà utilisé.');
        const admins = U2.filter(x => x.role === 'admin' && x.active !== false && x.id !== u?.id);
        if (!isNew && u.role === 'admin' && (role !== 'admin' || !$('#u5').checked) && !admins.length) return err('Il doit rester au moins un administrateur actif.');
        if (isNew) {
          const pw = $('#u4').value;
          if (pw.length < 8) return err('Le mot de passe doit contenir au moins 8 caractères.');
          U2.push({ id: U.uid(), name, login, role, active: true, ...(await api.hashPassword(pw)), createdAt: U.now() });
        } else Object.assign(u, { name, login, role, active: $('#u5').checked });
        App.log(isNew ? 'Création' : 'Modification', `Utilisateur ${name} (${SEED.ROLES[role].label})`);
        await App.persist();
        m.close();
        App.refresh();
      };
    };
    b.querySelector('#un').onclick = () => edit(null);
    b.querySelectorAll('[data-ed]').forEach(x => (x.onclick = () => edit(U2.find(u => u.id === x.closest('tr').dataset.id))));
    b.querySelectorAll('[data-rs]').forEach(x => (x.onclick = async () => {
      const u = U2.find(y => y.id === x.closest('tr').dataset.id);
      const pw = await App.prompt('Réinitialiser le mot de passe', `Nouveau mot de passe provisoire pour ${u.name} (8 caractères min.)`, { required: true });
      if (pw === null) return;
      if (pw.length < 8) return App.toast('Le mot de passe doit contenir au moins 8 caractères.', true);
      Object.assign(u, await api.hashPassword(pw));
      App.log('Réinitialisation', 'Mot de passe de ' + u.name);
      await App.persist();
      App.toast('Mot de passe réinitialisé.');
    }));
  },

  _backup(b) {
    b.innerHTML = `<div class="cols"><div class="card"><h3>Sauvegarde</h3>
        <p>Les données sont enregistrées automatiquement sur cet ordinateur, avec une copie de sécurité horaire (15 dernières conservées).</p>
        <p class="muted" style="font-size:12px">Dossier : <code>${U.esc(App.info.dataPath)}</code></p>
        <div class="row-flex"><button class="btn primary" id="be">Exporter une sauvegarde…</button><button class="btn" id="bo">Ouvrir le dossier des données</button></div>
        <div class="note mt">Conseil : exportez une sauvegarde chaque semaine sur une clé USB ou un disque externe conservé en lieu sûr, conformément au calendrier de gestion.</div></div>
      <div class="card"><h3>Restauration</h3><p>Remplace toutes les données actuelles par celles d’un fichier de sauvegarde.</p>
        ${App.can(['admin']) ? '<button class="btn danger" id="bi">Restaurer une sauvegarde…</button>' : '<p class="muted">Réservé à l’administrateur.</p>'}
        <h3 class="mt">À propos</h3><p class="muted">MERCI TV Gestion — version ${U.esc(App.info.version)}<br>Ministère de communication audiovisuelle · Abidjan, Côte d’Ivoire</p></div></div>`;
    b.querySelector('#be').onclick = async () => { const p = await api.exportBackup(App.data); if (p) { App.log('Sauvegarde', p); App.persist(); App.toast('Sauvegarde exportée.'); } };
    b.querySelector('#bo').onclick = () => api.openDataFolder();
    b.querySelector('#bi')?.addEventListener('click', async () => {
      if (!await App.confirm('Toutes les données actuelles seront remplacées par la sauvegarde choisie. Continuer ?', 'Choisir le fichier…', true)) return;
      try {
        const data = await api.importBackup();
        if (!data) return;
        App.data = App.migrate(data);
        App.log('Restauration', 'Données restaurées depuis une sauvegarde');
        await App.persist();
        App.logout('Sauvegarde restaurée. Reconnectez-vous.');
      } catch (e) { App.toast(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true); }
    });
  }
};
