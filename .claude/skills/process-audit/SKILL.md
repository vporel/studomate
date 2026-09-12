---
name: process-audit
description: Process, work through, and resolve the points of an audit file (typically _ai_context/audit-code.md or _ai_context/audit-perfs.md). Loop top to bottom over the numbered points: verify, propose a plan, wait for approval, implement, test, delete the point.
---

# Skill: processing an audit file

This skill applies whenever a task asks to process, work through, or resolve the points of an
audit file (typically `_ai_context/audit-code.md` or `_ai_context/audit-perfs.md`).

An audit file is a numbered list of points (1, 2, 3… with possible sub-points), each
describing a defect with affected file(s), symptom, problem, and recommendation.

## Prerequisite — knowing which file to process

The skill doesn't start until the target audit file is known. If it wasn't passed as an
argument (`/process-audit _ai_context/audit-perfs.md`) and it isn't obvious from the
conversation, explicitly ask which file to process. Don't guess.

## The loop

The file is processed **top to bottom**. For each iteration:

### 1. Pick a point

Take the **first point still present** in the file (the topmost one). Don't skip a point,
don't let the developer choose the order — it's always the first one remaining.

### 2. Verify the audit is right

Go read the actually affected code and confirm the described defect really exists as stated.

- If the point is **confirmed**: move to step 3.
- If the point is a **false positive** (the defect doesn't exist, or no longer does, or the
  description is wrong): clearly report this to the developer (what was checked, why the point
  doesn't hold) and **wait for their decision** (delete the point without implementing
  anything, reclassify it, other). Never delete a point on your own initiative in this case.

### 3. Propose a plan

Describe the implementation plan in text: affected files, nature of the changes, any
migrations (see CLAUDE.md), risks. Don't write code at this stage.

### 4. Wait for developer approval

**Non-negotiable: implement nothing before the developer has explicitly approved the plan.**

- If the plan is **rejected or amended**: revise it and resubmit, then wait for approval again.
  Don't move to the next step without an explicit green light.
- An automatic background task notification is **not** an approval.

### 5. Implement

Once the plan is approved, implement it. Minimal, targeted changes, matching the repo's style
(see CLAUDE.md).

For every file created or modified that introduces new or changed logic (function, branch,
business rule, component behavior): write the corresponding dedicated tests (created next to
the file or added to an existing test). Explicitly ask what cases the fix introduces and cover
them — don't just rerun the existing suite. Only a change with no logic of its own (renaming,
moving, pure type change) can skip this.

### 6. Verify

Before touching the audit file:

- Run the tests **affected or created** by the change (`npx jest path/to/file.test.ts`),
  not the whole suite — unless it's a cross-cutting change (see CLAUDE.md).
- Run `npx tsc --noEmit` and `npm run lint`.

If a check fails, fix it before continuing. Don't move to step 7 while red.

### 7. Delete the point

Simply delete the point's block from the audit file. **Don't** mark it "Done", "Processed", or
strike it through — **delete** it.

**Don't renumber** the remaining points: numbers serve as cross-references ("see point 24"),
keep them stable even if gaps appear.

### 8. Ripple to related points

Reread the rest of the audit file and spot points **related** to the one just processed (same
file, same mechanism, dependency).

- If the fix **changed what another point should say** (lines that moved, part of the problem
  already solved): update that point's text directly in the audit file to reflect the actual
  state.
- If a related point becomes **entirely moot**: don't delete it on your own — report it to the
  developer and wait for their decision (like a false positive in step 2).

### 9. Next point

Move straight on to the next point (back to step 1) **without asking the developer whether to
continue**. The loop only stops when the audit file no longer contains any point.

The approval expected in step 4 only concerns the current point's plan, never whether to keep
looping.

## End

When all points are processed, tell the developer. The emptied audit file can be left in place
(or deleted if the developer asks).
