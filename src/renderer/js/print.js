'use strict';
/* Modèles imprimables (impression directe ou export PDF), fidèles à la mise en page du guide. */
const PRINT = (() => {
  const e = U.esc;
  const church = () => App.data.settings.churchName || 'Église';

  const CSS = `
    @page { size: A4; margin: 16mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif; font-size: 11.5px; color: #1b2338; margin: 0; }
    .top { display: flex; justify-content: space-between; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #8a93a6; margin-bottom: 10px; }
    .top b { color: #b18a35; font-weight: 600; }
    .head { display: flex; align-items: flex-end; gap: 12px; border-bottom: 2px solid #0f1a33; padding-bottom: 8px; margin-bottom: 14px; }
    .head .n { font-family: Georgia, serif; font-size: 34px; color: #c9a24a; line-height: .9; }
    .head .eb { font-size: 9px; letter-spacing: .22em; text-transform: uppercase; color: #c9a24a; font-weight: 700; }
    .head h1 { font-family: Georgia, serif; font-size: 21px; color: #0f1a33; margin: 2px 0 0; }
    h2 { font-family: Georgia, serif; font-size: 14px; color: #0f1a33; margin: 18px 0 8px; }
    h2::before { content: '— '; color: #c9a24a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { background: #0f1a33; color: #fff; text-align: left; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; padding: 7px 8px; }
    td { padding: 7px 8px; border-bottom: 1px solid #e2e5ec; vertical-align: top; }
    tbody tr:nth-child(odd) td { background: #f3f5f9; }
    td.l { background: #f5f0e6 !important; font-weight: 600; width: 32%; }
    td.r, th.r { text-align: right; }
    tfoot td { font-weight: 700; background: #f5f0e6; border-top: 2px solid #0f1a33; }
    .sig { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 28px; }
    .sig div { border-top: 1px solid #0f1a33; padding-top: 6px; font-size: 10px; color: #4a5368; min-height: 54px; }
    .note { background: #f5f0e6; border-left: 3px solid #c9a24a; padding: 8px 12px; margin: 10px 0; }
    .bad { background: #fbece8; border-left-color: #a8442f; }
    .foot { margin-top: 24px; text-align: center; font-size: 9px; color: #8a93a6; letter-spacing: .1em; }
    .pre { white-space: pre-wrap; }
    .box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2338; margin-right: 4px; vertical-align: -1px; text-align: center; line-height: 9px; font-size: 9px; }
  `;

  function page(eyebrow, title, body, num = '') {
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${e(title)}</title><style>${CSS}</style></head><body>
      <div class="top"><span>${e(church())} — MERCI TV</span><b>Document interne</b></div>
      <div class="head">${num ? `<div class="n">${e(num)}</div>` : ''}<div><div class="eb">${e(eyebrow)}</div><h1>${e(title)}</h1></div></div>
      ${body}
      <div class="foot">Édité le ${new Date().toLocaleDateString('fr-FR')} par ${e(App.user?.name || '')} · MERCI TV Gestion</div>
    </body></html>`;
  }
  const kv = rows => `<table><tbody>${rows.map(([k, v]) => `<tr><td class="l">${e(k)}</td><td class="pre">${v ?? ''}</td></tr>`).join('')}</tbody></table>`;
  const box = on => `<span class="box">${on ? '✓' : ''}</span>`;

  function collection(r) {
    const total = SCHEMAS.collections.total(r);
    return page('Finances', 'Bordereau de collecte', `
      <table><thead><tr><th>Date</th><th>Service / culte</th><th class="r">Dîmes</th><th class="r">Offrandes</th><th class="r">Projet</th><th class="r">Autres</th><th class="r">Total</th></tr></thead>
      <tbody><tr><td>${U.date(r.date)}</td><td>${e(r.service)}</td><td class="r">${U.money(r.tithes)}</td><td class="r">${U.money(r.offerings)}</td><td class="r">${U.money(r.project)}</td><td class="r">${U.money(r.other)}</td><td class="r"><b>${U.money(total)}</b></td></tr></tbody></table>
      <h2>Moyens de paiement</h2>
      ${kv([['Espèces', U.money(r.cash)], ['Chèques', U.money(r.cheques)], ['Mobile Money', U.money(r.mobile)]])}
      <h2>Comptage et dépôt</h2>
      ${kv([['Compté par (nom / signature)', `${e(r.counter1)}<br>${e(r.counter2)}`], ['Vérifié par (nom / signature)', e(r.verifiedBy)], ['Déposé par', e(r.depositedBy)], ['Date du dépôt', U.date(r.depositDate)], ['Référence du dépôt', e(r.depositRef)], ['Statut', e(r.status)], ['Observations', e(r.notes)]])}
      <div class="sig"><div>Compteur 1<br>${e(r.counter1)}</div><div>Compteur 2<br>${e(r.counter2)}</div><div>Vérificateur<br>${e(r.verifiedBy)}</div></div>
      <div class="note bad"><b>Interdiction :</b> aucune personne ne doit utiliser les recettes avant leur comptabilisation et leur dépôt.</div>`, '04');
  }

  function expense(r) {
    const L = SCHEMAS.expenses.LEVELS;
    const att = ['Devis', 'Facture', 'Contrat', 'Autre'].map(a => `${box((r.attachments || []).includes(a))}${a}`).join(' &nbsp; ');
    return page('Finances', 'Demande de dépense', `
      ${kv([['Date', U.date(r.date)], ['Demandeur', e(r.requester)], ['Objet / besoin', e(r.object)], ['Département', e(r.department)], ['Poste budgétaire', e(r.budgetLine)], ['Montant demandé', `<b>${U.money(r.amount)}</b>`], ['Fournisseur / bénéficiaire', e(r.supplier)], ['Pièces jointes', att]])}
      <h2>Autorisation</h2>
      <table><thead><tr><th>Niveau</th><th>Nom</th><th>Date</th></tr></thead><tbody>
      ${L.map(l => `<tr><td>${l.label}</td><td>${e(r['ok_' + l.k]?.by || '')}</td><td>${r['ok_' + l.k] ? U.date(r['ok_' + l.k].at.slice(0, 10)) : ''}</td></tr>`).join('')}
      </tbody></table>
      ${r.rejected ? `<div class="note bad"><b>Demande rejetée</b> par ${e(r.rejected.by)} le ${U.date(r.rejected.at.slice(0, 10))} — ${e(r.rejected.reason || '')}</div>` : ''}
      <h2>Paiement</h2>
      ${kv([['Statut', e(SCHEMAS.expenses.status(r))], ['Date de paiement', U.date(r.paidDate)], ['Mode', e(r.paymentMode)], ['Référence', e(r.paymentRef)], ['Observations', e(r.notes)]])}
      <div class="note">Toute dépense doit être justifiée, autorisée avant paiement et enregistrée. Les signataires bancaires, demandeurs et contrôleurs ne doivent pas être une seule et même personne.</div>
      <div class="sig"><div>Responsable</div><div>Trésorier</div><div>Pasteur / Conseil</div></div>`, '05');
  }

  function preacher(r) {
    return page('Chaire', 'Fiche prédicateur', `
      ${kv([['Nom et prénoms', e(r.name)], ['Statut', `${box(r.kind === 'Interne')}Interne &nbsp; ${box(r.kind === 'Invité')}Invité — Église ou ministère de rattachement : ${e(r.church)}`], ['Contacts', `Téléphone : ${e(r.phone)} &nbsp; E-mail : ${e(r.email)}`], ['Validation', `Responsable ayant validé : ${e(r.validatedBy)} &nbsp; Date : ${U.date(r.validatedOn)}`], ['Thèmes maîtrisés', e(r.themes)], ['Autorisation média', `Enregistrement et diffusion sur MERCI TV : ${box(r.media === 'Oui')}Oui ${box(r.media === 'Non')}Non ${box(r.media === 'Sous conditions')}Conditions : ${e(r.mediaConditions)}`], ['Observations', e(r.notes)]])}
      <h2>Charte de conduite</h2>
      <p>Les prédicateurs et intervenants s’engagent à respecter la doctrine et la vision de l’Église, à préserver l’unité, à éviter tout abus spirituel, financier ou moral, à respecter la confidentialité et à ne pas collecter de fonds sans autorisation explicite de l’Église.</p>
      <p>${box(r.charter)} Charte acceptée</p>
      <div class="sig"><div>Le prédicateur</div><div>Le responsable ayant validé</div><div>Date</div></div>`, '06');
  }

  function member(r) {
    const integ = SEED.INTEGRATION.map((s, i) => `${box((r.integration || []).includes(s))}${i + 1}. ${e(s)}`).join('<br>');
    const min = App.data.ministries.find(m => m.id === r.ministryId);
    return page('Communauté', `Fiche membre — ${r.number || ''}`, `
      ${kv([['Identité', `${e(r.number)} — ${e((r.lastName || '').toUpperCase())} ${e(r.firstName)}`], ['État civil', `${U.date(r.birthDate)} – ${e(r.sex)} – ${e(r.family)}`], ['Coordonnées', `${e(r.phone)} – ${e(r.email)} – ${e(r.address)}`], ['Vie spirituelle', `Arrivée : ${U.date(r.arrival)} – Baptême : ${U.date(r.baptism)} – Cellule : ${e(r.cell)}`], ['Ministère', `${e(min?.name || '')} – ${e(r.skills)} – ${e(r.availability)}`], ['Urgence', `${e(r.emergencyName)} – ${e(r.emergencyPhone)}`], ['Suivi', e(r.status)], ['Parcours d’intégration', integ]])}
      <div class="note">Document confidentiel — usage limité à la vie pastorale et administrative de l’Église.</div>`, '03');
  }

  function meeting(r) {
    const inst = App.data.instances.find(i => i.id === r.instanceId);
    const decs = App.data.decisions.filter(d => d.meetingId === r.id);
    return page('Structure', `Procès-verbal — ${inst?.name || 'Réunion'}`, `
      ${kv([['Date et heure', `${U.dateLong(r.date)} ${e(r.time || '')}`], ['Type', e(r.kind)], ['Lieu', e(r.place)], ['Ordre du jour', e(r.agenda)], ['Présents', e(r.present)], ['Absents / excusés', e(r.absent)], ['Conflits d’intérêts déclarés', e(r.conflicts) || 'Aucun']])}
      <h2>Délibérations</h2><div class="pre">${e(r.minutes)}</div>
      <h2>Décisions</h2>
      <table><thead><tr><th>Décision</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>
      ${decs.map(d => `<tr><td>${e(d.text)}</td><td>${e(d.owner)}</td><td>${U.date(d.due)}</td><td>${e(d.status)}</td></tr>`).join('') || '<tr><td colspan="4">Aucune décision enregistrée</td></tr>'}
      </tbody></table>
      <div class="sig"><div>Le président de séance</div><div>Le secrétaire<br>${e(r.secretary)}</div><div>Date d’approbation</div></div>`, '02');
  }

  function table(title, eyebrow, head, rows, foot) {
    return page(eyebrow, title, `<table><thead><tr>${head.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map(c => `<td>${e(c)}</td>`).join('')}</tr></tfoot>` : ''}</table>`);
  }

  function raw(eyebrow, title, html, num) { return page(eyebrow, title, html, num); }

  return { collection, expense, preacher, member, meeting, table, raw };
})();
