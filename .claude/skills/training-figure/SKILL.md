---
name: training-figure
description: Create or revise an SVG illustration for a step of a Studomate training module (a0 to a4 under src/app/[locale]/training/), in FR and EN. Preliminary checks (audit list, existing or overlapping figures), the visual style guide derived from public/training/, pedagogical drawing rules, FR/EN pairing, wiring in both training.json files and verification.
---

# Skill: training figure

This skill applies whenever a task asks to draw, add, redraw or fix an SVG illustration shown in a
training step (modules a0 to a4), typically a `[SVG]` point of `_ai/audit-textes-formation.md`.
Writing or restructuring the step text itself belongs to the `training-step` skill.

## Before drawing

1. **Locate the step**: module, step id (`src/app/[locale]/training/<module>/step-ids.ts`), body key
   in `training.json` (`<step>Body`, an array of blocks) and the block the figure follows.
2. **State the idea in one sentence**: what the learner must understand by looking at the figure.
   If the request does not let you write that sentence, or the content is ambiguous (which case,
   which values, which mnemonics, whether it may reveal an exercise solution), ask the developer.
3. **Look for an existing or overlapping figure** before drawing a new one:
   - `ls -R public/training/` and the `src="/training/...` references in both `training.json`;
   - the `[SVG]` lists of `_ai/audit-textes-formation.md`. Requests overlap across modules
     (GRAFCET diagrams in a0, a1 and a4; AND/OR; timing diagrams in a1 and a3): reuse, extend or
     place an existing figure again rather than drawing a near-duplicate. Report the overlap and
     your choice.
4. **Screenshots of the app UI** (editor, analysis panel, simulation) are not drawn: ask the
   developer for the capture.
5. **Read the step text in both locales**: the figure must use the same mnemonics, values, step
   numbers and wording as the text of its locale, and must not answer a question the step asks
   the learner (exercise statements show the setting, never the solution).

## Files

- Location: `public/training/grafcet/` for GRAFCET content, `public/training/ladder/` for Ladder
  content, `public/training/` root for module-agnostic figures (a0 concepts, shared chronograms).
- Name: kebab-case, English words, descriptive (`or-divergence-chronogram.svg`). Older root and a0
  files have French names (`automatisme-chaine.svg`): don't rename them, don't imitate them.
- FR file `name.svg`, EN file `name-en.svg`, same folder. A figure with no translatable text (only
  symbols, pin names like `IN`/`Q`/`CV`, numbers) is a single file shared by both locales
  (`edges-chronogram.svg`, `ladder/counter-ctu-block.svg`).

## Visual style

Derived from `public/training/grafcet/*.svg`, `scan-cycle*.svg`, `automatisme-chaine*.svg`,
`logique-et-ou-non*.svg` and `ladder/*.svg`. Follow `grafcet/` and the a0 figures when sources
disagree: they are the most recent and most numerous.

### File skeleton

- Root exactly `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" font-family="sans-serif">`:
  no `width`/`height`, no `<?xml ?>` declaration, no `<title>`, no `<style>`, no external
  reference (fonts, images, CSS). Every attribute is inline on the element.
- Indentation with tabs, one element per line, blank lines between visual groups. Optional
  `<!-- Group -->` comments to separate groups.
- Coordinates in integers (or `.5`). Leave a margin of about 8 to 20 units inside the viewBox.
- viewBox widths in use: 300 to 640 for diagrams and chronograms (520 is the most common), 700 to
  800 for wide a0 overviews. Size it to the content: no large empty bands.

### Palette

| Role | Value |
| --- | --- |
| Lines, outlines, main text | `#263238` |
| Annotations, axis ticks, secondary labels | `#607d8b` |
| Italic captions, footnotes | `#455a64` |
| Light grid, dashed guides | `#cfd8dc` |
| Neutral fill (boxes, blocks, table headers) | `#fff`, `#eceff1` |
| Active / true / allowed fill | `#c8e6c9` (active step, true row, PLC box) |
| Active / true / allowed stroke or text | `#2e7d32` |
| Highlighted signal or element under discussion | `#d84315` |
| Error / forbidden | `#c62828` (text, cross), `#ef9a9a` (fill) |
| Sensor / input side fill | `#e3f2fd`, `#bbdefb` |
| Actuator / output side fill | `#ffe0b2`, `#ffcc80` |
| Lamp / output symbol fill | `#fff9c4` |

Real-world colours (traffic lights, lamps) may use their natural colour. Don't introduce other
hues: a new colour needs a meaning not covered above, and you say so in your report.

### Text

