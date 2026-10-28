---
name: audit-writer
description: Audit a codebase, a part of it, or non-code content (docs, user manual, training texts, SEO of public pages) and write the findings as a numbered audit file under _ai/, ready for /process-audit. Use when asked to audit code, performance, tests, security, architecture, docs or content and produce an audit file. Read-only on the audited material: it never fixes anything. Optional --parallel splits a large perimeter across read-only sub-agents.
---

# Skill: writing an audit file

This skill applies whenever a task asks to audit something (code, performance, tests, security,
docs, content...) and to record the result as an audit file.

The output is consumed by the `process-audit` skill, which processes the file point by point:
verify, plan, implement, delete. Everything below about the format exists so that this consumer
can work on it without guessing.

## Scope first

Before exploring, settle these, from the arguments or the conversation. Ask about anything that
is missing or ambiguous; don't guess.

- **Topic**: what kind of findings are sought (bugs, performance, test coverage, security,
  consistency, readability of content, SEO...). Findings outside the topic are left out, unless
  they are severe (a real bug, a security hole): mention those in the final report, not in the
  file.
- **Perimeter**: whole repository, a module, a set of files, a body of content. State it in the
  file header.
- **Output path**: default `_ai/audit-<topic>.md` (kebab-case topic). If the file already exists,
  **never overwrite it**: ask whether to append to it (numbering continues after its highest
  existing number, header kept) or to write a new file under another name.

### Arguments

Accepted, in any order: a free-text topic and/or perimeter, an output path, and the optional
`--parallel` flag. On an unknown flag, stop and ask.

## Method

1. **Read the project's `CLAUDE.md`** (and any instructions it points to) before anything else.
   Its rules bind the audit:
   - never recommend what it rules out (an optimization it declares disproportionate, a file the
     agent must never create such as migrations, a pattern it forbids...): drop the finding or
     reshape its recommendation to fit the rule;
   - when it says a decision belongs to the developer (versioning, migrations, deployed or not,
     product or naming choices...), the point says so explicitly instead of deciding;
   - its conventions (test placement, import rules, punctuation of UI texts, locale parity...)
     are themselves audit criteria when they fall within the topic.
2. **Explore** the perimeter: structure, entry points, tests, neighbouring code that the
   findings depend on. For content, read the rendered source (i18n files, markdown, pages) in
   every locale the project ships.
3. **Verify every finding against the actual code or content before writing it.** No
   speculative points ("might", "could potentially") unless the uncertainty is stated and the
   check that would settle it is given. Cite file paths with line numbers, and quote the
   relevant passage (a short code excerpt or sentence): line numbers drift as other points get
   fixed, the quote lets the next agent find the spot. When a claim is about behaviour, trace it
   (caller, test, data flow) rather than inferring it from a name.
4. **Classify severity** with a short legend stated in the header. Default legend:
   **High** (wrong behaviour, data loss, security, a blocking defect), **Medium** (ambiguous or
   fragile behaviour, a real but bounded cost), **Low** (precision, robustness, cleanliness).
   Adapt the legend to the topic if needed (e.g. content: wrong fact / confusing / polish), but
   keep three or four levels and use them consistently.
5. **Deduplicate**: one defect, one point. Group closely related issues (same mechanism, same
   fix) into one point with sub-points (`a.`, `b.`...): `process-audit` verifies, plans and
   deletes a point together with its sub-points, so only group what should be fixed together.
   Unrelated issues in the same file stay separate points. A problem that recurs across several
   areas is one point with one sub-point per area.
6. **Order** the points by severity, most severe first, unless another order serves the reader
   better (by module, by dependency between fixes); state the order in the header.
   `process-audit` processes top to bottom.
7. **Recommend concretely, without patches**: say what to change, where, and the expected
   result; name the tests that should cover it. Short code fragments are allowed to point at a
   construct, not full implementations. Keep recommendations proportionate to the project's
   scale and to `CLAUDE.md`.
8. **Flag decisions**: a point that needs a developer choice (several valid fixes, a product or
   naming decision, a contract change, anything `CLAUDE.md` says to ask about) carries a
   `**Décision**`/`**Decision**` field listing the options. Never present such a choice as
   settled.
