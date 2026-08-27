---
name: add-hmi-widget
description: Ajouter un nouveau type de widget à l'éditeur HMI de Studomate. Questions préalables obligatoires puis checklist d'implémentation ordonnée par dépendance (schéma de domaine, composant de rendu, registres, palette toolbar, panneau propriétés, animations, événements, migration, manuel).
---

# Skill : ajout d'un nouveau widget HMI

Ce skill s'applique dès qu'une tâche demande d'ajouter un nouveau type de widget à l'éditeur HMI de Studomate.

## Avant de commencer — questions obligatoires

Ne pas implémenter avant d'avoir des réponses claires sur les points suivants. Si la demande ne les précise pas, les poser explicitement :

1. **Nature du widget** — interactif (lié à une variable, lit ou écrit une valeur) ou forme pure (purement visuelle, sans variable) ?
2. **Variable liée** — si interactif : quel(s) type(s) de variable accepte-t-il (`BOOL`, `INT`, `REAL`…) ? Le widget écrit-il dans la variable (interrupteur) ou la lit-il seulement (voyant) ?
3. **Emplacement dans la palette** — doit-il apparaître dans le groupe "widgets interactifs" ou "formes" de la barre d'outils ? Plusieurs variantes dans la palette (comme Cercle/Ellipse) ?
4. **Propriétés configurables** — quelles options l'utilisateur règle-t-il dans le panneau Propriétés ?
5. **Style animable** — certaines propriétés visuelles doivent-elles être pilotables par une variable en simulation (couleur, texte…) ?
6. **Événements** — le widget doit-il déclencher des actions (ex. "onPress") en simulation ?
7. **Impact sur le schéma persisté** — le nouveau type ajoute-t-il des champs dans `data` qui changent la forme des données stockées dans le localStorage ? Si oui, demander si la dernière migration peut être amendée ou s'il faut en créer une nouvelle (voir CLAUDE.md).

---

## Checklist d'implémentation

Les fichiers sont listés dans l'ordre de dépendance : commencer par le schéma, terminer par la toolbar et le manuel.

### 1. Schéma de domaine — `src/schemas/hmi/hmi-widget.schema.ts`

C'est le fichier pivot. Tout le reste en dérive via TypeScript.

- [ ] **Union `HmiWidgetType`** — ajouter `| "mon-widget"` à l'union. Cette union alimente tous les `Record<HmiWidgetType, …>` et `switch` du projet ; TypeScript signalera immédiatement les endroits non couverts.
- [ ] **Type `MonWidgetData`** — créer le type de données propre au widget :
  - Étend `HmiWidgetBaseData` si le widget a une variable liée (`variableMnemonic`).
  - N'étend pas `HmiWidgetBaseData` si c'est une forme pure (comme `rectangle`).
  - Déclarer `animations?: HmiWidgetAnimations<"prop1" | "prop2">` si le widget a des propriétés animables.
  - Déclarer `events?: HmiWidgetEvents<"onNom">` si le widget expose des événements.
- [ ] **Classe concrète** — créer `class MonWidgetWidget extends HmiWidgetBase<MonWidgetData>` avec `readonly type = "mon-widget" as const`. Le `as const` est indispensable pour que TypeScript rétrécisse `widget.data` correctement.
- [ ] **Union `HmiWidget`** — ajouter `| MonWidgetWidget` à l'union.
- [ ] **`HMI_WIDGET_DEFINITIONS`** — ajouter une entrée (`label`, `defaultSize`, `minSize`, `variableTypes`). Ce `Record<HmiWidgetType, …>` est exhaustif : TypeScript refuse si une clé manque.
- [ ] **`generateDefaultData` switch** — ajouter un `case "mon-widget"` retournant les valeurs par défaut de `MonWidgetData`. Le switch doit rester exhaustif.
- [ ] **`createInstance` switch** — ajouter un `case "mon-widget"` instanciant `new MonWidgetWidget(…)`. Le switch doit rester exhaustif.
- [ ] **`getResizeAspectRatio`** — uniquement si le widget doit avoir un ratio largeur/hauteur imposé au redimensionnement (ex. carré forcé).

