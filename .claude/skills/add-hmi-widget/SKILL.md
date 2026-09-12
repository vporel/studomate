---
name: add-hmi-widget
description: Add a new widget type to Studomate's HMI editor. Mandatory preliminary questions, then a short checklist (domain definition, render component, satellite UI entry with declarative field descriptors, migration if needed). The palette, properties panel, animations, events and manual are derived — no parallel tables to edit.
---

# Skill: adding a new HMI widget

This skill applies whenever a task asks to add a new widget type to the HMI editor.

The architecture is **table-driven**: a domain definition (`HMI_WIDGET_DEFINITIONS`, React-free)
and a satellite UI table (`HMI_WIDGET_UI`, component + preview + field descriptors). The
Properties panel, the palette, the Animations/Events panels and the manual all read from these
two tables — they **don't** need to be edited for a simple widget.

## Before starting — mandatory questions

Don't implement before getting clear answers. If the request doesn't specify them, ask:

1. **Widget nature** — `interactive` (bound to a variable) or `shape` (purely visual, no variable)?
2. **Bound variable** — if interactive: which type(s) (`BOOL`, `INT`, `REAL`…)? Does the widget **write** to the variable (`writesToVariable: true`, e.g. a switch) or only **read** it (e.g. an indicator lamp)?
3. **Palette placement** — interactive group or shapes? Several variants of the same type (like Circle/Ellipse)?
4. **Configurable properties** — which options in the Properties panel, and of what type (text, color, number, select, checkbox)? Does any field have a side effect (e.g. the gauge orientation swaps width/height)?
5. **Animatable style** — any visual properties drivable by a variable during simulation (color, text…)?
6. **Events** — does the widget trigger actions (e.g. `onPress`) during simulation?
7. **Impact on the persisted schema** — does `defaultData` introduce a field that existing projects don't have? If so, ask whether the latest migration can be amended or a new version is needed (see CLAUDE.md).

---

## Implementation checklist

### 1. Domain definition — `src/schemas/hmi/hmi-widget.schema.ts`

- [ ] **`HmiWidgetType` union** — add `| "my-widget"`. Feeds every exhaustive `Record<HmiWidgetType, …>`; TS flags uncovered spots.
- [ ] **`MyWidgetData` type** — extends `HmiWidgetBaseData` if bound to a variable, doesn't extend it for a pure shape. Declare `animations?: HmiWidgetAnimations<"prop1" | …>` if the style is animatable, `events?: HmiWidgetEvents<"onName">` if it has events.
- [ ] **`class MyWidgetWidget extends HmiWidgetBase<MyWidgetData>`** with `readonly type = "my-widget" as const` (required for union narrowing).
- [ ] **`HmiWidget` union** — add `| MyWidgetWidget`.
- [ ] **`HMI_WIDGET_DEFINITIONS`** — one entry: `kind`, `writesToVariable`, `defaultData` (the full initial `data`, `label` included for an interactive widget), `label`, `defaultSize`, `minSize`, `aspectRatio?`, `variableTypes`. Exhaustive `Record`.
- [ ] **`WIDGET_CONSTRUCTORS`** — one line `"my-widget": MyWidgetWidget`. Exhaustive `Record`.
- [ ] *(No `generateDefaultData` or `createInstance` to edit — they're driven by the tables.)*

### 2. Render component — new `src/ui/components/hmi/widgets/MyWidget.tsx`

- [ ] Signature `HmiWidgetComponentProps<MyWidgetData>`. Props: `data`, `value`, `selected`, `hideLabel`, `onClick`, `onValueChange`, `onTrigger`.
- [ ] `onValueChange` / `onTrigger` are `undefined` at design time — never call them without a guard.
- [ ] Event name passed to `onTrigger?.("name")` = exactly the key declared in the `events` entry (step 3).

### 3. Satellite UI entry — `src/ui/components/hmi/widgets/hmi-widget-ui.ts`

One entry in `HMI_WIDGET_UI` (exhaustive `Record<HmiWidgetType, …>`):

- [ ] `component`: the component from step 2 (+ import).
- [ ] `previewWidth`, `previewValue` (`false`/`0`/demo value), `paletteOrder` (rank within its group).
- [ ] `manualDescription`: the manual's sentence (`"My widget — … Options: …"`).
- [ ] `toolSymbol?`: compact SVG symbol if the actual render is illegible at thumbnail size.
- [ ] `events`: `[]` or `[{ name: "onName", label: "Label" }]`.
- [ ] `animatableStyleProps`: `[]` or `[{ name, label, inputType: "color" | "text", staticValue: (data) => … }]`.
- [ ] `propertyFields`: declarative descriptors for the Properties panel fields. Each field carries `label` + `get: (data) => …` / `set: (data, value) => ({ …data })` **typed** against `MyWidgetData` (TS breaks on a wrong field). Variants: `text` (`multiline?`), `color`, `number` (`min?`/`max?`), `select` (`options`, `widgetPatch?` for a side effect), `checkbox`.

### 4. Palette — nothing to do

`HMI_WIDGET_TOOLS` / `HMI_SHAPE_TOOLS` (`src/ui/components/hmi/toolbar/hmi-widget-tools.ts`) are
**derived** from `kind` + `paletteOrder`. Only edit for **several variants** of the same type in
the palette (model: the two `ellipse` entries for Circle/Ellipse).

### 5. New action type — `src/schemas/hmi/hmi-widget.schema.ts` + `hmi-action.executor.ts`

Only if the widget introduces a **new action type** (rare, orthogonal to widgets):
add it to the `HmiAction` union then a `case` in `executeHmiAction` (exhaustive switch).

### 6. Migration — `src/persistence/migrations/`

Only if `defaultData` introduces a field absent from existing projects:

- [ ] Ask: amend the latest migration or create a new version?
- [ ] Create `vN-to-vN+1.ts`, register it in `migrations/index.ts`, bump `PROJECT_SCHEMA_VERSION`.

### 7. Manual — nothing to do

`HmiSection.tsx` is generated from `HMI_WIDGET_DEFINITIONS` + `manualDescription`.

### 8. Tests

- [ ] `hmi-widget.schema.test.ts`: `generateDefaultData` / `create` for the new type; `kind` / `writesToVariable` / `defaultData` consistency.
- [ ] `hmi-widget-ui.test.ts`: covered automatically (per-type entry, `get`/`set` round-trip, `set` immutability) — add a dedicated case for a non-trivial `widgetPatch` or `staticValue`.
- [ ] Conditional logic of the render component (variable interaction, event triggering).
- [ ] Migration, if created (round-trip).

---

## Global invariants

- `readonly type = "my-widget" as const` on the class — without `as const`, no more union narrowing.
- Exhaustive `Record<HmiWidgetType, …>`: `HMI_WIDGET_DEFINITIONS`, `WIDGET_CONSTRUCTORS`, `HMI_WIDGET_UI`. Never hide a missing-key error with a cast.
- `propertyFields` descriptors rebuild `data` (`{ ...data, … }`), never mutate it.
- Event name in `events` = string passed to `onTrigger` — a convention-based contract, not checked by TS.
- `onValueChange` / `onTrigger` are `undefined` at design time.
