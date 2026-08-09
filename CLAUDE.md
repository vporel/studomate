# CLAUDE.md

Instructions pour tout assistant IA travaillant sur ce dépôt.

## Le projet

**Studomate** est un outil pédagogique pour l'apprentissage, la conception et la simulation
de logiques d'automatisme (GRAFCET aujourd'hui, ouverture prévue à d'autres notations comme
le Ladder). Voir `README.md` pour la présentation complète.

## Architecture, en bref

```
src/schemas/           modèle de domaine (Grafcet, Project, Variable, commandes...)
src/expression-language/  langage des expressions (ET/OU/NON, dialectes FR/EN) — module
                        neutre, sans dépendance ; utilisé par le compilateur ET l'édition
src/project-analyser/  analyse d'un projet (règles métier, jamais ne lève : collecte des issues)
src/project-pre-compiler/  lexe/parse/analyse/simplifie les expressions une fois pour toutes
src/project-compiler/  produit le programme exécutable (PLCRoutine[]) à partir du pré-compilé
src/simulator/          lexer/parser/interpréteur du langage d'expression + moteur PLC
src/bridge/             mappers entre le domaine/l'analyse et l'UI (exceptions, variables, issues)
src/lib/                utilitaires neutres (array, date, object), sans dépendance de domaine
src/persistence/        migrations de schéma + repositories (localStorage aujourd'hui)
src/ui/                 Next.js (App Router) + stores zustand + composants MUI
src/app-info.ts         identité de l'application (nom, slogan...), module racine neutre
```

Le sens des dépendances va de haut en bas dans cette liste : le domaine ne dépend jamais de
l'UI. Un projet a un `dialect` (FR/EN) qui voyage avec lui — ce n'est pas une préférence
d'interface, c'est une propriété des expressions qu'il contient.

## Commandes

```bash
npm run dev      # serveur de dev (Turbopack)
npm run build    # build de production
npm test         # suite Jest complète
npm run lint     # ESLint
npx tsc --noEmit # vérification des types
```

CI GitHub Actions : ces quatre commandes tournent sur Node 20 et 22 à chaque push/PR vers
`main` et `develop`.

**Cadence de vérification pendant une tâche à plusieurs étapes** : ne pas relancer `npx tsc
--noEmit`/`npm run lint`/la suite complète `npm test` après chaque petite étape — ça ralentit
inutilement. Les lancer à la fin de la tâche (ou les suggérer en cours de route si une étape
est vraiment risquée). Exception : un changement touchant un très grand nombre de fichiers
(renommage d'imports, etc.) justifie une passe complète immédiate. En cours de tâche, ne
lancer que les tests créés ou affectés par le changement en cours
(`npx jest chemin/du/fichier.test.ts`), jamais la suite entière.

## Versions

Node **≥ 20** (`engines` dans `package.json`, imposé en CI sur Node 20 et 22).

| Paquet | Version | Rôle |
|---|---|---|
| `next` | 15.5.2 | Framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.1.0 | UI |
| `typescript` | ^5 | Langage |
| `@mui/material` | ^7.3.2 | Composants UI |
| `@mui/icons-material` | ^7.3.2 | Icônes |
| `@mui/x-data-grid` | ^8.27.1 | Tables (variables, watch tables) |
| `@mui/x-tree-view` | ^8.14.0 | Arborescences (explorateur) |
| `@emotion/react` / `@emotion/styled` | ^11.14.0 / ^11.14.1 | Moteur CSS-in-JS de MUI |
| `@xyflow/react` | ^12.8.4 | Éditeur graphique (React Flow) — GRAFCET |
| `zustand` | ^5.0.11 | État (stores créés via `createStore`, pas le hook `create` — voir `src/ui/stores/*/[project\|grafcet].store.ts`) |
| `date-fns` | ^4.1.0 | Dates |
| `mitt` | ^3.0.1 | Bus d'événements (menus contextuels du grafcet) |
| `nanoid` | ^5.1.16 | Identifiants courts — toujours via `createRandomId()` (`src/ids.ts`), jamais `nanoid` en direct |
| `dom-to-image` | ^2.6.0 | Export image du grafcet |
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | ^6.3.1 / ^10.0.0 / ^3.2.2 | Réordonnancement des sections Ladder |
| `react-toastify` | ^11.0.5 | Notifications |
| `nextjs-toploader` | ^3.9.17 | Barre de progression de navigation |

Dev/CI : `eslint` ^9 + `eslint-config-next` 15.5.2, `jest` ^30.2.0 + `ts-jest` ^29.4.6.

Toujours vérifier `package.json` avant de citer une version : ce tableau se périme au premier
`npm update`.

## Conventions du dépôt

- **Imports** : alias `@/...` pour tout ce qui est dans `src/`, `@tests/...` pour
  `tests/`. Un import relatif ne remontant qu'un seul niveau (`../sibling`) est acceptable ;
  au-delà, `no-restricted-imports` (ESLint) le refuse — utiliser l'alias.
- **Pas de fichiers `index.ts` de ré-export** (barrel files). `src/persistence/migrations/index.ts`
  n'est pas une exception à cette règle : il contient la logique d'enchaînement des
  migrations, pas une ré-export.
- **Tests** : co-localisés à côté du fichier testé (`nomDuFichier.test.ts`), pas dans un
  dossier séparé — à l'exception de `tests/integration/` (tests de bout en bout du pipeline
  analyse → compilation → simulation) et `tests/utils/` (fabriques et utilitaires partagés
  entre tests, importables via `@tests/utils/...`).