### 2. Composant de rendu — nouveau fichier `src/ui/components/hmi/widgets/MonWidget.tsx`

- [ ] Implémenter le composant avec la signature `HmiWidgetComponentProps<MonWidgetData>`.
- [ ] Props disponibles : `data`, `value`, `selected`, `hideLabel`, `onClick`, `onValueChange`, `onTrigger`. Ne supposer `onValueChange` et `onTrigger` présents qu'en simulation (ils sont `undefined` en mode conception).
- [ ] Si le widget interagit avec sa variable en simulation : appeler `onValueChange(nouvelleValeur)` au moment approprié.
- [ ] Si le widget expose un événement : appeler `onTrigger?.("nomEvenement")` au moment approprié. Le nom doit correspondre exactement à la clé déclarée dans `HMI_WIDGET_EVENTS`.

### 3. Registre des composants — `src/ui/components/hmi/widgets/hmi-widget-components.ts`

- [ ] Ajouter `"mon-widget": MonWidget` dans `HMI_WIDGET_COMPONENTS` (et l'import correspondant). Ce `Record<HmiWidgetType, …>` est exhaustif.

### 4. Palette de la toolbar — `src/ui/components/hmi/view/constants.ts`

- [ ] Ajouter une entrée `{ type: "mon-widget" }` dans `HMI_WIDGET_TOOLS` (widget interactif) ou `HMI_SHAPE_TOOLS` (forme pure).
- [ ] Si plusieurs variantes sont souhaitées : ajouter plusieurs entrées avec `label`, `sizeOverride` ou `dataOverride` distincts (modèle : les entrées `ellipse` pour Cercle et Ellipse).
- [ ] Ce tableau n'est pas exhaustif TypeScript — un oubli ne provoque pas d'erreur de compilation, mais le widget est alors inaccessible depuis la toolbar.

### 5. Aperçu dans la toolbar — `src/ui/components/hmi/toolbar/HmiWidgetToolbarItem.tsx`

Trois `Record<HmiWidgetType, …>` exhaustifs à compléter :

- [ ] **`PREVIEW_WIDTH`** — largeur de l'aperçu dans la palette (en pixels).
- [ ] **`PREVIEW_DATA`** — données figées pour l'aperçu (mêmes valeurs que `generateDefaultData`).
- [ ] **`PREVIEW_VALUE`** — valeur de démo affichée dans l'aperçu (`false` pour BOOL, `0` pour numérique).
- [ ] **`TOOL_SYMBOLS`** (facultatif) — symbole SVG compact si le rendu réel du widget est trop chargé pour un aperçu miniature.

### 6. Panneau Propriétés — `src/ui/components/hmi/view/HmiWidgetPropertiesPanel.tsx`

- [ ] **`WRITABLE_WIDGET_TYPES`** — ajouter `"mon-widget"` si le widget écrit dans sa variable. Les widgets dans ce `Set` excluent les variables de direction `OUT` du sélecteur de variable.
- [ ] **Champ libellé et variable** — automatiquement affiché pour tout widget qui n'est pas `rectangle`, `ellipse` ou `text`. Si le nouveau widget est une forme pure sans variable, l'exclure de la condition correspondante.
- [ ] **Propriétés spécifiques** — ajouter un bloc conditionnel `widget.type === "mon-widget"` pour rendre les champs propres au type.

### 7. Animations — `src/ui/components/hmi/view/HmiWidgetAnimationsPane.tsx`

À faire uniquement si le widget a des propriétés de style animables (couleur, texte…).

- [ ] Ajouter une entrée dans `HMI_WIDGET_ANIMATABLE_STYLE_PROPS` avec les propriétés animables (`"fill"`, `"stroke"`, `"text"`, etc.) et leur type d'entrée UI (`"color"` ou `"text"`).
- [ ] Si l'animation doit partir d'une valeur statique existante : ajouter un cas dans `getStaticPropertyValue`.
- [ ] Vérifier que `MonWidgetData` déclare `animations?: HmiWidgetAnimations<"prop1" | …>` avec les noms correspondants.

### 8. Événements — `src/ui/components/hmi/view/HmiWidgetEventsPanel.tsx`

À faire uniquement si le widget expose des événements déclenchables.

- [ ] Ajouter une entrée dans `HMI_WIDGET_EVENTS` avec les noms et libellés des événements.
- [ ] Vérifier que les noms correspondent exactement aux chaînes passées à `onTrigger?.("nom")` dans `MonWidget.tsx`.
- [ ] Vérifier que `MonWidgetData` déclare `events?: HmiWidgetEvents<"nomEvenement">`.

### 9. Nouvelles actions — `src/ui/components/hmi/view/hmi-action.executor.ts`

À faire uniquement si le widget introduit un **nouveau type d'action** (pas seulement un événement).

- [ ] Ajouter le nouveau type d'action à l'union `HmiAction` dans `hmi-widget.schema.ts`.
- [ ] Ajouter un `case` dans `executeHmiAction`. Le switch sur `action.type` est exhaustif : TypeScript refusera si un membre de l'union n'est pas couvert.

### 10. Migration de schéma — `src/persistence/migrations/`

À faire si le nouveau type change la forme des données persistées (nouveau champ dans `data`, renommage, restructuration).

- [ ] Demander au développeur : amender la dernière migration existante ou créer une nouvelle version ?
- [ ] Créer `vN-to-vN+1.ts` sur le modèle de la migration précédente, avec une fonction couvrant le nouveau type dans `data`.
- [ ] Enregistrer la migration dans `src/persistence/migrations/index.ts`.
- [ ] Incrémenter `PROJECT_SCHEMA_VERSION` dans `src/schemas/project/project.schema.ts`.

### 11. Manuel utilisateur — `src/app/(public)/manuel-utilisateur/sections/HmiSection.tsx`

- [ ] Ajouter le nouveau widget dans la liste de la sous-section "Widgets" avec sa description et ses propriétés configurables.

### 12. Tests

Pour chaque fichier créé ou modifié qui introduit une logique propre (schéma, exécuteur
d'actions, migration, comportement du composant de rendu), écrire les tests dédiés
correspondants — créés à côté du fichier (`nomDuFichier.test.ts`) ou ajoutés à un test
existant. Se demander explicitement quels cas le nouveau widget introduit et les couvrir ;
relancer la suite existante ne suffit pas.

- [ ] `generateDefaultData` / `createInstance` pour le nouveau type.
- [ ] Migration de schéma, si créée (round-trip sur des données du type concerné).
- [ ] Logique conditionnelle non triviale du composant de rendu (interaction variable,
  déclenchement d'événement).

---

## Invariants globaux à ne jamais violer

- Tous les `Record<HmiWidgetType, …>` sont exhaustifs. TypeScript émettra une erreur si une clé est absente — ne pas supprimer l'erreur avec un cast ou un `as any`.
- Tous les `switch (type)` sur `HmiWidgetType` dans le schéma (`generateDefaultData`, `createInstance`) doivent rester exhaustifs.
- Le `readonly type = "mon-widget" as const` sur la classe est indispensable. Sans `as const`, TypeScript infère `string` et les gardes de type ne fonctionnent plus.
- `onValueChange` et `onTrigger` sont `undefined` en mode conception — ne jamais les appeler sans vérifier leur présence.
- Le nom d'un événement dans `HMI_WIDGET_EVENTS` doit correspondre exactement à la chaîne passée à `onTrigger` dans le composant. C'est un contrat par convention, non vérifié par TypeScript.
