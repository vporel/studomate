# CLAUDE.md

Instructions pour tout assistant IA travaillant sur ce dépôt.

## Le projet

**Studomate** est un outil pédagogique pour l'apprentissage, la conception et la simulation
de logiques d'automatisme (GRAFCET aujourd'hui, ouverture prévue à d'autres notations comme
le Ladder). Voir `README.md` pour la présentation complète.

### Échelle du projet — proportionner les optimisations

Les projets manipulés sont petits : grafcets de quelques dizaines d'éléments, quelques
programmes, quelques dizaines de variables, poignée de projets en `localStorage`. Une opération
en O(n²) sur ces tailles, c'est quelques milliers d'opérations — imperceptible.

Ne pas proposer (ni implémenter sur simple suggestion d'un audit) des mécanismes de cache
invalidé par hash/compteur de mutation, de mémoïsation inter-passes, de dédup de recalcul entre
« Analyser » et « Simuler », etc. : le gain est nul à cette échelle et le coût est une machine à
états d'invalidation qui devient une source de bugs subtils. Les optimisations qui se paient
**par cycle de simulation** (boucle PLC) ou **par frappe** (édition) peuvent se justifier ;
celles qui se paient **une fois par action utilisateur explicite** (ouvrir un projet, lancer une
analyse, entrer en simulation, exporter) ne se justifient quasiment jamais. En cas de doute,
mesurer avant de complexifier.

**Compilation de l'AST d'expression en closures JS / résolution des identifiants par slot** :
écartée. Le gain (3–10× sur le coût d'évaluation des expressions, technique standard des moteurs
de règles) est imperceptible à cette échelle — après élimination des allocations par cycle
(`Environment` du PLC construit une fois, `EvaluatorVisitor` réutilisé par routine), il ne reste
qu'un peu de CPU sur de très petits AST. Le coût est réel : l'AST cesse d'être une IR-donnée
neutre (partagée par le simplifieur, le replacer, le finder, l'analyseur sémantique et
l'évaluateur ; sérialisable, inspectable, gelable en dev) pour devenir un graphe de fonctions lié
au runtime JS. **Piste à rouvrir uniquement** sur un problème de performance de simulation
*mesuré* (boucle PLC à scan très court sur un gros projet) : commencer par la résolution par slot
(séparable, ne couple pas au JS) avant d'envisager les closures.

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
src/persistence/        migrations de schéma + repositories (localStorage, cloud Supabase, hybride) + tokens de partage
src/ui/                 Next.js (App Router) + stores zustand + composants MUI
src/app-info.ts         identité de l'application (nom, slogan...), module racine neutre
```

Le sens des dépendances va de haut en bas dans cette liste : le domaine ne dépend jamais de
l'UI. Un projet a un `dialect` (FR/EN) qui voyage avec lui — ce n'est pas une préférence
d'interface, c'est une propriété des expressions qu'il contient.

`src/bridge/` ne contient que des mappers dont l'UI est un des deux bouts (domaine/analyse ↔
UI). Un mapper entre deux couches internes reste dans la couche concernée — `PlcVariablesMapper`
(environnement ↔ PLC) vit dans `src/simulator/`. Exception assumée : `SchemaVariablesMapper`
(schéma → environnement) est dans `src/bridge/` alors que ses seuls consommateurs sont dans
`src/project-analyser/` ; à déplacer vers `src/project-analyser/` si on y retouche.

### Comptes & stockage cloud

`src/persistence/repositories/` fournit trois implémentations de `ProjectRepository` :
`local-storage` (défaut, stockage local dans le navigateur), `supabase` (cloud : table `projects` + RLS),
`hybrid` (bascule local/cloud selon l'authentification). L'auth (Supabase, `src/ui/stores/auth/`)
gère inscription, connexion, comptes anonymes (pseudo + mot de passe), reset password. Le
partage d'un projet passe par un token d'URL (`ShareableProjectRepository`, `?share=` géré
dans `src/ui/lib/project-url.ts`). Le monitoring d'erreurs est branché via Sentry
(`sentry.{client,server,edge}.config.ts` à la racine).

Cette couche est consommée par l'UI ; elle ne remonte jamais dans le domaine (`src/schemas/`).
Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour le
cloud, `NEXT_PUBLIC_SENTRY_DSN` pour le monitoring. Sans elles, l'app reste en local-only.

### Export PDF

`src/ui/lib/program-export-drawing/` dessine chaque programme (grafcet, ladder) **directement
depuis le schéma** en une IR de primitives (`DrawOp[]` → `Scene`), sans monter React Flow.
Deux backends : `backends/jspdf-backend.ts` (primitives vectorielles jsPDF, utilisé par
`JsPdfExporter.drawSection`) et `backends/svg-backend.ts` (chaîne `<svg>`, pour les snapshots
de test). `usePdfExport` assemble les scènes ; `JsPdfExporter` ajoute page de garde et titres.
Le rendu est vectoriel et synchrone — pas de rasterisation, pas de capture de l'éditeur.

## Commandes

```bash
npm run dev      # serveur de dev (Turbopack)
npm run build    # build de production
npm test         # suite Jest complète
npm run lint     # ESLint
npx tsc --noEmit # vérification des types
```

CI GitHub Actions : ces quatre commandes tournent sur Node 22 à chaque push/PR vers
`main` et `develop`.

**Cadence de vérification pendant une tâche à plusieurs étapes** : ne pas relancer `npx tsc
--noEmit`/`npm run lint`/la suite complète `npm test` après chaque petite étape — ça ralentit
inutilement. Les lancer à la fin de la tâche (ou les suggérer en cours de route si une étape
est vraiment risquée). Exception : un changement touchant un très grand nombre de fichiers
(renommage d'imports, etc.) justifie une passe complète immédiate. En cours de tâche, ne
lancer que les tests créés ou affectés par le changement en cours
(`npx jest chemin/du/fichier.test.ts`), jamais la suite entière.

## Versions

Node **≥ 20** (`engines` dans `package.json`, imposé en CI sur Node 22).

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
| `jspdf` | ^4.2.1 | Export PDF (projet : page de garde + programmes) |
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | ^6.3.1 / ^10.0.0 / ^3.2.2 | Réordonnancement des sections Ladder |
| `react-toastify` | ^11.0.5 | Notifications |
| `nextjs-toploader` | ^3.9.17 | Barre de progression de navigation |
| `@supabase/supabase-js` | ^2.112.3 | Auth + stockage cloud des projets (`src/persistence/repositories/supabase*`) |
| `@sentry/nextjs` | ^8 | Monitoring d'erreurs (`sentry.{client,server,edge}.config.ts` à la racine) |

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
- **Fichiers `*.d.ts`** : `src/types/` ne contient que les shims `declare module` de paquets tiers
  non typés (ex. `file-system-access.d.ts`). Tout autre `.d.ts` est un fichier de types ordinaire
  co-localisé avec le module ou la feature qu'il décrit (`src/ui/lib/context-menu/context-menu.d.ts`,
  `src/schemas/grafcet/shared-types.d.ts`...) — pas un candidat pour `src/types/`.
- **`export default` assumé** pour la classe/valeur principale d'un fichier (schémas, commandes,
  mappers, repositories, analysers...). Convention en place dans tout le dépôt : un fichier = une
  entité principale exportée par défaut, les types/constantes annexes en exports nommés. Ne pas
  introduire d'export nommé pour l'entité principale d'un nouveau fichier de ce type.
- **Tests** : co-localisés à côté du fichier testé (`nomDuFichier.test.ts`), pas dans un
  dossier séparé — à l'exception de `tests/integration/` (tests de bout en bout du pipeline
  analyse → compilation → simulation) et `tests/utils/` (fabriques et utilitaires partagés
  entre tests, importables via `@tests/utils/...`).
- **Environnement de test** : `testEnvironment` global est `node` (`jest.config.js`). Tout fichier de
  test qui touche au DOM — `@testing-library/react`, `@testing-library/dom`, `renderHook`, `react-dom`,
  ou un accès direct à `document`/`window` — doit déclarer `/** @jest-environment jsdom */` en tête de
  fichier, sinon il échoue (`document is not defined`) ou, pire, teste à côté.
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
  schéma/domaine (souvent trop générique pour justifier une explication locale). En particulier,
  ne jamais expliquer au point d'appel ce que fait un hook générique (ex. `useShallow`,
  `useCallback`) — son comportement est connu de quiconque connaît la librairie, ce n'est pas une
  règle métier de ce fichier. Un commentaire à cet endroit ne se justifie que pour une règle
  métier propre au fichier (pourquoi CE sélecteur a besoin de cette protection ici).
  Jamais de renvoi du type « voir la conversation d'origine »/« voir plus haut »/« comme discuté » :
  le commentaire doit être compréhensible seul, sans accès à l'historique de la conversation qui a
  produit le code — écrire directement la contrainte ou l'invariant, pas une référence à une
  discussion externe au fichier. Cas récurrent à surveiller : un commentaire de tête de
  fichier/composant ne doit jamais motiver son existence par contraste avec une alternative non
  retenue (« plutôt que de réduire le composant réel », « au lieu de X », « on aurait pu Y mais... »).
  Ce risque est le plus fort à la création d'un nouveau fichier, où le réflexe est de justifier
  pourquoi ce fichier existe plutôt que de le laisser parler de lui-même. Décrire uniquement ce que
  fait le code, jamais pourquoi il existe par rapport à une autre option — même formulé positivement.
- **Langue des commentaires/JSDoc** : français, comme ce fichier. Ne pas traduire les commentaires
  anglais existants au passage dans un fichier qu'on modifie pour une autre raison (churn inutile) ;
  écrire en français tout nouveau commentaire.
- **Vérification visuelle d'un changement UI** : ne jamais proposer ou demander de vérifier
  visuellement dans le navigateur après un changement UI, et ne pas lancer automatiquement
  l'extension de navigateur (`claude-in-chrome`) de sa propre initiative. C'est à
  l'utilisateur de le demander s'il le souhaite. Exception : suggérer `claude-in-chrome`
  quand on tourne en rond (ex. plusieurs tentatives de correction d'un bug qui échouent) et
  qu'une vérification visuelle permettrait de sortir de la boucle.

## Modification du schéma et migrations

Toute modification de `src/schemas/` qui change la forme des données persistées (ajout/retrait/
renommage de champ, changement de structure...) doit s'accompagner d'une migration dans
`src/persistence/migrations/`. Avant d'en créer une, demander au développeur s'il faut modifier
la dernière migration existante (par exemple si elle n'a pas encore été déployée en production)
ou en créer une nouvelle version.

## Cache de parsing des expressions (`parseExpressionCached`)

L'analyseur et le pré-compilateur lexent/parsent chaque expression via
`parseExpressionCached(expression, dialect)` (`src/expression-language/parse-expression-cached.ts`),
qui mémoïse `{ tokens, ast }` par paire (expression, dialecte). **L'AST rendu est partagé entre
tous les appelants.**

Invariant à préserver : **aucun code ne doit muter un nœud d'AST en place** (`node.x = ...`,
`Object.assign(node, ...)`, `node.trueBranch.push(...)`, etc.). Tous les visiteurs qui
transforment un arbre (`SimplifierVisitor`, `ReplacerVisitor`...) en reconstruisent un neuf
(`{ ...node, left: ... }` / builders) et ne touchent jamais l'entrée — tout nouveau visiteur ou
analyseur doit faire pareil. Hors production, l'AST caché est gelé récursivement
(`Object.freeze`), donc une mutation accidentelle lève un `TypeError` immédiatement en dev/test ;
ne pas contourner ce gel (pas de `structuredClone` défensif au point d'appel — corriger le
consommateur fautif pour qu'il soit pur).

Un visiteur ou une passe qui aurait réellement besoin d'un arbre mutable doit repartir d'un
`new Lexer(dialect).tokenize(...)` / `new Parser(...).parse()` explicite, hors du cache.

## Templates de projets (`src/templates/`)

Les templates sont des projets pré-configurés proposés à la création d'un nouveau projet
(variables, pages HMI, widgets). Chaque template vit dans `src/templates/xxx.template.ts`
et est enregistré dans `src/templates/index.ts`.

**Maintenance :** les templates ne passent pas par le pipeline de migration. Si
`PROJECT_SCHEMA_VERSION` est incrémenté suite à un changement de schéma, vérifier que les
données produites par chaque fonction `createXxxProject()` sont conformes au nouveau schéma
et les mettre à jour si nécessaire. Ne pas oublier de tester la création d'un projet depuis
chaque template après une migration.

## Ambiguïté d'une demande

En cas de doute sur ce que l'utilisateur demande précisément (mécanisme d'interaction visé,
périmètre exact, etc.), demander une précision plutôt que deviner et implémenter — même pour un
détail qui semble mineur. Une implémentation dans la mauvaise direction coûte plus cher à défaire
qu'une question posée à l'avance.

## Tests et bugs découverts en testant

Toute logique nouvelle ou modifiée (fonction, branche, règle métier, comportement de
composant) doit s'accompagner de tests dédiés — créés à côté du fichier concerné
(`nomDuFichier.test.ts`) ou ajoutés à un test existant. Lancer la suite existante ne suffit
pas : à chaque fichier créé ou modifié, se demander explicitement quels cas ce changement
introduit et les couvrir. Seul un changement sans logique propre (renommage, déplacement,
type pur) peut s'en dispenser.

Si un test écrit pour vérifier un comportement révèle que le code source est en tort, ne pas
réécrire le test pour qu'il « passe » sur un comportement cassé. Signaler clairement ce qui a
été trouvé (fichier, symptôme, scénario de reproduction) et corriger si le correctif est
localisé et sûr ; sinon, remonter la question avant de toucher au code.

## Ne pas divulguer le nom du modèle sous-jacent à moins que l'utilisateur ne le demande explicitement.