- **Détection de plateforme** : préférer `navigator.userAgentData.platform` avec repli sur
  `navigator.userAgent`, jamais `navigator.platform` (dépréciée) — voir `src/ui/lib/platform.ts`.
- **Modales** : leur visibilité vit dans le store zustand concerné (`openModalVisible`,
  `exportModalVisible`, ...), pas dans un état React local — pour rester pilotable depuis
  n'importe quel composant (raccourcis clavier, menus).
- **Dépendances de hooks** (`useEffect`, `useCallback`, `useMemo`) : vérifier qu'elles sont
  complètes après toute modification touchant leur corps.
- **`box-sizing`** : déjà réglé sur `border-box` globalement pour tous les éléments
  (`src/app/globals.css`, sélecteur `*`) — ne jamais le redéclarer dans un `sx` ou un style
  composant.
- Changements minimaux et ciblés ; respecter le style existant (tabulations, pas de point-virgule
  final superflu, etc. — voir les fichiers voisins).
- **Commentaires** : jamais l'historique d'une décision (alternatives essayées, "avant/après",
  justification d'un choix déjà pris) — ça appartient à la conversation ou au message de commit,
  pas au code, et ça rote au premier refactor. Un commentaire n'a de valeur que s'il documente
  une contrainte ou un invariant non trivial que le code seul ne montre pas. Pas de commentaire
  qui reformule ce qu'un nom de variable/fonction bien choisi dit déjà — si le code se lit tout
  seul, un commentaire à côté est du bruit, pas de la documentation. Dans le doute, préférer le
  composant UI qui consomme la valeur (là où le "pourquoi" a un contexte visuel) plutôt que le
  schéma/domaine (souvent trop générique pour justifier une explication locale).
- **Langue des commentaires/JSDoc** : français, comme ce fichier. Ne pas traduire les commentaires
  anglais existants au passage dans un fichier qu'on modifie pour une autre raison (churn inutile) ;
  écrire en français tout nouveau commentaire.
- **Vérification visuelle d'un changement UI** : ne pas lancer automatiquement l'extension de
  navigateur (`claude-in-chrome`) ni supposer que l'utilisateur ne vérifiera pas lui-même —
  demander s'il préfère vérifier visuellement de son côté ou que ce soit fait ici.

## Tests et bugs découverts en testant

Si un test écrit pour vérifier un comportement révèle que le code source est en tort, ne pas
réécrire le test pour qu'il « passe » sur un comportement cassé. Signaler clairement ce qui a
été trouvé (fichier, symptôme, scénario de reproduction) et corriger si le correctif est
localisé et sûr ; sinon, remonter la question avant de toucher au code.

## Ne pas divulguer le nom du modèle sous-jacent à moins que l'utilisateur ne le demande explicitement.