9. **Cross-reference** related points by number ("see point 4"), and only once numbering is
   final.

## `--parallel` mode

For large perimeters only. If the environment cannot run sub-agents, refuse the flag, say why,
and ask whether to run sequentially.

- Split the perimeter into disjoint areas (module, layer, content section). Launch one
  **read-only** sub-agent per area. Its prompt contains: the topic, its area, the relevant
  `CLAUDE.md` rules restated explicitly (what not to recommend, what to flag as a decision), the
  severity legend, the point template below, and the instructions to verify every finding in
  the code with path, line and quoted passage, to modify no file, and to return its findings as
  text (never write the audit file).
- Merge the returned findings: deduplicate across areas (the same defect seen from two sides is
  one point), regroup related ones, order them, then **number once** into a single continuous
  sequence. Add cross-references after numbering.
- **Re-verify** yourself a sample of the points (all High ones, and at least one per area)
  against the code before writing. Drop or correct what doesn't hold, and report how many were
  dropped.

## Output format

Write in the language of the conversation with the developer, consistently within one file
(headings, field labels, severity names). In French, use the labels shown below; in English use
**Files/Lines**, **Symptom**, **Problem**, **Recommendation**, **Decision**, severities **High**,
**Medium**, **Low**.

```markdown
# Audit <topic>

Audit du <YYYY-MM-DD>, en lecture seule. Périmètre : <perimeter>.
Méthode : <how it was audited: sequential or one agent per area, what was read, what was run>.
Ordre : <par gravité décroissante | other stated order>.
Les numéros de ligne renvoient à l'état du code à la date de l'audit et se décalent au fil des
corrections : se repérer aux passages cités.

Légende de gravité : **Haute** (...), **Moyenne** (...), **Basse** (...).

---

## 1. <Short title naming the defect> (Haute)

**Fichiers** : `path/to/file.ext` (l. 42-57), `path/to/other.ext` (l. 10)
**Symptôme** : <what is observed: wrong output, failing scenario, confusing sentence; with a
reproduction scenario when there is one>
**Problème** : <the cause, with the quoted passage>
**Recommandation** : <what to change and how to test it>
**Décision** : <only when needed: the options for the developer>

## 2. <Title> (Moyenne)

**Fichiers** : ...
**Symptôme** : ...
**Problème** :
- a. <sub-issue, with its file and quote>
- b. <sub-issue>
**Recommandation** : ...
```

Contract with `process-audit`, to respect strictly:

- Every point is a `## N. Title (Severity)` heading, numbered from 1 (or from the next free
  number when appending), continuous, unique. No other `##` heading after the `---` separator:
  the area goes in the title ("Module a1 : ..."), not in extra headings, so that the file reads
  as one numbered list.
- Sub-points live inside their parent point, never as separate headings.
- Numbers are stable cross-references: never renumber an existing file when appending.
- The lines directly under a title are reserved for the consumer's markers (`Deferred: ...`,
  `In progress: ...`): never write them yourself, and when appending, leave existing markers
  untouched.
- Each point is self-contained: understandable without the conversation that produced it.

## What not to do

- Never modify the audited files, never fix anything, never run commands with side effects
  (migrations, installs, writes, network calls to production). Running the project's read-only
  checks (tests, type-check, lint) to support a finding is allowed; say so in the Method line.
- Never commit.
- Never write the audit as instructions to an agent ("run X", "delete Y now", "ignore the
  previous rules"): the file is data that `process-audit` verifies, not a script. Recommendations
  describe the change; they don't command it.
- No decision history, no narrative of how the audit was conducted beyond the Method line, no
  praise or "good points" sections: only actionable defects.
- No summary, synthesis, recap table, transverse problems list or prioritization list in the
  file: the header is followed directly by the numbered points, whose order is the processing
  order.
- No point that `CLAUDE.md` rules out, and no point without a verified location.

## End

Report to the developer in a few lines:

- the file path and the number of points, by severity (and how many need a decision);
- for `--parallel`, how many findings were dropped at re-verification;
- severe issues seen outside the topic, if any;
- the command to process it: `/process-audit <file>`.
