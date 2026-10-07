// Test de bout en bout : lance l'application Electron, parcourt chaque module et saisit des données.
const { _electron: electron } = require(process.env.PW || 'playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtv-'));
  const shots = process.env.SHOTS || path.join(dataDir, 'shots');
  fs.mkdirSync(shots, { recursive: true });
  const app = await electron.launch({ executablePath: process.env.ELECTRON_PATH || require(path.join(__dirname, '..', 'node_modules', 'electron')), args: [path.join(__dirname, '..'), ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [])], env: { ...process.env, MERCI_TV_DATA_DIR: dataDir } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', e => errors.push(e.message));
  win.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await win.setViewportSize({ width: 1360, height: 860 }).catch(() => {});
  const shot = n => win.screenshot({ path: path.join(shots, n + '.png') });
  const nav = async id => { await win.click(`[data-go="${id}"]`); await win.waitForTimeout(150); };
  const tab = async label => { await win.click(`.tabs button:has-text("${label}")`); await win.waitForTimeout(100); };
  const fill = async (k, v) => {
    const el = win.locator(`.modal [name="${k}"]`);
    const tag = await el.evaluate(e => e.tagName);
    if (tag === 'SELECT') {
      const opts = await el.evaluate(e => [...e.options].map(o => ({ v: o.value, t: o.textContent })));
      const o = opts.find(o => o.t === v || o.v === v) || opts.find(o => o.t.includes(v));
      await el.selectOption(o.v);
    } else await el.fill(String(v));
  };
  const save = async () => { await win.click('.modal [data-a=save]'); await win.waitForTimeout(150); };
  const add = async () => { await win.click('[data-new]'); await win.waitForSelector('.modal'); };
  const noModal = async label => { await win.waitForTimeout(500); const n = await win.locator('.modal').count(); if (n) { const err = await win.locator('.modal').last().textContent().catch(() => ''); throw new Error(`${label}: modal still open — ${err}`); } };

  // 1. Configuration initiale
  await win.waitForSelector('form#f');
  await shot('00-setup');
  await win.fill('[name=church]', 'Église Évangélique de la Parole');
  await win.fill('[name=pw]', 'motdepasse1');
  await win.fill('[name=pw2]', 'motdepasse1');
  await win.click('button.gold');
  await win.waitForSelector('.shell');
  await shot('01-dashboard-empty');

  // 2. Membres
  await nav('membres');
  await add();
  await fill('lastName', 'Kouassi'); await fill('firstName', 'Aya Marie'); await fill('phone', '+225 07 00 00 00');
  await fill('cell', 'Cellule Cocody'); await fill('ministryId', 'Louange / chorale');
  await win.locator('.modal [data-checks=integration]').first().check();
  await save(); await noModal('membre');
  await add(); await fill('lastName', 'Yao'); await fill('firstName', 'Jean'); await fill('status', 'À visiter'); await save(); await noModal('membre2');
  await shot('02-membres');

  // 3. Dons : contrôle double comptage
  await nav('dons');
  await add();
  await fill('tithes', 150000); await fill('offerings', 85000); await fill('project', 20000);
  await fill('cash', 180000); await fill('mobile', 75000);
  await fill('counter1', 'Paul'); await fill('counter2', 'paul');
  await save();
  const e1 = await win.locator('#ferr').textContent();
  if (!/deux personnes/.test(e1)) throw new Error('double comptage non contrôlé');
  await fill('counter2', 'Esther');
  await shot('03-bordereau-form');
  await save(); await noModal('bordereau');
  await shot('03-dons');
  // Export PDF du bordereau (boîte de dialogue simulée)
  const pdfPath = path.join(shots, 'bordereau.pdf');
  await app.evaluate(({ dialog, shell }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); shell.openPath = async () => ''; }, pdfPath);
  await win.click('[data-pr]'); await win.click('.modal [data-a=pdf]');
  for (let i = 0; i < 50 && !fs.existsSync(pdfPath); i++) await win.waitForTimeout(100);
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 1000) throw new Error('PDF non généré');

  // 4. Budget
  await nav('budget');
  await win.click('#bnew'); await win.waitForTimeout(200);
  const inputs = win.locator('input.cell[data-k=budget]');
  await inputs.nth(0).fill('12000000'); await inputs.nth(0).dispatchEvent('change'); await win.waitForTimeout(150);
  await win.locator('input.cell[data-k=budget]').nth(5).fill('2500000'); await win.locator('input.cell[data-k=budget]').nth(5).dispatchEvent('change'); await win.waitForTimeout(150);
  await shot('04-budget');

  // 5. Dépenses + séparation des tâches
  await nav('depenses');
  await add();
  await fill('object', 'Achat d’une caméra pour MERCI TV'); await fill('department', 'Médias / technique — MERCI TV');
  await fill('budgetLine', 'MERCI TV / production / diffusion'); await fill('amount', 450000); await fill('supplier', 'Boutique Vidéo Plateau');
  await fill('requester', 'Frère Daniel');
  await save(); await noModal('dépense');
  // celui qui a saisi la demande ne peut pas l'autoriser
  await win.click('button:has-text("Autoriser (Responsable)")'); await win.waitForTimeout(200);
  const toast = await win.locator('.toast').textContent();
  if (!/propre demande/.test(toast)) throw new Error('séparation des tâches non appliquée: ' + toast);
  await shot('05-depenses');

  // 6. Prédicateurs et cultes
  await nav('predication');
  await tab('Fiches prédicateurs');
  await add(); await fill('name', 'Pasteur Invité Koné'); await fill('kind', 'Invité'); await save();
  if (!/invité/.test(await win.locator('#ferr').textContent())) throw new Error('validation invité');
  await fill('validatedBy', 'Angelex Willy MEANGNIN'); await save(); await noModal('prédicateur');
  await tab('Programme des cultes');
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  const sunday = d.toISOString().slice(0, 10);
  await add(); await fill('date', sunday); await fill('preacherId', 'Pasteur Invité Koné'); await fill('theme', 'Maranatha, le Seigneur vient');
  await win.locator('.modal [name=live]').check(); await save(); await noModal('culte');
  await add(); await fill('date', new Date().toISOString().slice(0, 10)); await fill('attendance', 240); await fill('visitors', 12); await win.locator('.modal [name=recorded]').check(); await save(); await noModal('culte2');
  await shot('06-cultes');

  // 7. Ministères
  await nav('ministeres');
  await tab('Rapports d’activité');
  await add(); await fill('ministryId', 'Diaconat / social'); await fill('activities', 'Distribution de vivres'); await fill('socialActions', 3); await save(); await noModal('rapport');
  await tab('Plans d’action trimestriels');
  await add(); await fill('ministryId', 'Évangélisation'); await fill('objective', 'Campagne dans 3 quartiers'); await fill('budget', 300000); await save(); await noModal('plan');
  await shot('07-ministeres');

  // 8. MERCI TV
  await nav('mercitv');
  await win.click('[data-new]'); await win.waitForSelector('.modal');
  await fill('programId', 'L’Heure de la Parole'); await fill('title', 'La foi qui triomphe'); await fill('status', 'Diffusée');
  await save();
  if (!/validé/.test(await win.locator('#ferr').textContent())) throw new Error('règles de diffusion non contrôlées');
  await fill('validatedBy', 'Responsable média');
  for (const c of await win.locator('.modal [data-checks=compliance]').all()) await c.check();
  await save(); await noModal('émission');
  await win.click('[data-new]'); await win.waitForSelector('.modal');
  await fill('programId', 'L’Autel du matin'); await fill('title', 'Prière du matin'); await fill('date', sunday); await fill('time', '06:00'); await save(); await noModal('émission2');
  await shot('08-mercitv-semaine');
  await tab('Programmes');
  await shot('08-mercitv-programmes');

  // 9. Gouvernance
  await nav('gouvernance');
  await add(); await fill('instanceId', 'Conseil pastoral / anciens'); await fill('agenda', '1. Prière\n2. Budget 2026\n3. MERCI TV'); await fill('status', 'Tenue'); await save(); await noModal('réunion');
  await tab('Décisions et suivi');
  await add(); await fill('text', 'Acheter une caméra'); await fill('owner', 'Trésorier'); await fill('due', '2026-01-15'); await save(); await noModal('décision');

  // 10. Archives, rapports, calendrier, guide, paramètres
  await nav('archives'); await add(); await fill('title', 'PV conseil janvier'); await fill('category', 'Procès-verbaux'); await save(); await noModal('archive');
  await shot('09-archives');
  await nav('rapports'); await shot('10-rapports-board');
  await tab('Rapport financier mensuel'); await shot('10-rapports-finance');
  await tab('Journal des opérations');
  await nav('calendrier'); await win.locator('[data-c]').first().check(); await win.waitForTimeout(150); await shot('11-calendrier');
  await nav('guide'); await shot('12-guide');
  await nav('parametres'); await tab('Utilisateurs');
  await win.click('#un'); await win.fill('#u1', 'Sœur Trésorière'); await win.fill('#u2', 'tresor'); await win.selectOption('#u3', 'tresorerie'); await win.fill('#u4', 'tresor1234'); await win.click('.modal [data-a=ok]'); await win.waitForTimeout(200);
  await win.click('#un'); await win.fill('#u1', 'Pasteur Conseil'); await win.fill('#u2', 'pasteur'); await win.selectOption('#u3', 'pasteur'); await win.fill('#u4', 'pasteur1234'); await win.click('.modal [data-a=ok]'); await win.waitForTimeout(200);
  await shot('13-utilisateurs');
  await nav('dashboard'); await win.waitForSelector('#vday .vtext'); await shot('14-dashboard');

  // Bible Louis Segond 1910
  await nav('bible');
  await win.waitForSelector('.bible-page');
  await win.fill('#refin', 'Jean 3:16'); await win.click('#goref button'); await win.waitForSelector('.vs.sel');
  const vtxt = await win.locator('.vs.sel').first().textContent();
  if (!/tant aimé le monde/.test(vtxt)) throw new Error('Jean 3:16 introuvable: ' + vtxt);
  await win.locator('.vs[data-v="17"]').click({ modifiers: ['Shift'] });
  if (!/Jean 3:16-17/.test(await win.locator('#selbar').textContent())) throw new Error('sélection de plage');
  await shot('17-bible-lecture');
  // projection
  const [proj] = await Promise.all([app.waitForEvent('window'), win.click('#selbar [data-s=proj]')]);
  await proj.waitForFunction(() => /tant aimé/.test(document.querySelector('.text').textContent));
  await win.waitForSelector('.proj-bar');
  await win.click('.proj-bar [data-p=next]');
  await proj.waitForFunction(() => /Jean 3:18/i.test(document.querySelector('.ref').textContent));
  await proj.setViewportSize({ width: 1280, height: 720 }).catch(() => {});
  await proj.screenshot({ path: path.join(shots, '18-projection.png') });
  await shot('18-bible-pilotage');
  await win.click('.proj-bar [data-p=stop]'); await win.waitForTimeout(300);
  // marque-page
  await win.click('#selbar [data-s=clear]');
  await win.locator('.vs[data-v="16"]').click();
  await win.click('#selbar [data-s=mark]'); await win.fill('#pv', 'Verset de la campagne'); await win.click('.modal [data-a=ok]'); await win.waitForTimeout(200);
  // recherche
  await tab('Recherche'); await win.fill('#sq', 'eternel est mon berger'); await win.click('#sf button'); await win.waitForSelector('.res');
  if (!/Psaumes 23:1/.test(await win.locator('#sr').textContent())) throw new Error('recherche');
  await shot('19-bible-recherche');
  await win.locator('.res').first().click(); await win.waitForSelector('.vs.sel');
  await tab('Marque-pages'); await shot('20-bible-marque-pages');
  // champ « texte biblique » d'un culte
  await nav('predication'); await tab('Programme des cultes');
  await add(); await fill('scripture', '1 Co 14:40'); await win.click('.modal [data-bible=scripture]');
  await win.waitForFunction(() => /bienséance/.test(document.querySelector('.overlay:last-child .modal').textContent));
  await shot('21-culte-texte-biblique');
  await win.locator('.overlay:last-child .x').click(); await win.locator('.overlay .x').click();



  const login = async (l, pw) => { await win.click('#btn-out'); await win.waitForSelector('form#f'); await win.fill('[name=login]', l); await win.fill('[name=pw]', pw); await win.click('button.gold'); await win.waitForSelector('.shell'); };
  // 11. Compte trésorerie : modules restreints + signature trésorier
  await win.click('#btn-out'); await win.waitForSelector('form#f');
  await win.fill('[name=login]', 'tresor'); await win.fill('[name=pw]', 'mauvais'); await win.click('button.gold'); await win.waitForTimeout(400);
  if (!/incorrect/.test(await win.locator('#err').textContent())) throw new Error('mauvais mot de passe accepté');
  await win.fill('[name=pw]', 'tresor1234'); await win.click('button.gold'); await win.waitForSelector('.shell');
  const navIds = await win.locator('[data-go]').evaluateAll(b => b.map(x => x.dataset.go));
  if (navIds.includes('membres') || navIds.includes('mercitv')) throw new Error('accès non restreint: ' + navIds);
  await nav('depenses');
  await win.click('button:has-text("Autoriser (Trésorier)")'); await win.click('.modal [data-a=ok]'); await win.waitForTimeout(200);
  await shot('15-tresorerie');
  // 12. Compte pasteur : signe « Responsable », ne peut pas signer un 2e niveau
  await login('pasteur', 'pasteur1234');
  await nav('depenses');
  await win.click('button:has-text("Autoriser (Responsable)")'); await win.click('.modal [data-a=ok]'); await win.waitForTimeout(200);
  await win.click('button:has-text("Autoriser (Pasteur / Conseil)")'); await win.waitForTimeout(200);
  if (!/déjà autorisé/.test(await win.locator('.toast').textContent())) throw new Error('double signature non bloquée');
  await shot('16-pasteur');

  const data = JSON.parse(fs.readFileSync(path.join(dataDir, 'donnees.json'), 'utf8'));
  const exp = data.expenses[0];
  if (!exp.ok_resp || !exp.ok_tres || exp.ok_past || exp.ok_resp.userId === exp.ok_tres.userId) throw new Error('signatures incorrectes');
  if (data.members.length !== 2 || data.members[0].number !== 'M-0001') throw new Error('membres');
  if (data.bibleBookmarks.length !== 1 || data.bibleBookmarks[0].ref !== 'Jean 3:16') throw new Error('marque-page');
  if (!fs.readdirSync(path.join(dataDir, 'sauvegardes')).length) throw new Error('aucune sauvegarde automatique');
  await app.close();
  if (errors.length) { console.error('Erreurs console :\n' + errors.join('\n')); process.exit(1); }
  console.log('OK — parcours complet réussi. Captures :', shots);
})().catch(e => { console.error('ÉCHEC :', e); process.exit(1); });
