'use strict';
/* Définition déclarative des registres (champs, colonnes, règles de contrôle). */
const SCHEMAS = (() => {
  const S = {};
  const pill = (txt, cls) => `<span class="pill ${cls || ''}">${U.esc(txt)}</span>`;
  const byId = (coll, id) => (App.data[coll] || []).find(x => x.id === id);
  const refName = (coll, id, k = 'name') => { const r = byId(coll, id); return r ? r[k] : ''; };

  const SERVICE_TYPES = ['Culte du dimanche', 'Culte de semaine', 'Veillée de prière', 'Culte spécial', 'Conférence / campagne', 'Autre'];
  const PLATFORMS = ['Web TV MERCI TV', 'YouTube', 'Facebook', 'TikTok', 'Instagram', 'Audio / podcast', 'Radio'];

  /* ---------------- 02 Gouvernance ---------------- */
  S.instances = {
    coll: 'instances', title: 'Instances et fonctions', singular: 'une instance',
    sort: { k: 'order', dir: 1 },
    fields: [
      { k: 'name', label: 'Instance / fonction', type: 'text', req: true },
      { k: 'holders', label: 'Titulaire(s)', type: 'text', help: 'Noms des personnes qui exercent cette fonction' },
      { k: 'responsibilities', label: 'Responsabilités essentielles', type: 'textarea', full: true },
      { k: 'order', label: 'Ordre d’affichage', type: 'number' }
    ],
    columns: [
      { k: 'name', label: 'Instance / fonction', cls: 'strong' },
      { k: 'holders', label: 'Titulaire(s)' },
      { k: 'responsibilities', label: 'Responsabilités essentielles' }
    ],
    search: ['name', 'holders', 'responsibilities']
  };

  S.meetings = {
    coll: 'meetings', title: 'Réunions', singular: 'une réunion',
    sort: { k: 'date', dir: -1 },
    fields: [
      { sec: 'Réunion' },
      { k: 'date', label: 'Date', type: 'date', req: true, def: () => U.today() },
      { k: 'time', label: 'Heure', type: 'time' },
      { k: 'instanceId', label: 'Instance', type: 'ref', ref: 'instances', req: true },
      { k: 'kind', label: 'Type', type: 'select', options: ['Ordinaire', 'Extraordinaire'], def: 'Ordinaire' },
      { k: 'place', label: 'Lieu', type: 'text' },
      { k: 'status', label: 'Statut', type: 'select', options: ['Planifiée', 'Tenue', 'PV approuvé'], def: 'Planifiée' },
      { sec: 'Préparation et présence' },
      { k: 'agenda', label: 'Ordre du jour', type: 'textarea', full: true, req: true },
      { k: 'present', label: 'Présents (feuille de présence)', type: 'textarea' },
      { k: 'absent', label: 'Absents / excusés', type: 'textarea' },
      { k: 'conflicts', label: 'Conflits d’intérêts déclarés', type: 'textarea', full: true, help: 'À déclarer avant toute décision concernée.' },
      { sec: 'Procès-verbal' },
      { k: 'minutes', label: 'Procès-verbal', type: 'textarea', full: true, rows: 8 },
      { k: 'secretary', label: 'Secrétaire de séance', type: 'text' },
      { k: 'file', label: 'PV signé (fichier)', type: 'file' }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => U.date(r.date) },
      { k: 'instanceId', label: 'Instance', fmt: r => U.esc(refName('instances', r.instanceId)), csv: r => refName('instances', r.instanceId), cls: 'strong' },
      { k: 'kind', label: 'Type' },
      { k: 'agenda', label: 'Ordre du jour', fmt: r => U.esc((r.agenda || '').split('\n')[0]) },
      { k: 'decisions', label: 'Décisions', num: true, fmt: r => App.data.decisions.filter(d => d.meetingId === r.id).length },
      { k: 'status', label: 'Statut', fmt: r => pill(r.status, r.status === 'PV approuvé' ? 'ok' : r.status === 'Tenue' ? 'info' : 'warn') }
    ],
    search: ['agenda', 'minutes', 'present'],
    filters: [{ k: 'status', label: 'Statut', options: ['Planifiée', 'Tenue', 'PV approuvé'] }],
    print: r => PRINT.meeting(r)
  };

  S.decisions = {
    coll: 'decisions', title: 'Décisions et suivi', singular: 'une décision',
    sort: { k: 'due', dir: 1 },
    fields: [
      { k: 'meetingId', label: 'Réunion', type: 'ref', ref: 'meetings', refLabel: m => `${U.date(m.date)} — ${refName('instances', m.instanceId)}` },
      { k: 'status', label: 'Statut', type: 'select', options: ['À faire', 'En cours', 'Réalisée', 'Annulée'], def: 'À faire' },
      { k: 'text', label: 'Décision', type: 'textarea', full: true, req: true },
      { k: 'owner', label: 'Responsable désigné', type: 'text', req: true },
      { k: 'due', label: 'Échéance', type: 'date' },
      { k: 'notes', label: 'Suivi / commentaire', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'text', label: 'Décision', cls: 'strong' },
      { k: 'owner', label: 'Responsable' },
      { k: 'due', label: 'Échéance', fmt: r => { const late = r.due && r.due < U.today() && !['Réalisée', 'Annulée'].includes(r.status); return late ? `<span class="pill bad">${U.date(r.due)}</span>` : U.date(r.due); } },
      { k: 'meetingId', label: 'Réunion', fmt: r => { const m = byId('meetings', r.meetingId); return m ? U.esc(`${U.date(m.date)} — ${refName('instances', m.instanceId)}`) : ''; } },
      { k: 'status', label: 'Statut', fmt: r => pill(r.status, { 'Réalisée': 'ok', 'En cours': 'info', 'Annulée': '', 'À faire': 'warn' }[r.status]) }
    ],
    search: ['text', 'owner', 'notes'],
    filters: [{ k: 'status', label: 'Statut', options: ['À faire', 'En cours', 'Réalisée', 'Annulée'] }]
  };

  /* ---------------- 03 Membres ---------------- */
  const MEMBER_STATUS = ['Nouveau membre', 'Actif', 'Absent', 'À visiter', 'Transféré'];
  S.members = {
    coll: 'members', title: 'Registre des membres', singular: 'un membre',
    sort: { k: 'lastName', dir: 1 },
    fields: [
      { sec: 'Identité' },
      { k: 'number', label: 'N° membre', type: 'text', help: 'Attribué automatiquement si vide', def: () => S.members.nextNumber() },
      { k: 'status', label: 'Suivi', type: 'select', options: MEMBER_STATUS, def: 'Nouveau membre' },
      { k: 'lastName', label: 'Nom', type: 'text', req: true },
      { k: 'firstName', label: 'Prénoms', type: 'text', req: true },
      { sec: 'État civil' },
      { k: 'birthDate', label: 'Date de naissance', type: 'date' },
      { k: 'sex', label: 'Sexe', type: 'select', options: ['Masculin', 'Féminin'] },
      { k: 'family', label: 'Situation familiale', type: 'select', options: ['Célibataire', 'Marié(e)', 'Veuf / veuve', 'Divorcé(e)', 'Autre'] },
      { sec: 'Coordonnées' },
      { k: 'phone', label: 'Téléphone', type: 'tel' },
      { k: 'email', label: 'E-mail', type: 'email' },
      { k: 'address', label: 'Adresse', type: 'text', full: true },
      { sec: 'Vie spirituelle' },
      { k: 'arrival', label: 'Date d’arrivée', type: 'date', def: () => U.today() },
      { k: 'baptism', label: 'Date de baptême', type: 'date' },
      { k: 'cell', label: 'Groupe / cellule', type: 'text' },
      { k: 'mentor', label: 'Responsable de suivi', type: 'text' },
      { sec: 'Ministère' },
      { k: 'ministryId', label: 'Service actuel', type: 'ref', ref: 'ministries', help: 'Ministère où la personne sert comme bénévole' },
      { k: 'skills', label: 'Compétences', type: 'text' },
      { k: 'availability', label: 'Disponibilités', type: 'text', full: true },
      { sec: 'Urgence' },
      { k: 'emergencyName', label: 'Personne à contacter', type: 'text' },
      { k: 'emergencyPhone', label: 'Téléphone', type: 'tel' },
      { sec: 'Parcours d’intégration' },
      { k: 'integration', label: 'Étapes réalisées', type: 'checks', options: SEED.INTEGRATION, full: true, col: true },
      { k: 'mediaConsent', label: 'Autorise la diffusion de son image sur MERCI TV', type: 'checkbox', full: true },
      { k: 'notes', label: 'Notes pastorales (confidentiel)', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'number', label: 'N°' },
      { k: 'lastName', label: 'Nom et prénoms', cls: 'strong', fmt: r => U.esc(`${(r.lastName || '').toUpperCase()} ${r.firstName || ''}`), csv: r => `${r.lastName} ${r.firstName}` },
      { k: 'phone', label: 'Téléphone' },
      { k: 'cell', label: 'Cellule' },
      { k: 'ministryId', label: 'Service', fmt: r => U.esc(refName('ministries', r.ministryId)), csv: r => refName('ministries', r.ministryId) },
      { k: 'integration', label: 'Intégration', fmt: r => `${(r.integration || []).length}/6`, csv: r => `${(r.integration || []).length}/6` },
      { k: 'status', label: 'Suivi', fmt: r => pill(r.status, { 'Actif': 'ok', 'Nouveau membre': 'info', 'À visiter': 'warn', 'Absent': 'bad', 'Transféré': '' }[r.status]) }
    ],
    search: ['lastName', 'firstName', 'number', 'phone', 'email', 'cell', 'mentor'],
    filters: [
      { k: 'status', label: 'Suivi', options: MEMBER_STATUS },
      { k: 'ministryId', label: 'Service', ref: 'ministries' }
    ],
    nextNumber() {
      const max = App.data.members.reduce((m, x) => Math.max(m, parseInt(String(x.number || '').replace(/\D/g, ''), 10) || 0), 0);
      return 'M-' + String(max + 1).padStart(4, '0');
    },
    beforeSave(r) { if (!r.number) r.number = S.members.nextNumber(); },
    validate(r) {
      const dup = App.data.members.find(x => x.id !== r.id && x.number && x.number === r.number);
      return dup ? [`Le numéro ${r.number} est déjà attribué à ${dup.lastName} ${dup.firstName}.`] : [];
    },
    print: r => PRINT.member(r)
  };

  /* ---------------- 04 Dîmes, offrandes et dons ---------------- */
  const COLL_STATUS = ['Compté', 'Déposé', 'Enregistré', 'Rapproché'];
  const collTotal = r => U.num(r.tithes) + U.num(r.offerings) + U.num(r.project) + U.num(r.other);
  const collModes = r => U.num(r.cash) + U.num(r.cheques) + U.num(r.mobile);
  S.collections = {
    coll: 'collections', title: 'Bordereaux de collecte', singular: 'un bordereau',
    sort: { k: 'date', dir: -1 },
    total: collTotal,
    fields: [
      { sec: 'Culte' },
      { k: 'date', label: 'Date', type: 'date', req: true, def: () => U.today() },
      { k: 'service', label: 'Service / culte', type: 'select', options: SERVICE_TYPES, req: true, def: 'Culte du dimanche' },
      { sec: 'Catégories de dons (FCFA)' },
      { k: 'tithes', label: 'Dîmes', type: 'money' },
      { k: 'offerings', label: 'Offrandes', type: 'money' },
      { k: 'project', label: 'Projet', type: 'money' },
      { k: 'other', label: 'Autres', type: 'money' },
      { k: '_total', label: 'Total', type: 'computed', compute: r => U.money(collTotal(r)), full: true },
      { sec: 'Moyens de paiement (FCFA)' },
      { k: 'cash', label: 'Espèces', type: 'money' },
      { k: 'cheques', label: 'Chèques', type: 'money' },
      { k: 'mobile', label: 'Mobile Money', type: 'money' },
      { k: '_modes', label: 'Contrôle', type: 'computed', compute: r => { const d = collModes(r) - collTotal(r); return d === 0 ? '✓ Les moyens de paiement correspondent au total' : `⚠ Écart de ${U.money(d)} avec le total`; } },
      { sec: 'Comptage et dépôt' },
      { k: 'counter1', label: 'Compté par (1re personne)', type: 'text', req: true },
      { k: 'counter2', label: 'Compté par (2e personne)', type: 'text', req: true, help: 'Au moins deux personnes désignées, sans lien de subordination direct si possible.' },
      { k: 'verifiedBy', label: 'Vérifié par', type: 'text' },
      { k: 'depositedBy', label: 'Déposé par', type: 'text' },
      { k: 'depositDate', label: 'Date du dépôt', type: 'date' },
      { k: 'depositRef', label: 'Référence du dépôt', type: 'text' },
      { k: 'status', label: 'Statut', type: 'select', options: COLL_STATUS, def: 'Compté' },
      { k: 'file', label: 'Bordereau signé / reçu bancaire', type: 'file' },
      { k: 'notes', label: 'Observations', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => U.date(r.date) },
      { k: 'service', label: 'Service / culte', cls: 'strong' },
      { k: 'tithes', label: 'Dîmes', num: true, fmt: r => U.money(r.tithes), csv: r => U.num(r.tithes) },
      { k: 'offerings', label: 'Offrandes', num: true, fmt: r => U.money(r.offerings), csv: r => U.num(r.offerings) },
      { k: 'project', label: 'Projet', num: true, fmt: r => U.money(r.project), csv: r => U.num(r.project) },
      { k: 'other', label: 'Autres', num: true, fmt: r => U.money(r.other), csv: r => U.num(r.other) },
      { k: '_total', label: 'Total', num: true, cls: 'strong', fmt: r => U.money(collTotal(r)), csv: r => collTotal(r), sortVal: collTotal },
      { k: 'status', label: 'Statut', fmt: r => pill(r.status, { 'Compté': 'warn', 'Déposé': 'info', 'Enregistré': 'info', 'Rapproché': 'ok' }[r.status]) }
    ],
    footer: rows => ({ tithes: U.money(U.sum(rows, 'tithes')), offerings: U.money(U.sum(rows, 'offerings')), project: U.money(U.sum(rows, 'project')), other: U.money(U.sum(rows, 'other')), _total: U.money(U.sum(rows, collTotal)) }),
    search: ['service', 'counter1', 'counter2', 'depositRef', 'notes'],
    filters: [{ k: 'status', label: 'Statut', options: COLL_STATUS }, { k: '_month', label: 'Mois', month: 'date' }],
    validate(r) {
      const e = [];
      if (r.counter1 && r.counter2 && U.norm(r.counter1).trim() === U.norm(r.counter2).trim()) e.push('Le comptage doit être effectué par deux personnes différentes.');
      if (collTotal(r) <= 0) e.push('Le total du bordereau doit être supérieur à zéro.');
      if (r.status !== 'Compté' && !r.depositRef) e.push('La référence du dépôt est obligatoire dès que les fonds sont déposés.');
      if (r.status !== 'Compté' && !r.depositedBy) e.push('Indiquez la personne qui a déposé les fonds.');
      return e;
    },
    warnings(r) { return collModes(r) !== collTotal(r) ? ['La somme espèces + chèques + Mobile Money ne correspond pas au total des catégories.'] : []; },
    print: r => PRINT.collection(r)
  };

  /* ---------------- 05 Dépenses ---------------- */
  const LEVELS = [
    { k: 'resp', label: 'Responsable', roles: ['admin', 'pasteur', 'secretariat', 'responsable'] },
    { k: 'tres', label: 'Trésorier', roles: ['admin', 'tresorerie'] },
    { k: 'past', label: 'Pasteur / Conseil', roles: ['admin', 'pasteur'] }
  ];
  const expStatus = r => {
    if (r.rejected) return 'Rejetée';
    if (r.paid) return 'Payée';
    const n = LEVELS.filter(l => r['ok_' + l.k]).length;
    return n === 3 ? 'Autorisée' : `En attente (${n}/3)`;
  };
  S.expenses = {
    coll: 'expenses', title: 'Demandes de dépense', singular: 'une demande de dépense',
    sort: { k: 'date', dir: -1 },
    LEVELS, status: expStatus,
    fields: [
      { sec: 'Demande' },
      { k: 'date', label: 'Date de la demande', type: 'date', req: true, def: () => U.today() },
      { k: 'requester', label: 'Demandeur', type: 'text', req: true, def: () => App.user?.name },
      { k: 'object', label: 'Objet / besoin', type: 'textarea', full: true, req: true },
      { k: 'department', label: 'Département', type: 'select', optionsFn: () => ['Administration', ...App.data.ministries.map(m => m.name)], req: true },
      { k: 'budgetLine', label: 'Poste budgétaire', type: 'select', optionsFn: r => App.budgetLineNames((r.date || U.today()).slice(0, 4)), req: true },
      { k: 'amount', label: 'Montant demandé (FCFA)', type: 'money', req: true },
      { k: 'supplier', label: 'Fournisseur / bénéficiaire', type: 'text', req: true },
      { k: 'attachments', label: 'Pièces jointes', type: 'checks', options: ['Devis', 'Facture', 'Contrat', 'Autre'] },
      { k: 'file', label: 'Justificatif (fichier)', type: 'file' },
      { sec: 'Paiement (trésorerie)' },
      { k: 'paidDate', label: 'Date de paiement', type: 'date' },
      { k: 'paymentMode', label: 'Mode de paiement', type: 'select', options: ['Espèces', 'Chèque', 'Virement', 'Mobile Money'] },
      { k: 'paymentRef', label: 'Référence du paiement', type: 'text' },
      { k: 'notes', label: 'Observations', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => U.date(r.date) },
      { k: 'object', label: 'Objet', cls: 'strong', fmt: r => U.esc((r.object || '').split('\n')[0]) },
      { k: 'department', label: 'Département' },
      { k: 'budgetLine', label: 'Poste' },
      { k: 'amount', label: 'Montant', num: true, fmt: r => U.money(r.amount), csv: r => U.num(r.amount) },
      { k: '_approvals', label: 'Autorisations', fmt: r => LEVELS.map(l => r['ok_' + l.k] ? `<span class="pill ok" title="${U.esc(r['ok_' + l.k].by + ' — ' + U.date(r['ok_' + l.k].at))}">${l.label}</span>` : `<span class="pill">${l.label}</span>`).join(' '), csv: r => LEVELS.map(l => r['ok_' + l.k] ? `${l.label}: ${r['ok_' + l.k].by}` : '').filter(Boolean).join(' | ') },
      { k: '_status', label: 'Statut', fmt: r => { const s = expStatus(r); return pill(s, s === 'Payée' ? 'ok' : s === 'Autorisée' ? 'info' : s === 'Rejetée' ? 'bad' : 'warn'); }, csv: expStatus, sortVal: expStatus }
    ],
    footer: rows => ({ amount: U.money(U.sum(rows, 'amount')) }),
    search: ['object', 'supplier', 'requester', 'department', 'budgetLine'],
    filters: [
      { k: '_status', label: 'Statut', options: ['En attente', 'Autorisée', 'Payée', 'Rejetée'], test: (r, v) => expStatus(r).startsWith(v) },
      { k: 'department', label: 'Département', optionsFn: () => ['Administration', ...App.data.ministries.map(m => m.name)] },
      { k: '_month', label: 'Mois', month: 'date' }
    ],
    locked: r => !!(r.paid || r.rejected || LEVELS.some(l => r['ok_' + l.k])),
    lockedMsg: 'Cette demande a déjà reçu une autorisation : seuls le paiement et les observations restent modifiables.',
    lockedEditable: ['paidDate', 'paymentMode', 'paymentRef', 'notes', 'file'],
    validate(r) {
      const e = [];
      if (U.num(r.amount) <= 0) e.push('Le montant doit être supérieur à zéro.');
      if (r.paid && (!r.paidDate || !r.paymentMode)) e.push('Renseignez la date et le mode de paiement.');
      return e;
    },
    rowActions: [
      ...LEVELS.map(l => ({
        label: `Autoriser (${l.label})`, cls: 'gold',
        show: r => !r.rejected && !r.paid && !r['ok_' + l.k] && App.can(l.roles),
        run: r => App.approveExpense(r, l)
      })),
      { label: 'Marquer payée', cls: 'primary', show: r => expStatus(r) === 'Autorisée' && App.can(['admin', 'tresorerie']), run: r => App.payExpense(r) },
      { label: 'Rejeter', cls: 'danger', show: r => !r.rejected && !r.paid && App.can(['admin', 'pasteur', 'tresorerie']), run: r => App.rejectExpense(r) }
    ],
    print: r => PRINT.expense(r)
  };

  /* ---------------- 06 Prédicateurs et cultes ---------------- */
  S.preachers = {
    coll: 'preachers', title: 'Fiches prédicateurs', singular: 'un prédicateur',
    sort: { k: 'name', dir: 1 },
    fields: [
      { k: 'name', label: 'Nom et prénoms', type: 'text', req: true },
      { k: 'kind', label: 'Statut', type: 'select', options: ['Interne', 'Invité'], def: 'Interne' },
      { k: 'church', label: 'Église ou ministère de rattachement', type: 'text', full: true },
      { k: 'phone', label: 'Téléphone', type: 'tel' },
      { k: 'email', label: 'E-mail', type: 'email' },
      { sec: 'Validation' },
      { k: 'validatedBy', label: 'Responsable ayant validé', type: 'text' },
      { k: 'validatedOn', label: 'Date de validation', type: 'date' },
      { k: 'themes', label: 'Thèmes maîtrisés', type: 'textarea', full: true },
      { sec: 'Autorisation média' },
      { k: 'media', label: 'Enregistrement et diffusion sur MERCI TV', type: 'select', options: ['Oui', 'Non', 'Sous conditions'], def: 'Oui' },
      { k: 'mediaConditions', label: 'Conditions', type: 'text' },
      { k: 'charter', label: 'A pris connaissance et accepte la charte de conduite', type: 'checkbox', full: true, help: 'Respect de la doctrine et de la vision, unité, aucun abus spirituel, financier ou moral, confidentialité, aucune collecte de fonds sans autorisation explicite.' },
      { k: 'notes', label: 'Observations', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'name', label: 'Nom et prénoms', cls: 'strong' },
      { k: 'kind', label: 'Statut', fmt: r => pill(r.kind, r.kind === 'Invité' ? 'gold' : 'info') },
      { k: 'church', label: 'Rattachement' },
      { k: 'phone', label: 'Téléphone' },
      { k: 'validatedBy', label: 'Validation', fmt: r => r.validatedBy ? pill('Validé', 'ok') : pill('À valider', 'warn'), csv: r => r.validatedBy ? 'Validé' : 'À valider' },
      { k: 'media', label: 'Média', fmt: r => pill(r.media, r.media === 'Oui' ? 'ok' : r.media === 'Non' ? 'bad' : 'warn') },
      { k: 'charter', label: 'Charte', fmt: r => r.charter ? '✓' : '—', csv: r => r.charter ? 'Oui' : 'Non' }
    ],
    search: ['name', 'church', 'themes'],
    filters: [{ k: 'kind', label: 'Statut', options: ['Interne', 'Invité'] }],
    validate(r) {
      return r.kind === 'Invité' && !r.validatedBy ? ['Tout prédicateur invité doit être identifié, recommandé ou validé : indiquez le responsable ayant validé.'] : [];
    },
    print: r => PRINT.preacher(r)
  };

  S.services = {
    coll: 'services', title: 'Programme des cultes', singular: 'un culte',
    sort: { k: 'date', dir: -1 },
    fields: [
      { sec: 'Culte' },
      { k: 'date', label: 'Date', type: 'date', req: true, def: () => U.today() },
      { k: 'time', label: 'Heure', type: 'time', def: '09:00' },
      { k: 'type', label: 'Type de culte', type: 'select', options: SERVICE_TYPES, def: 'Culte du dimanche' },
      { k: 'preacherId', label: 'Prédicateur', type: 'ref', ref: 'preachers' },
      { k: 'theme', label: 'Thème', type: 'text', full: true },
      { k: 'scripture', label: 'Texte biblique', type: 'scripture' },
      { k: 'moderator', label: 'Modérateur / conducteur', type: 'text' },
      { k: 'worship', label: 'Responsable louange', type: 'text' },
      { sec: 'MERCI TV' },
      { k: 'live', label: 'Diffusé en direct sur MERCI TV', type: 'checkbox' },
      { k: 'recorded', label: 'Prédication enregistrée', type: 'checkbox' },
      { sec: 'Bilan (après le culte)' },
      { k: 'attendance', label: 'Présence', type: 'number' },
      { k: 'visitors', label: 'Nouveaux visiteurs', type: 'number' },
      { k: 'notes', label: 'Observations', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => `${U.date(r.date)} ${r.time ? '<span class="muted">' + U.esc(r.time) + '</span>' : ''}`, csv: r => `${r.date} ${r.time || ''}` },
      { k: 'type', label: 'Culte', cls: 'strong' },
      { k: 'preacherId', label: 'Prédicateur', fmt: r => U.esc(refName('preachers', r.preacherId)), csv: r => refName('preachers', r.preacherId) },
      { k: 'theme', label: 'Thème', fmt: r => U.esc(r.theme || '') + (r.scripture ? `<br><span class="muted">📖 ${U.esc(r.scripture)}</span>` : ''), csv: r => [r.theme, r.scripture].filter(Boolean).join(' — ') },
      { k: 'live', label: 'MERCI TV', fmt: r => (r.live ? pill('Direct', 'info') : '') + ' ' + (r.recorded ? pill('Enregistré', 'ok') : ''), csv: r => [r.live && 'Direct', r.recorded && 'Enregistré'].filter(Boolean).join(', ') },
      { k: 'attendance', label: 'Présence', num: true },
      { k: 'visitors', label: 'Visiteurs', num: true }
    ],
    search: ['theme', 'scripture', 'type', 'moderator'],
    filters: [{ k: 'type', label: 'Culte', options: SERVICE_TYPES }, { k: '_month', label: 'Mois', month: 'date' }],
    validate(r) {
      const p = byId('preachers', r.preacherId);
      const e = [];
      if (p && p.kind === 'Invité' && !p.validatedBy) e.push(`Le prédicateur invité « ${p.name} » n’est pas encore validé.`);
      if (p && (r.live || r.recorded) && p.media === 'Non') e.push(`« ${p.name} » n’autorise pas l’enregistrement ni la diffusion sur MERCI TV.`);
      return e;
    }
  };

  /* ---------------- 07 Ministères ---------------- */
  S.ministries = {
    coll: 'ministries', title: 'Ministères', singular: 'un ministère',
    sort: { k: 'name', dir: 1 },
    fields: [
      { k: 'name', label: 'Ministère', type: 'text', req: true },
      { k: 'frequency', label: 'Rapport', type: 'select', options: ['Mensuel', 'Trimestriel'], def: 'Mensuel' },
      { k: 'objective', label: 'Objectif', type: 'textarea', full: true },
      { k: 'leader', label: 'Responsable', type: 'text' },
      { k: 'deputy', label: 'Adjoint', type: 'text' },
      { k: 'meeting', label: 'Réunion habituelle', type: 'text', full: true },
      { k: 'volunteers', label: 'Autres bénévoles (hors registre des membres)', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'name', label: 'Ministère', cls: 'strong' },
      { k: 'objective', label: 'Objectif' },
      { k: 'leader', label: 'Responsable' },
      { k: '_vol', label: 'Bénévoles', num: true, fmt: r => App.data.members.filter(m => m.ministryId === r.id).length },
      { k: '_last', label: 'Dernier rapport', fmt: r => { const last = App.data.ministryReports.filter(x => x.ministryId === r.id).map(x => x.month).sort().pop(); return last ? U.monthLabel(last) : pill('Aucun', 'warn'); }, csv: r => App.data.ministryReports.filter(x => x.ministryId === r.id).map(x => x.month).sort().pop() || '' },
      { k: 'frequency', label: 'Rapport' }
    ],
    search: ['name', 'objective', 'leader']
  };

  const quarters = () => { const y = new Date().getFullYear(); const out = []; for (const yy of [y - 1, y, y + 1]) for (let q = 1; q <= 4; q++) out.push(`${yy}-T${q}`); return out; };
  const curQuarter = () => { const d = new Date(); return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`; };
  S.actionPlans = {
    coll: 'actionPlans', title: 'Plans d’action trimestriels', singular: 'un plan d’action',
    sort: { k: 'quarter', dir: -1 },
    fields: [
      { k: 'ministryId', label: 'Ministère', type: 'ref', ref: 'ministries', req: true },
      { k: 'quarter', label: 'Trimestre', type: 'select', optionsFn: quarters, def: curQuarter, req: true },
      { k: 'objective', label: 'Objectif', type: 'textarea', full: true, req: true },
      { k: 'activities', label: 'Activités', type: 'textarea', full: true },
      { k: 'owners', label: 'Responsables', type: 'text' },
      { k: 'budget', label: 'Budget demandé (FCFA)', type: 'money' },
      { k: 'resources', label: 'Ressources nécessaires', type: 'textarea' },
      { k: 'indicators', label: 'Indicateurs', type: 'textarea' },
      { k: 'status', label: 'Statut', type: 'select', options: ['Brouillon', 'Soumis', 'Validé', 'Clôturé'], def: 'Brouillon' },
      { k: 'review', label: 'Bilan', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'quarter', label: 'Trimestre' },
      { k: 'ministryId', label: 'Ministère', cls: 'strong', fmt: r => U.esc(refName('ministries', r.ministryId)), csv: r => refName('ministries', r.ministryId) },
      { k: 'objective', label: 'Objectif' },
      { k: 'budget', label: 'Budget', num: true, fmt: r => U.money(r.budget), csv: r => U.num(r.budget) },
      { k: 'status', label: 'Statut', fmt: r => pill(r.status, { 'Validé': 'ok', 'Soumis': 'info', 'Clôturé': '', 'Brouillon': 'warn' }[r.status]) }
    ],
    search: ['objective', 'activities', 'owners'],
    filters: [{ k: 'ministryId', label: 'Ministère', ref: 'ministries' }, { k: 'quarter', label: 'Trimestre', optionsFn: quarters }]
  };

  S.ministryReports = {
    coll: 'ministryReports', title: 'Rapports d’activité', singular: 'un rapport',
    sort: { k: 'month', dir: -1 },
    fields: [
      { k: 'ministryId', label: 'Ministère', type: 'ref', ref: 'ministries', req: true },
      { k: 'month', label: 'Mois', type: 'month', req: true, def: () => U.today().slice(0, 7) },
      { k: 'activities', label: 'Activités réalisées', type: 'textarea', full: true, req: true },
      { k: 'participants', label: 'Participants / bénévoles mobilisés', type: 'number' },
      { k: 'socialActions', label: 'Actions sociales réalisées', type: 'number' },
      { k: 'testimonies', label: 'Témoignages ou retours reçus', type: 'number' },
      { k: 'spent', label: 'Dépenses engagées (FCFA)', type: 'money' },
      { k: 'difficulties', label: 'Difficultés', type: 'textarea' },
      { k: 'needs', label: 'Besoins / prochaines étapes', type: 'textarea' },
      { k: 'author', label: 'Rédigé par', type: 'text', def: () => App.user?.name }
    ],
    columns: [
      { k: 'month', label: 'Mois', fmt: r => U.monthLabel(r.month), csv: r => r.month },
      { k: 'ministryId', label: 'Ministère', cls: 'strong', fmt: r => U.esc(refName('ministries', r.ministryId)), csv: r => refName('ministries', r.ministryId) },
      { k: 'activities', label: 'Activités', fmt: r => U.esc((r.activities || '').split('\n')[0]) },
      { k: 'participants', label: 'Participants', num: true },
      { k: 'socialActions', label: 'Actions sociales', num: true },
      { k: 'author', label: 'Rédigé par' }
    ],
    search: ['activities', 'difficulties', 'needs'],
    filters: [{ k: 'ministryId', label: 'Ministère', ref: 'ministries' }]
  };

  /* ---------------- 08 MERCI TV ---------------- */
  S.tvPrograms = {
    coll: 'tvPrograms', title: 'Programmes', singular: 'un programme',
    sort: { k: 'name', dir: 1 },
    fields: [
      { k: 'name', label: 'Nom du programme', type: 'text', req: true },
      { k: 'active', label: 'Programme actif', type: 'checkbox', def: true },
      { k: 'description', label: 'Description', type: 'textarea', full: true },
      { k: 'frequency', label: 'Fréquence', type: 'select', options: ['', 'Quotidienne', 'Hebdomadaire', 'Bimensuelle', 'Mensuelle', 'Ponctuelle'] },
      { k: 'day', label: 'Jour habituel', type: 'select', options: ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Tous les jours'] },
      { k: 'time', label: 'Heure de diffusion', type: 'time' },
      { k: 'producer', label: 'Producteur / animateur', type: 'text' }
    ],
    columns: [
      { k: 'name', label: 'Programme', cls: 'strong' },
      { k: 'description', label: 'Description' },
      { k: 'frequency', label: 'Fréquence' },
      { k: 'day', label: 'Jour', fmt: r => U.esc([r.day, r.time].filter(Boolean).join(' · ')) },
      { k: 'producer', label: 'Producteur' },
      { k: '_eps', label: 'Émissions', num: true, fmt: r => App.data.tvEpisodes.filter(e => e.programId === r.id).length },
      { k: 'active', label: 'État', fmt: r => r.active ? pill('Actif', 'ok') : pill('Inactif'), csv: r => r.active ? 'Actif' : 'Inactif' }
    ],
    search: ['name', 'description', 'producer']
  };

  const EP_STATUS = ['Planifiée', 'En production', 'En validation', 'Validée', 'Diffusée', 'Archivée'];
  S.tvEpisodes = {
    coll: 'tvEpisodes', title: 'Émissions et diffusions', singular: 'une émission',
    sort: { k: 'date', dir: -1 },
    STATUS: EP_STATUS,
    fields: [
      { sec: 'Émission' },
      { k: 'programId', label: 'Programme', type: 'ref', ref: 'tvPrograms', req: true },
      { k: 'title', label: 'Titre de l’émission', type: 'text', req: true },
      { k: 'date', label: 'Date de diffusion', type: 'date', req: true, def: () => U.today() },
      { k: 'time', label: 'Heure', type: 'time' },
      { k: 'format', label: 'Format', type: 'select', options: ['Direct', 'Enregistré', 'Rediffusion', 'Extrait / clip'], def: 'Enregistré' },
      { k: 'duration', label: 'Durée (min)', type: 'number' },
      { k: 'speakers', label: 'Intervenant(s)', type: 'text' },
      { k: 'scripture', label: 'Texte biblique', type: 'scripture' },
      { k: 'platforms', label: 'Plateformes de diffusion', type: 'checks', options: PLATFORMS, full: true },
      { sec: 'Coordination éditoriale et production' },
      { k: 'rundown', label: 'Conducteur / script', type: 'textarea', full: true, rows: 5 },
      { k: 'crew', label: 'Équipe technique', type: 'text', full: true },
      { k: 'status', label: 'Statut', type: 'select', options: EP_STATUS, def: 'Planifiée' },
      { k: 'validatedBy', label: 'Validé par (responsable désigné)', type: 'text' },
      { sec: 'Règles de diffusion' },
      { k: 'compliance', label: 'Contrôle de conformité', type: 'checks', options: SEED.BROADCAST_RULES, full: true, col: true },
      { k: 'minors', label: 'Des mineurs apparaissent à l’écran', type: 'checkbox' },
      { k: 'parentalConsent', label: 'Autorisation parentale obtenue', type: 'checkbox' },
      { sec: 'Publication et archivage' },
      { k: 'link', label: 'Lien de publication', type: 'text', full: true },
      { k: 'archive', label: 'Emplacement de l’original archivé', type: 'text', full: true, help: 'Disque, dossier, nuage… (support sécurisé)' },
      { k: 'views', label: 'Vues / audience', type: 'number' },
      { k: 'feedback', label: 'Témoignages ou retours reçus', type: 'number' }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => `${U.date(r.date)} ${r.time ? '<span class="muted">' + U.esc(r.time) + '</span>' : ''}`, csv: r => `${r.date} ${r.time || ''}` },
      { k: 'programId', label: 'Programme', fmt: r => U.esc(refName('tvPrograms', r.programId)), csv: r => refName('tvPrograms', r.programId) },
      { k: 'title', label: 'Titre', cls: 'strong' },
      { k: 'format', label: 'Format' },
      { k: 'compliance', label: 'Conformité', fmt: r => { const n = (r.compliance || []).length; return pill(`${n}/5`, n === 5 ? 'ok' : 'warn'); }, csv: r => `${(r.compliance || []).length}/5` },
      { k: 'status', label: 'Statut', fmt: r => pill(r.status, { 'Planifiée': '', 'En production': 'warn', 'En validation': 'warn', 'Validée': 'info', 'Diffusée': 'ok', 'Archivée': 'gold' }[r.status]) }
    ],
    search: ['title', 'speakers', 'rundown'],
    filters: [{ k: 'status', label: 'Statut', options: EP_STATUS }, { k: 'programId', label: 'Programme', ref: 'tvPrograms' }, { k: '_month', label: 'Mois', month: 'date' }],
    validate(r) {
      const e = [];
      const advanced = ['Validée', 'Diffusée', 'Archivée'].includes(r.status);
      if (advanced && !r.validatedBy) e.push('Tout contenu doit être validé par le responsable désigné avant diffusion.');
      if (advanced && (r.compliance || []).length < SEED.BROADCAST_RULES.length) e.push('Les 5 règles de diffusion doivent être vérifiées avant de valider ou diffuser.');
      if (r.minors && !r.parentalConsent && advanced) e.push('Des mineurs apparaissent : l’autorisation parentale est obligatoire.');
      if (r.status === 'Archivée' && !r.archive) e.push('Indiquez l’emplacement de l’original archivé.');
      return e;
    }
  };

  /* ---------------- 09 Archives ---------------- */
  S.archives = {
    coll: 'archives', title: 'Registre des archives', singular: 'un document',
    sort: { k: 'date', dir: -1 },
    fields: [
      { k: 'title', label: 'Intitulé du document', type: 'text', req: true, full: true },
      { k: 'category', label: 'Catégorie', type: 'select', options: [...SEED.ARCHIVE_RULES.map(a => a[0]), 'Statuts et règlements', 'Correspondance', 'Autre'], req: true },
      { k: 'owner', label: 'Responsable', type: 'text', help: 'Rempli selon la catégorie si laissé vide' },
      { k: 'date', label: 'Date du document', type: 'date', def: () => U.today() },
      { k: 'year', label: 'Exercice', type: 'text', def: () => String(new Date().getFullYear()) },
      { k: 'access', label: 'Confidentialité', type: 'select', options: ['Interne', 'Restreint', 'Confidentiel'], def: 'Interne' },
      { k: 'location', label: 'Classement / emplacement physique', type: 'text', full: true },
      { k: 'file', label: 'Copie numérique', type: 'file', full: true },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true }
    ],
    columns: [
      { k: 'date', label: 'Date', fmt: r => U.date(r.date) },
      { k: 'title', label: 'Document', cls: 'strong' },
      { k: 'category', label: 'Catégorie' },
      { k: 'owner', label: 'Responsable' },
      { k: 'location', label: 'Classement' },
      { k: 'access', label: 'Accès', fmt: r => pill(r.access, r.access === 'Confidentiel' ? 'bad' : r.access === 'Restreint' ? 'warn' : '') },
      { k: 'file', label: 'Fichier', fmt: r => r.file ? '📎' : '', csv: r => r.file?.name || '' }
    ],
    search: ['title', 'category', 'location', 'notes'],
    beforeSave(r) {
      const rule = SEED.ARCHIVE_RULES.find(a => a[0] === r.category);
      if (rule && !r.owner) r.owner = rule[1];
      if (rule && !r.location) r.location = rule[2];
    },
    filters: [{ k: 'category', label: 'Catégorie', options: [...SEED.ARCHIVE_RULES.map(a => a[0]), 'Statuts et règlements', 'Correspondance', 'Autre'] }, { k: 'year', label: 'Exercice', optionsFn: () => [...new Set(App.data.archives.map(a => a.year).filter(Boolean))].sort().reverse() }]
  };

  return S;
})();
