---
name: add-hmi-widget
description: Ajouter un nouveau type de widget à l'éditeur HMI de Studomate. Questions préalables obligatoires puis checklist courte (définition domaine, composant de rendu, entrée UI satellite avec descripteurs de champs déclaratifs, migration si besoin). La palette, le panneau propriétés, les animations, les événements et le manuel sont dérivés — plus de tables parallèles à éditer.
---

# Skill : ajout d'un nouveau widget HMI

Ce skill s'applique dès qu'une tâche demande d'ajouter un nouveau type de widget à l'éditeur HMI.

L'architecture est **table-driven** : une définition domaine (`HMI_WIDGET_DEFINITIONS`, React-free)
et une table satellite UI (`HMI_WIDGET_UI`, composant + aperçu + descripteurs de champs). Le
panneau Propriétés, la palette, les panneaux Animations/Événements et le manuel lisent ces deux
tables — ils n'ont **pas** à être édités pour un widget simple.

## Avant de commencer — questions obligatoires

Ne pas implémenter avant d'avoir des réponses claires. Si la demande ne les précise pas, les poser :

1. **Nature du widget** — `interactive` (lié à une variable) ou `shape` (purement visuelle, sans variable) ?
2. **Variable liée** — si interactif : quel(s) type(s) (`BOOL`, `INT`, `REAL`…) ? Le widget **écrit**-il dans la variable (`writesToVariable: true`, ex. interrupteur) ou la **lit**-il seulement (ex. voyant) ?
3. **Emplacement dans la palette** — groupe interactif ou formes ? Plusieurs variantes du même type (comme Cercle/Ellipse) ?
4. **Propriétés configurables** — quelles options dans le panneau Propriétés, et de quel type (texte, couleur, nombre, select, case à cocher) ? Un champ a-t-il un effet de bord (ex. l'orientation de la jauge échange largeur/hauteur) ?
5. **Style animable** — des propriétés visuelles pilotables par variable en simulation (couleur, texte…) ?
6. **Événements** — le widget déclenche-t-il des actions (ex. `onPress`) en simulation ?
7. **Impact sur le schéma persisté** — `defaultData` introduit-il un champ que des projets existants n'ont pas ? Si oui, demander si la dernière migration peut être amendée ou s'il faut une nouvelle version (voir CLAUDE.md).

---

## Checklist d'implémentation

### 1. Définition domaine — `src/schemas/hmi/hmi-widget.schema.ts`

- [ ] **Union `HmiWidgetType`** — ajouter `| "mon-widget"`. Alimente tous les `Record<HmiWidgetType, …>` exhaustifs ; TS signale les points non couverts.
- [ ] **Type `MonWidgetData`** — étend `HmiWidgetBaseData` si variable liée, ne l'étend pas si forme pure. Déclarer `animations?: HmiWidgetAnimations<"prop1" | …>` si style animable, `events?: HmiWidgetEvents<"onNom">` si événements.
- [ ] **Classe `class MonWidgetWidget extends HmiWidgetBase<MonWidgetData>`** avec `readonly type = "mon-widget" as const` (indispensable au rétrécissement d'union).
- [ ] **Union `HmiWidget`** — ajouter `| MonWidgetWidget`.
- [ ] **`HMI_WIDGET_DEFINITIONS`** — une entrée : `kind`, `writesToVariable`, `defaultData` (le `data` initial complet, `label` inclus pour un widget interactif), `label`, `defaultSize`, `minSize`, `aspectRatio?`, `variableTypes`. `Record` exhaustif.
- [ ] **`WIDGET_CONSTRUCTORS`** — une ligne `"mon-widget": MonWidgetWidget`. `Record` exhaustif.
- [ ] *(Pas de `generateDefaultData` ni `createInstance` à éditer — ils sont pilotés par les tables.)*

### 2. Composant de rendu — nouveau `src/ui/components/hmi/widgets/MonWidget.tsx`

- [ ] Signature `HmiWidgetComponentProps<MonWidgetData>`. Props : `data`, `value`, `selected`, `hideLabel`, `onClick`, `onValueChange`, `onTrigger`.
- [ ] `onValueChange` / `onTrigger` sont `undefined` en conception — ne jamais les appeler sans garde.
- [ ] Nom d'événement passé à `onTrigger?.("nom")` = exactement la clé déclarée dans l'entrée `events` (étape 3).

### 3. Entrée UI satellite — `src/ui/components/hmi/widgets/hmi-widget-ui.ts`

Une entrée dans `HMI_WIDGET_UI` (`Record<HmiWidgetType, …>` exhaustif) :

- [ ] `component` : le composant de l'étape 2 (+ import).
- [ ] `previewWidth`, `previewValue` (`false`/`0`/valeur de démo), `paletteOrder` (rang dans son groupe).
- [ ] `manualDescription` : la phrase du manuel (`"Mon widget — … Options : …"`).
- [ ] `toolSymbol?` : symbole SVG compact si le rendu réel est illisible en miniature.
- [ ] `events` : `[]` ou `[{ name: "onNom", label: "Libellé" }]`.
- [ ] `animatableStyleProps` : `[]` ou `[{ name, label, inputType: "color" | "text", staticValue: (data) => … }]`.
- [ ] `propertyFields` : descripteurs déclaratifs des champs du panneau Propriétés. Chaque champ porte `label` + `get: (data) => …` / `set: (data, value) => ({ …data })` **typés** sur `MonWidgetData` (TS casse sur un mauvais champ). Variantes : `text` (`multiline?`), `color`, `number` (`min?`/`max?`), `select` (`options`, `widgetPatch?` pour un effet de bord), `checkbox`.

### 4. Palette — rien à faire

`HMI_WIDGET_TOOLS` / `HMI_SHAPE_TOOLS` (`src/ui/components/hmi/toolbar/hmi-widget-tools.ts`) sont
**dérivés** de `kind` + `paletteOrder`. À éditer uniquement pour **plusieurs variantes** du même
type dans la palette (modèle : les deux entrées `ellipse` pour Cercle/Ellipse).

### 5. Nouveau type d'action — `src/schemas/hmi/hmi-widget.schema.ts` + `hmi-action.executor.ts`

Uniquement si le widget introduit un **nouveau type d'action** (rare, orthogonal aux widgets) :
ajouter à l'union `HmiAction` puis un `case` dans `executeHmiAction` (switch exhaustif).

### 6. Migration — `src/persistence/migrations/`

Uniquement si `defaultData` introduit un champ absent des projets existants :

- [ ] Demander : amender la dernière migration ou nouvelle version ?
- [ ] Créer `vN-to-vN+1.ts`, l'enregistrer dans `migrations/index.ts`, incrémenter `PROJECT_SCHEMA_VERSION`.

### 7. Manuel — rien à faire

`HmiSection.tsx` est généré depuis `HMI_WIDGET_DEFINITIONS` + `manualDescription`.

### 8. Tests

- [ ] `hmi-widget.schema.test.ts` : `generateDefaultData` / `create` pour le nouveau type ; cohérence `kind` / `writesToVariable` / `defaultData`.
- [ ] `hmi-widget-ui.test.ts` : couvert automatiquement (entrée par type, aller-retour `get`/`set`, immutabilité de `set`) — ajouter un cas dédié pour un `widgetPatch` ou un `staticValue` non trivial.
- [ ] Logique conditionnelle du composant de rendu (interaction variable, déclenchement d'événement).
- [ ] Migration, si créée (round-trip).

---

## Invariants globaux

- `readonly type = "mon-widget" as const` sur la classe — sans `as const`, plus de rétrécissement d'union.
- `Record<HmiWidgetType, …>` exhaustifs : `HMI_WIDGET_DEFINITIONS`, `WIDGET_CONSTRUCTORS`, `HMI_WIDGET_UI`. Ne jamais masquer l'erreur d'une clé manquante avec un cast.
- Les descripteurs `propertyFields` reconstruisent `data` (`{ ...data, … }`), ne le mutent jamais.
- Nom d'événement dans `events` = chaîne passée à `onTrigger` — contrat par convention, non vérifié par TS.
- `onValueChange` / `onTrigger` `undefined` en conception.
