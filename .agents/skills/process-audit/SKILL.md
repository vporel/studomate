---
name: process-audit
description: Process, work through, and resolve the points of an audit file (typically _ai/audit-code.md or _ai/audit-perfs.md). Loop top to bottom over the numbered points: verify, propose a plan, wait for approval, implement, test, delete the point. With --parallel, approved plans are delegated to background agents while independent points are handled in the meantime.
---

# Skill: processing an audit file

This skill applies whenever a task asks to process, work through, or resolve the points of an
audit file (typically `_ai/audit-code.md` or `_ai/audit-perfs.md`).

An audit file is a numbered list of points (1, 2, 3… with possible sub-points), each
describing a defect with affected file(s), symptom, problem, and recommendation.

## Prerequisite — knowing which file to process

The skill doesn't start until the target audit file is known. If it wasn't passed as an
argument (`/process-audit _ai/audit-perfs.md`) and it isn't obvious from the
conversation, explicitly ask which file to process. Don't guess.

The optional `--parallel` flag enables delegation to agents (see the dedicated section below).

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
schema/data migrations or other project-specific side effects (see AGENTS.md), risks. Don't write code at this stage.

### 4. Wait for developer approval

**Non-negotiable: implement nothing before the developer has explicitly approved the plan.**

- If the plan is **rejected or amended**: revise it and resubmit, then wait for approval again.
  Don't move to the next step without an explicit green light.
- An automatic background task notification is **not** an approval.

### 5. Implement

Once the plan is approved, implement it. Minimal, targeted changes, matching the repo's style
(see AGENTS.md).

For every file created or modified that introduces new or changed logic (function, branch,
business rule, component behavior): write the corresponding dedicated tests (created next to
the file or added to an existing test). Explicitly ask what cases the fix introduces and cover
them — don't just rerun the existing suite. Only a change with no logic of its own (renaming,
moving, pure type change) can skip this.

### 6. Verify

Before touching the audit file:

- Run the tests **affected or created** by the change, not the whole suite — unless it's a
  cross-cutting change. Use the test command defined in the project's AGENTS.md.
- Run the project's other checks (type-check, lint…) as defined in AGENTS.md, if any.

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

## `--parallel` mode

Activated with `/process-audit _ai/audit-perfs.md --parallel`. Without the flag, everything
above applies unchanged. With the flag, steps 1, 5, 6, 7 and 9 are modified as described
below; steps 2, 3, 4 and 8 stay as they are (verification, plan, explicit approval, ripple),
and remain done by the main conversation, never by an agent.

The principle: after the developer approves a plan, instead of implementing it yourself,
hand it to an agent and move on to another point that is independent of the work in progress.

### Picking a point (replaces "first point remaining")

Pick the first remaining point that is **independent of every in-flight agent** (and of
points whose plan is awaiting approval). Independence is judged by you, from the files each
plan touches (tests included). Indicative examples: different modules/packages; within the
same module, different layers (e.g. data layer vs API layer vs business logic). Also treat
as dependent: shared files (test configuration/fixtures, settings, shared helpers) touched
by another in-flight point, and points that depend on another point's outcome.

Skipping a point is allowed here, but only because of dependence. Points skipped this way
are picked up again as soon as the blocking agent is done.

### Everything is decided before delegation

An agent cannot ask the developer anything. So, in steps 3–4, settle everything that would
normally need a question: any decision AGENTS.md says to ask the developer about (e.g.
permissions on new routes), choices affecting an existing contract, test cases to cover. The approved plan must be complete enough to be
executed without further decisions.

### Delegating (replaces step 5)

Once the plan is approved, launch an agent in the **same working tree** (no worktree) and in
the background. Its prompt must contain:

- the audit point (full text), the approved plan, and the exact list of files it may touch;
- the AGENTS.md rules that apply to the task (tests required with the change, prohibitions on
  commands or actions, code conventions…), restated explicitly — read AGENTS.md and copy the
  relevant ones into the prompt;
- the instruction to run **only its own targeted tests** (never the whole suite — agents
  share the same environment, test database included, and the full suite is run by the main
  conversation);
- the instruction **not to touch the audit file**;
- the instruction to **stop and report** if the plan turns out to be insufficient or wrong,
  or if it needs to touch a file outside its list — never improvise;
- the report format: files modified, tests added and their result, deviations from the plan,
  anything AGENTS.md requires to be flagged to the developer (e.g. schema changes that need a
  migration).

Maximum **4 agents** at the same time. If the limit is reached, wait for one to finish.

### Tracking

Keep a table up to date in your context: point → agent → files touched → status (awaiting
approval / running / done / blocked). It's what you use to judge independence.

### When an agent finishes (replaces steps 6–7)

1. Read its report and review the diff of the files it touched.
2. If something is off (failing tests, deviation, out-of-scope file): report it to the
   developer and wait for their decision. Don't relaunch an agent on your own.
3. Otherwise, **you** delete the point from the audit file (same rules as step 7, no
   renumbering), then do the step 8 ripple.
4. Pass on to the developer anything AGENTS.md says to flag (e.g. a schema change that needs
   a migration).

Agent-completion notifications arrive between exchanges: handle them as soon as they come,
and the freed points become pickable again.

### Stopping (replaces step 9)

Keep chaining: pick an independent point → verify → plan → approval → delegate. When no
remaining point is independent of in-flight agents, stop and say what you're waiting for
(which agent blocks which points). Resume when that agent finishes.

At the very end, once all agents are done and all points handled, run the **whole test
suite** (command defined in AGENTS.md), plus the other checks it lists, and report the result.

## End

When all points are processed, tell the developer. The emptied audit file can be left in place
(or deleted if the developer asks).
