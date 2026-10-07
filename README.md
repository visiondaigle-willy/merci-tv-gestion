# MERCI TV Gestion

Logiciel de bureau (Windows et macOS) de **gestion d’Église et du ministère média MERCI TV**, construit à partir du *Guide de gestion d’Église et du ministère média — MERCI TV* (Abidjan, Côte d’Ivoire).

Le logiciel fonctionne **sans Internet**. Toutes les données restent sur l’ordinateur de l’Église.

---

## Fonctionnalités (un module par chapitre du guide)

| Chap. | Module | Ce que fait le logiciel |
|---|---|---|
| 01 | **Guide de gestion** | Vision, mission, valeurs, objectifs, déclaration d’identité, principes directeurs |
| 02 | **Gouvernance** | Instances et titulaires, réunions (ordre du jour, présence, conflits d’intérêts, PV imprimable), décisions avec responsable et échéance (alerte en cas de retard) |
| 03 | **Membres** | Registre complet (identité, état civil, coordonnées, vie spirituelle, ministère, urgence, suivi), numéro automatique, parcours d’intégration en 6 étapes, fiche imprimable |
| 04 | **Dîmes, offrandes et dons** | Bordereaux de collecte (dîmes, offrandes, projet, autres ; espèces, chèques, Mobile Money). Contrôles : **deux compteurs différents obligatoires**, cohérence moyens de paiement / total, référence de dépôt obligatoire, alerte si les fonds ne sont pas déposés sous 2 jours |
| 05 | **Budget** | Budget annuel par poste (postes du guide pré-remplis), réalisé et engagé calculés automatiquement, écarts, statut Brouillon → Soumis → Adopté (verrouillé) |
| 05 | **Dépenses** | Demandes de dépense avec pièces jointes, **triple autorisation** Responsable → Trésorier → Pasteur/Conseil, puis paiement. **Séparation des tâches** : impossible d’autoriser sa propre demande ou de signer deux niveaux |
| 06 | **Prédicateurs et cultes** | Fiches prédicateurs (statut, validation, autorisation média, charte de conduite), programme des cultes, présence et visiteurs. Blocage si un invité n’est pas validé ou refuse la diffusion |
| 07 | **Ministères et bénévoles** | Les 7 ministères du guide, plans d’action trimestriels, rapports d’activité mensuels, liste des bénévoles |
| 08 | **MERCI TV** | Les 7 programmes suggérés, grille de la semaine, émissions (conducteur, plateformes, équipe), **contrôle des 5 règles de diffusion** et validation obligatoires avant diffusion, protection des mineurs, archivage |
| 09 | **Archives** | Registre des documents selon le plan de classement du guide, copie numérique jointe, niveau de confidentialité |
| 09 | **Rapports** | Tableau de bord mensuel (12 indicateurs du guide, calculés automatiquement, cumul annuel), rapport financier mensuel, journal de toutes les opérations (audit) |
| 10 | **Calendrier de gestion** | Actions hebdomadaires, mensuelles, trimestrielles, semestrielles et annuelles à cocher (horodatées, nom de la personne) |
| — | **Paramètres** | Informations de l’Église, validation du manuel, utilisateurs et rôles, sauvegardes |

Toutes les listes s’exportent en **CSV (Excel)** et en **PDF** ; bordereaux, demandes de dépense, fiches prédicateurs, fiches membres, PV et rapports s’impriment au format du guide.

### Sécurité et confidentialité

- Un compte par personne, mots de passe chiffrés (PBKDF2-SHA256).
- **Rôles** : Administrateur, Responsable principal / Conseil, Secrétariat, Trésorerie, Département média, Responsable de ministère. Chaque rôle ne voit que ses modules.
- Verrouillage automatique après 30 minutes d’inactivité.
- Journal des opérations (qui a fait quoi, et quand).
- Sauvegarde automatique horaire (15 copies conservées) et export manuel de sauvegarde.