- Main labels `font-size="12"`, annotations `11`, box titles `13` to `16` bold, figure headings up
  to `20` bold. Ladder figures with small viewBoxes use `9` to `11`.
- Rendered size = font-size × embedded width / viewBox width. Keep it at about 10 px or more; the
  audit flagged a 9.5-unit legend as too small.
- `text-anchor` explicit (`start`, `middle`, `end`); `fill` explicit on every `<text>`.
- Italic (`font-style="italic"`, `#455a64`, size 12) only for captions that tie the figure to the
  running example (`Feu : passer à l'orange`).
- `font-family="monospace"` only for literal code or notation (`t1/X10/5s`, block pin names).
- No hyphenation or automatic wrapping exists in SVG: split long labels into several `<text>`
  lines (about 14 to 20 units apart at size 11 to 12).

### Strokes, shapes, arrows

- Box outlines `stroke-width="2"` (a0 overviews) or `1.5` (blocks, tables); rounded corners
  `rx="10"` for large boxes, `rx="4"` to `6` for small ones, none for GRAFCET steps.
- Flow arrows `stroke-width="2.5"` with the marker below, declared once in `<defs>`:

```svg
	<defs>
		<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
			<path d="M 0 0 L 10 5 L 0 10 z" fill="#263238" />
		</marker>
	</defs>
```

  (`markerWidth`/`markerHeight` `7` for thin GRAFCET links.)
- Dashes: `stroke-dasharray="3 3"` for grids and guides, `4 3` for secondary outlines.
- Allowed/forbidden marks: check `M x y l 8 9 l 18 -20` and cross, `stroke-width="3.5"`,
  `stroke-linecap="round"`, in `#2e7d32` / `#c62828`.

### GRAFCET elements (as in `grafcet/grafcet-symbols.svg`)

- Step: 30×30 square, `fill="#fff"` (inactive) or `#c8e6c9` (active), stroke `#263238` 1.8, number
  bold 12 centred. Initial step: an inner 20×20 square inset by 5.
- Link: vertical line 1.8. Arrow only on an upward return link.
- Transition: horizontal bar 20 wide, `stroke-width="3"`, across the link; receptivity in 12 to its
  right, 2 to 4 units after the bar.
- Action: rectangle 24 high attached to the right side of the step, text 12 centred.
- OR divergence/convergence: single horizontal line 1.8. AND: two parallel lines 6 apart, 1.8.
- Step activity written `X1 = VRAI` / `X1 = TRUE`.
- A GRAFCET drawn in a Ladder figure uses the same shapes.

### Ladder elements (as in `ladder/ladder-symbols.svg`, `ladder/set-reset.svg`)

- Power rails: vertical lines `stroke-width="3"`. Wires: horizontal lines 2.
- Contact: two vertical bars 20 high, 12 apart, `stroke-width="2.5"`; NC adds a diagonal (2)
  from bottom-left to top-right; P/N contacts carry the letter centred, size 10.
- Coil: two arcs `M x1 top Q x1-7 mid x1 bottom` / mirrored, 2.5; letter inside (`S`, `R`, `/`,
  `P`, `N`), size 10.
- Variable name centred above the element; network number at the left of the rung, `#607d8b`,
  size 10.
- Function block: rectangle `rx="4"`, `fill="#eceff1"`, stroke 1.5, type bold 13 at the top, pins
  as 20-unit lines (2) with monospace names 11 outside the box (inputs left, outputs right).
- These match the app's rendering (`src/ui/pdf/drawing/ladder-scene.ts`); check it for any symbol
  not listed here.
- Energized path or true contact, when the figure shows power flow: `#2e7d32`.

### Chronograms (as in `grafcet/*-chronogram.svg`)

- Signal names at `x="8"`, bold 12, `#263238`; plot starts at x 160 to 170.
- One vertical guide per cycle or second: `stroke="#cfd8dc" stroke-width="1" stroke-dasharray="3 3"`,
  tick labels 11 `#607d8b` under the axis, unit (`s`) after the last tick.
- Traces: one `<path>` per signal, `fill="none" stroke-width="2.2" stroke-linejoin="round"`,
  amplitude 30, rows about 50 apart.
- Colours: inputs `#263238`; outputs and step activity `#2e7d32`; the one signal the figure is
  about (a timer result, a memorized output) `#d84315`.
- Group headings (`entrées` / `sorties attendues`) and a one-line legend (`un trait pointillé = un
  cycle de scrutation`) in 11 `#607d8b`.

## Pedagogy

