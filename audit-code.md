# Audit d'architecture — Studomate

_Réalisé le 4 août 2026 sur la branche `main` (commit `322c72e`)._
_Périmètre : 352 fichiers source (~22 000 lignes), hors tests et `node_modules`._

## 1. Défauts d'architecture majeurs

## 2. Bugs de conception découlant de l'architecture

---

## 3. Performance

### 3.1 Rendu global à chaque cycle PLC (10 Hz par défaut)

`simulation.manager.ts:171-185`, `onCycleEnd` : reconstruction d'un objet `simulationVariablesStates` complet et `setStoreState` à **chaque cycle**, soit toutes les 100 ms (`plcConfig.scanTimeMs`). Tous les composants abonnés se réévaluent, y compris ceux dont la variable n'a pas bougé.

> L'instanciation d'un `EvaluatorVisitor` **par expression et par cycle** a été corrigée avec §2.6 : `ExpressionsWatcher` n'en crée plus qu'un par cycle, partagé par toutes les expressions. La reconstruction de l'`Environment` à chaque tick demeure — elle est inhérente au fait que les valeurs changent.

### 3.2 Clonage profond à chaque déplacement de nœud

`workflow.manager.ts:59` : `structuredClone(this.getStoreState().nodes)` à chaque événement `onNodesChange`, c'est-à-dire à chaque frame pendant un glisser-déposer, sur **tous** les nœuds du grafcet.

### 3.3 Comparaison profonde à chaque changement de store

`GrafcetContext.tsx:39-42` s'abonne à _tout_ le store et appelle `updateGrafcetData` → `deepObjectsComparison(project.grafcets[id], grafcet)` (`grafcets.manager.ts:92`). Une simple sélection de nœud déclenche une comparaison récursive du grafcet entier.

### 3.4 Recherches linéaires répétées

`Grafcet.getElementById`, `ViewManager.getNode` / `getEdge` (`view.manager.ts:66`, `:74`) : `find` linéaire systématique, sans index. Acceptable sur de petits schémas, pénalisant à mesure que les grafcets grossissent.

> `Grafcet.getElementById` ne concatène plus les dix collections à chaque appel (corrigé avec §1.6), mais reste en O(n). Un index par identifiant serait la suite logique — il demande de traiter l'invalidation, les éléments étant aussi modifiés directement.

---

## 4. Qualité, typage, outillage

### 4.3 Aucun test sur `src/ui`

Les tests se concentrent dans `schemas`, `simulator`, `project-*`. `src/ui` n'en comptait **aucun** ; les factories en ont désormais 35 et tournent sans React Flow. Restent non couverts les **managers** (`WorkflowManager`, `CommandsStackManager`, `ViewManager`) et le cycle undo/redo complet, qui dépendent du store zustand.

Cause technique restante : `jest.config.js` fixe `testEnvironment: "node"`, ce qui interdit tout test de composant ou de hook. Il faudrait un projet Jest additionnel en `jsdom` (+ `@testing-library/react`). Les managers, eux, sont testables en `node` — ils ne dépendent que du store.

### 4.4 Typage relâché

- **100 occurrences** de `any` / `as any` hors tests, dans 54 fichiers.
- La règle `@typescript-eslint/no-explicit-any` est **désactivée globalement** (`eslint.config.mjs:24`), ce qui empêche toute reprise progressive.
- **80 assertions non-nulles** (`!.`, `!)`), très concentrées dans les stores (`state.nodes!`, `state.edges!`, `rfInstance!`). Ces champs ne sont pourtant _pas_ optionnels dans `GrafcetStoreState` — les `!` sont donc du bruit hérité, et masquent les rares cas où la valeur peut réellement manquer.
- Points de perte de type structurants : `elementsSchemasClasses: Record<ElementType, any>` (`grafcet.schema.ts:27`) et `nodes: [...nodes!, ...command.payload]` (`commands-stack.manager.ts:89`).

### 4.5 Code mort et incohérences mineures

| Emplacement               | Problème                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `grafcet.schema.ts:66`    | `getStepsActivationConditions()` retourne `{}`, jamais appelée                                                                    |
| `grafcet.schema.ts:70`    | `validate()` retourne `null`, jamais appelée                                                                                      |
| `project.store.ts:338`    | `grafcetsStoresActions: {}` — propriété absente de l'interface `ProjectStoreState`                                                |
| `project.store.ts:65`     | `saveProject` typée `Promise<boolean \| null>` mais ne retourne jamais `null`                                                     |
| `plc.ts:136`              | `internalTasks()` vide                                                                                                            |
| `tsconfig.json:include`   | `"src/components/grafcet/nodes/TransitionNodetsx"` — chemin inexistant (point manquant, et le dossier est `src/ui/components`)    |
| `workflow.manager.ts:63`  | `node.type.includes("junction")` — détection par sous-chaîne alors que `JUNCTION_TYPES` existe et est utilisé correctement `:295` |
| `view.manager.ts:157-162` | `setTimeout` sans nettoyage : déclenche un `set` après démontage éventuel du store                                                |