> Remarque : le fichier de données n’est pas chiffré sur le disque. Protégez l’ordinateur par une session Windows/macOS avec mot de passe et activez BitLocker (Windows) ou FileVault (Mac).

---

## Installation

### Windows (10 / 11, 64 bits)

1. Lancez `MERCI-TV-Gestion-Setup-1.0.0.exe`.
2. Si Windows affiche « Windows a protégé votre ordinateur », cliquez sur **Informations complémentaires → Exécuter quand même** (le logiciel n’est pas encore signé avec un certificat commercial).
3. Suivez l’assistant. Un raccourci est créé sur le bureau et dans le menu Démarrer.

Version sans installation : `MERCI-TV-Gestion-Portable-1.0.0.exe` (pratique sur clé USB).

### macOS (11 et plus)

1. Ouvrez le fichier `.dmg` qui correspond à votre Mac :
   - `…-mac-arm64.dmg` pour un Mac Apple Silicon (M1, M2, M3, M4) ;
   - `…-mac-x64.dmg` pour un Mac Intel.
2. Glissez **MERCI TV Gestion** dans le dossier **Applications**.
3. Au premier lancement : **clic droit sur l’application → Ouvrir → Ouvrir** (l’application n’est pas notariée par Apple).
   Si macOS indique que l’application est « endommagée », ouvrez le Terminal et tapez :
   `xattr -cr "/Applications/MERCI TV Gestion.app"`

### Premier démarrage

L’assistant demande le nom de l’Église et crée le **compte administrateur**. Ensuite, dans **Paramètres → Utilisateurs**, créez un compte pour chaque personne (secrétaire, trésorier, équipe média…) avec le rôle approprié.

### Où sont les données ?

- Windows : `%APPDATA%\MERCI TV Gestion\MERCI-TV-Gestion\`
- macOS : `~/Library/Application Support/MERCI TV Gestion/MERCI-TV-Gestion/`

Le menu **Fichier → Ouvrir le dossier des données** y mène directement. Pour changer d’ordinateur : *Paramètres → Sauvegardes → Exporter*, puis *Restaurer* sur le nouveau poste.

---

## Pour les développeurs

Prérequis : Node.js 22.

```bash
npm install          # installe Electron et electron-builder
npm start            # lance l'application en mode développement
npm test             # tests unitaires (stockage, mots de passe)
npm run test:e2e     # test de bout en bout (nécessite playwright)
```

### Construire les installateurs

```bash
npm run dist:win     # Windows : installateur NSIS + version portable (dans dist/)
npm run dist:mac     # macOS : .dmg et .zip Intel + Apple Silicon (à lancer sur un Mac)
```

Un Mac est nécessaire pour construire la version macOS. Le workflow GitHub Actions `.github/workflows/build.yml` construit automatiquement **les deux plateformes** :

- lancement manuel depuis l’onglet *Actions* → les installateurs sont dans les *Artifacts* ;
- ou en poussant une étiquette de version (`git tag v1.0.0 && git push --tags`) → une *Release* GitHub est créée avec tous les fichiers.

Pour une distribution sans avertissement de sécurité, ajoutez un certificat de signature (Windows : certificat Authenticode ; macOS : compte Apple Developer + notarisation) via les variables `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_ID` d’electron-builder.

### Structure

```
src/main/        processus principal Electron (fenêtre, fichiers, PDF, mots de passe)
src/renderer/    interface (HTML/CSS/JS, sans framework)
  js/seed.js       données du guide (instances, ministères, programmes, calendrier…)
  js/schemas.js    définition des registres, champs et règles de contrôle
  js/views.js      écrans (tableau de bord, budget, rapports, calendrier…)
  js/app.js        noyau : connexion, navigation, listes et formulaires
  js/print.js      modèles imprimables
build/           icône de l'application
test/            tests
```

---

*« Que tout se fasse avec bienséance et avec ordre. » — 1 Corinthiens 14:40*