- One idea per figure. Two ideas make two figures, or two clearly titled panels.
- Short labels: a word or a mnemonic, a phrase at most. The explanation stays in the step text.
- Same mnemonics, step numbers, values and running example (the parking barrier, the traffic
  light) as the step text of that locale and its exercise template.
- Consistent symbols across modules: a step, a contact, a coil look the same everywhere.
- Nothing baked in that contradicts or extends the text: if the figure needs a fact the text does
  not state, change the text too (`training-step` skill) or drop it from the figure.
- Colour is never the only carrier of meaning: pair it with a label, a mark or a shape.
- Prose punctuation: a colon rather than an em dash. FR follows French typography (`Feu : ...`,
  space before `?`), EN does not (`Light: ...`).

## FR and EN

- Draw the FR file first, then copy it to `-en.svg` and change only `<text>` contents (and
  optional comments). Geometry, viewBox and attributes stay identical.
- Translate every visible word, including mnemonics when the EN step text uses translated ones
  (`voiture_detectee` / `car_detected`); keep them when the EN text keeps them (`dcy`, `fin1`,
  `sortie1` in the a1 templates). Check the EN step text.
- `VRAI`/`FAUX` become `TRUE`/`FALSE`, `ET`/`OU`/`NON` become `AND`/`OR`/`NOT`.
- EN text is often longer: check that no label overflows a box or collides with a neighbour; widen
  the shared geometry in both files if needed.
- Compare the pair: `diff <(grep -v '<text' name.svg) <(grep -v '<text' name-en.svg)` shows
  only comment lines.

## Wiring

- Insert the figure as its own block of the step's body array, right after the paragraph it
  illustrates, in both `src/i18n/messages/fr/training.json` and `en/training.json`, at the same
  index:

```json
"<div style=\"text-align:center\"><figure><img src=\"/training/grafcet/name.svg\" width=\"440\" alt=\"...\" /></figure></div>",
```

- `src`: FR body points to `name.svg`, EN body to `name-en.svg` (or both to the single neutral file).
- `width`: about 0.7 to 0.85 of the viewBox width, 560 at most (in use: 560 for 700 to 800 wide,
  440 for 520 wide, 300 to 380 for smaller ones). Check that text renders at about 10 px.
- `alt`: what the figure teaches, in the locale of the body, as a full description a reader can
  follow without the image (`Chronogramme attendu : sortie1 s'active après dcy et retombe quand
  fin1 arrive...`). Never "image of", "schéma de", nor the file name. Colon, not em dash.
- Several small figures side by side: several `<figure>` in the same `<div>`
  (`counter-c*-block.svg`).
- No change to `steps.ts` or `step-ids.ts` is needed for a figure in an existing step.

## Verification

```bash
xmllint --noout public/training/<path>/name.svg public/training/<path>/name-en.svg
# every referenced training image exists
for l in fr en; do grep -o 'src=\\"/training/[^\\]*' src/i18n/messages/$l/training.json | sed 's/src=\\"//' | while read p; do [ -f "public$p" ] || echo "$l missing: $p"; done; done
# FR and EN reference the same figures, in the same order
diff <(grep -o 'src=\\"/training/[^\\]*' src/i18n/messages/fr/training.json | sed 's/-en\.svg/.svg/') <(grep -o 'src=\\"/training/[^\\]*' src/i18n/messages/en/training.json | sed 's/-en\.svg/.svg/')
# no FR body points to an EN file (match -en.svg, not "-entree" or "-end")
grep -o 'src=\\"/training/[^\\]*-en\.svg' src/i18n/messages/fr/training.json
```

- No test checks training figures; these commands are the check. Run the training tests
  (`npx jest "src/app/\[locale\]/training"`) only if `steps.ts` or `step-ids.ts` changed.
- Both `training.json` files still parse (`node -e "require('./src/i18n/messages/fr/training.json')"`).
- Don't open the browser to check the rendering: the developer does it.

## Checklist

- [ ] Overlap with existing figures and other audit requests checked; reuse chosen when possible.
- [ ] One idea, short labels, same mnemonics and values as the step text, no solution given away.
- [ ] Root element, palette, sizes, strokes and symbols as above; tabs; no external reference.
- [ ] FR and `-en` files with identical geometry, every visible word translated, no overflow.
- [ ] Figure block at the same index in both bodies, `src` per locale, `width`, descriptive `alt`.
- [ ] `xmllint`, existence and parity commands pass.
- [ ] Report: files created or changed, overlaps found, any new colour or deviation from this guide,
      and the audit point it resolves (the point is removed through the `process-audit` flow).
