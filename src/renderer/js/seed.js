'use strict';
/* Données initiales issues du « Guide de gestion d'Église et du ministère média — MERCI TV ». */
const SEED = (() => {
  const ROLES = {
    admin: { label: 'Administrateur', modules: '*' },
    pasteur: { label: 'Responsable principal / Conseil', modules: '*' },
    secretariat: { label: 'Secrétariat', modules: ['dashboard', 'gouvernance', 'membres', 'predication', 'ministeres', 'archives', 'calendrier', 'guide'] },
    tresorerie: { label: 'Trésorerie', modules: ['dashboard', 'dons', 'budget', 'depenses', 'rapports', 'archives', 'calendrier', 'guide'] },
    media: { label: 'Département média MERCI TV', modules: ['dashboard', 'predication', 'mercitv', 'archives', 'calendrier', 'guide'] },
    responsable: { label: 'Responsable de ministère', modules: ['dashboard', 'ministeres', 'depenses', 'guide'] }
  };

  const INSTANCES = [
    ['Assemblée générale', 'Valide les grandes orientations, les rapports et les décisions prévues par les statuts.'],
    ['Responsable principal', 'Assure la direction spirituelle, la supervision pastorale, la coordination générale et l’orientation du ministère média.'],
    ['Conseil pastoral / anciens', 'Discernement, doctrine, discipline, accompagnement pastoral, validation des responsables et contrôle des contenus sensibles.'],
    ['Comité administratif et financier', 'Planification, budget, suivi des opérations, patrimoine, achats et contrôle interne.'],
    ['Secrétariat', 'Registres, correspondances, procès-verbaux, archivage, base des membres et autorisations de diffusion.'],
    ['Trésorerie', 'Encaissements, banque, comptabilité, paiements, rapports, inventaires et conservation des pièces.'],
    ['Département média MERCI TV', 'Production, captation, diffusion, publication numérique, archivage, web TV et contrôle éditorial.'],
    ['Responsables de ministères', 'Plan d’action, mobilisation, suivi des bénévoles et rapport d’activité.']
  ];

  const MINISTRIES = [
    ['Accueil / protocole', 'Recevoir, orienter et intégrer les visiteurs'],
    ['Louange / chorale', 'Préparer la musique et la conduite de la louange'],
    ['Jeunesse / enfants', 'Former, protéger et accompagner les jeunes'],
    ['Diaconat / social', 'Identifier les besoins et organiser l’assistance'],
    ['Évangélisation', 'Organiser les actions missionnaires et le suivi'],
    ['Médias / technique — MERCI TV', 'Sonorisation, vidéo, web TV, streaming, montage et archives'],
    ['Intercession', 'Coordonner les temps de prière et le suivi spirituel']
  ];

  const TV_PROGRAMS = [
    ['L’Autel du matin', 'Prière et consécration'],
    ['Le Pain quotidien', 'Méditation biblique'],
    ['MERCI TV — magazine prophétique', 'Enseignement, actualité spirituelle et exhortation'],
    ['L’Heure de la Parole', 'Grande prédication suivie de prière'],
    ['Actes 29', 'Vie pratique de l’Église et témoignages'],
    ['Studio Sion', 'Création et diffusion de cantiques'],
    ['Maranatha, Il vient', 'Vigilance et préparation au retour du Seigneur']
  ];

  const BUDGET_LINES = [
    ['Dîmes et dons prévisionnels', 'recette'],
    ['Personnel / indemnités', 'depense'],
    ['Loyer / charges / énergie', 'depense'],
    ['Culte et communication', 'depense'],
    ['Évangélisation / missions', 'depense'],
    ['MERCI TV / production / diffusion', 'depense'],
    ['Équipement / maintenance', 'depense'],
    ['Réserve / imprévus', 'depense']
  ];

  const ARCHIVE_RULES = [
    ['Registre des membres', 'Secrétariat', 'Dossier sécurisé, accès limité'],
    ['Procès-verbaux', 'Secrétariat', 'Archive physique et numérique'],
    ['Bordereaux de collecte', 'Trésorerie', 'Classés par date'],
    ['Relevés bancaires / factures', 'Trésorerie', 'Classés par exercice'],
    ['Contrats et inventaire', 'Comité administratif', 'Mise à jour annuelle'],
    ['Photos / vidéos / médias MERCI TV', 'Communication', 'Dossier organisé par événement et sauvegarde']
  ];

  // Calendrier annuel de gestion (chapitre 10)
  const CALENDAR = {
    semaine: { label: 'Chaque semaine', tasks: ['Culte', 'Collecte sécurisée', 'Dépôt des fonds', 'Suivi des visiteurs', 'Mise à jour du planning MERCI TV', 'Sauvegarde des contenus'] },
    mois: { label: 'Chaque mois', tasks: ['Réunion de conseil', 'Rapport financier', 'Suivi des ministères', 'Rapprochement bancaire', 'Bilan média'] },
    trimestre: { label: 'Chaque trimestre', tasks: ['Revue du budget', 'Formation des responsables', 'Bilan des activités', 'Évaluation de la programmation et ajustements'] },
    semestre: { label: 'Chaque semestre', tasks: ['Mise à jour du registre des membres', 'Inventaire', 'Évaluation des responsables', 'Contrôle des archives'] },
    annee: { label: 'Chaque année', tasks: ['Budget', 'Rapport moral, spirituel et financier', 'Audit / contrôle', 'Plan stratégique', 'Calendrier des cultes et de MERCI TV'] }
  };

  const INTEGRATION = [
    'Accueil et fiche de contact',
    'Entretien d’orientation',
    'Inscription au parcours de découverte et de discipulat',
    'Affectation à une cellule ou à un responsable de suivi',
    'Validation de l’adhésion selon les règles de l’Église',
    'Mise à jour annuelle des coordonnées et du statut'
  ];

  const BROADCAST_RULES = [
    'Contenu bibliquement cohérent et validé par le responsable désigné',
    'Photos, vidéos, témoignages et prises de parole publiés avec l’autorisation appropriée',
    'Mineurs et personnes vulnérables protégés (protection renforcée)',
    'Aucun propos diffamatoire, humiliant, manipulateur ou contraire à la vision',
    'Originaux et fichiers finalisés archivés sur un support sécurisé'
  ];

  function initialData() {
    const id = U.uid;
    const ts = U.now();
    const stamp = o => ({ id: id(), createdAt: ts, updatedAt: ts, ...o });
    return {
      meta: { app: 'merci-tv-gestion', schema: 1, createdAt: ts },
      settings: {
        churchName: '',
        leader: 'Angelex Willy MEANGNIN',
        denomination: '',
        address: '',
        city: 'Abidjan, Côte d’Ivoire',
        phone: '',
        email: '',
        periodFrom: '',
        periodTo: '',
        currency: 'FCFA',
        vision: 'Être une Église fidèle à la Parole de Dieu, fondée sur l’enseignement des apôtres, vivant dans la prière, la sanctification, l’amour fraternel et l’attente du retour du Seigneur Jésus-Christ.',
        mission: 'Proclamer Jésus-Christ, former des disciples, accompagner les familles et utiliser MERCI TV, le streaming, l’audio, la vidéo et les plateformes numériques pour atteindre les âmes en Côte d’Ivoire, en Afrique et dans le monde.',
        values: 'Fidélité à la Parole – prière – consécration – intégrité – transparence – sainteté – respect – confidentialité – excellence – responsabilité.',
        objectives: 'Édification de l’Église, évangélisation, formation des responsables, action sociale, consolidation de MERCI TV et amélioration de la diffusion numérique.',
        identity: 'Nous sommes une communauté chrétienne appelée à vivre selon le modèle de l’Église primitive, dans la doctrine des apôtres, la communion fraternelle, la fraction du pain et les prières. Nous annonçons Jésus-Christ, nous croyons à Son retour et nous mettons les médias au service de la propagation de la Parole.',
        validation: [
          { role: 'Responsable principal', name: 'Angelex Willy MEANGNIN', date: '', signed: false },
          { role: 'Président du conseil', name: '', date: '', signed: false },
          { role: 'Trésorier', name: '', date: '', signed: false },
          { role: 'Secrétaire', name: '', date: '', signed: false }
        ]
      },
      users: [],
      instances: INSTANCES.map(([name, resp], i) => stamp({ name, responsibilities: resp, holders: i === 1 ? 'Angelex Willy MEANGNIN' : '', order: i })),
      meetings: [],
      decisions: [],
      members: [],
      collections: [],
      expenses: [],
      budgets: {},
      preachers: [],
      services: [],
      ministries: MINISTRIES.map(([name, objective]) => stamp({ name, objective, frequency: 'Mensuel', leader: '', volunteers: '' })),
      actionPlans: [],
      ministryReports: [],
      tvPrograms: TV_PROGRAMS.map(([name, description]) => stamp({ name, description, frequency: '', day: '', time: '', producer: '', active: true })),
      tvEpisodes: [],
      archives: [],
      indicators: {},
      calendarChecks: {},
      log: []
    };
  }

  function budgetLines() {
    return BUDGET_LINES.map(([name, kind]) => ({ id: U.uid(), name, kind, budget: 0, notes: '' }));
  }

  return { ROLES, CALENDAR, INTEGRATION, BROADCAST_RULES, ARCHIVE_RULES, initialData, budgetLines };
})();