### 4.6 Cohérence des imports

66 imports relatifs profonds (`../../../`) coexistent avec 384 imports par alias `@/`, **parfois dans le même fichier** — ex. `action.pre-compiler.ts:1-15`, où `@/schemas/...` et `../../../schemas/...` pointent vers le même dossier. Une règle `no-restricted-imports` réglerait le sujet définitivement.

### 4.7 Thème contourné en dur

Malgré un `ThemeContext` MUI, plusieurs couleurs sont écrites en dur : `background: "rgb(235, 235, 235)"` (`GrafcetFlow.tsx:46`, `AppStartup.tsx:38`), `stroke: "black"`, `bgColor="white"` (`:63`, `:129`), `backgroundColor: "white"`. C'est la source structurelle du type de bug corrigé dans `fece7dc`.

### 4.8 Next.js utilisé comme un simple bundler

124 fichiers portent `"use client"` sur 116 `.tsx` : l'application est **intégralement cliente**, avec persistance `localStorage`. Aucun rendu serveur n'est exploité, et `output: "standalone"` impose au `build` un contournement manuel :

```json
"build": "next build --turbopack && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static"
```

Ces `cp -r` ne fonctionnent pas sous Windows, ce qui pénalise les contributeurs externes.

Ce n'est pas un défaut en soi — le choix est défendable pour l'écosystème et le routage —, mais un export statique (`output: "export"`) simplifierait le build et le déploiement pour un usage 100 % client. À arbitrer selon les intentions serveur futures (l'item « comptes utilisateurs & sauvegarde cloud » de la roadmap peut justifier de garder Next.js tel quel).

## Différé — à traiter une fois l'audit terminé

Ces points ne sont pas des constats à instruire, mais des suites décidées de chantiers déjà menés.

### Retirer l'affichage optimiste de `WorkflowManager` (suite de §1.1)

Depuis que `CommandsStackManager.executeOperation` recalcule la vue depuis le grafcet, les patchs manuels que `WorkflowManager` applique **avant** d'exécuter les commandes sont redondants : `viewManager.addNodesAndEdges`, `removeNodesAndEdges`, et `getNodeUpdater`.

Les retirer terminerait la suppression de la réplication manuelle et réduirait `ViewManager` à ses responsabilités réelles : sélection, surlignage, zoom.

> ⚠️ **Ne peut être validé que par un essai manuel dans l'application.** Les tests couvrent la fonction de recalcul (`NodesFactory.syncNodes`, `EdgesFactory.syncEdges`), pas l'enchaînement des interactions React Flow. À vérifier : création d'éléments, connexion, suppression, copier-coller, glisser-déposer, undo/redo.

---

## Ce qui fonctionne bien — à préserver

Pour équilibrer : plusieurs choix sont nettement au-dessus de la moyenne pour un projet de cette taille.

- **La chaîne de compilation** (`lexer → parser → semantic-analyser → simplifier → evaluator`) est un travail sérieux : séparation nette, visiteurs, hiérarchie d'exceptions dédiée et granulaire (28 classes d'exception), bien testée.
- **Le modèle PLC** (`simulator/core/plc/plc.ts`) respecte fidèlement le cycle automate réel (image d'entrées → programme → image de sorties), avec des copies défensives (`getVariablesSnapshot`).
- **Le pipeline analyse → pré-compilation → compilation** est correctement étagé, avec une règle explicite et respectée : l'analyse ne lève jamais, elle collecte.
- **Le pattern Command** (`CommandsStack<T>`, générique, avec limite de pile et exécution partielle) est propre — c'est sa réplication manuelle côté vue qui pose problème, pas le pattern.
- **Les builders de test** (`GrafcetBuilder`, `StepBuilder`, …) rendent les 719 tests passants lisibles.
- **Le registre `ElementAnalyserFactory`** est le bon modèle d'extensibilité, à généraliser au reste.
- La documentation JSDoc est présente là où elle compte (intentions, invariants), pas en paraphrase du code.
