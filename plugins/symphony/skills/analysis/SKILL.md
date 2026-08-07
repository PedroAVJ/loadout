---
name: analysis
description: "Use when Pedro wants Symphony to analyze requirements: apply the SWEBOK definition of a requirement and deliver one requirements table (classified along the kept SWEBOK dimensions, with allocation-minted derived rows and a blocked-by column), a conflicts list typed by SWEBOK's three conflict types, and a logical data-model diff when the requirements reshape data. Every surviving requirement becomes one Linear issue in Backlog, with derivation, blocked-by, and conflicts carried as Linear relations. Allocation runs under the hood, never as output."
---

# Symphony Requirements Analysis

This skill covers the SWEBOK definition of a requirement plus four
analysis topics: Requirements Classification, Conceptual Modeling,
Requirements Allocation, and Requirements Negotiation. Formal analysis is
deliberately dropped — Pedro's call, do not reintroduce it.

## Reference Vocabulary

SWEBOK (Software Requirements knowledge area) is the single reference
vocabulary for Symphony requirements work. Do not merge in other frameworks
— Sommerville's user-vs-system altitudes, Wiegers, ISO/IEC/IEEE 29148
well-formedness checklists — unless Pedro asks. 29148 becomes relevant only
if a formal SRS document is ever contractually required; until then it is
out of scope.

## What Counts as a Requirement

Per SWEBOK: a requirement is "a property that must be exhibited by something
in order to solve some problem in the real world." It must be:

- **Verifiable** — as an individual feature if functional, at system level
  if nonfunctional. If you cannot state how it would be checked, it is a
  wish, not a requirement yet.
- **Unambiguous** — stated as clearly as possible.
- **Quantified where appropriate** — "under 2s for 95% of transactions",
  not "fast".

## Candidate Scope

Rows are candidates for future work, not a delivery record. Ground
implementation status in the product repo (code, merged history) before
writing a row. When the source demonstrates behavior the product already
exhibits and the stakeholder confirms it — a demo walkthrough, a
re-confirmation — that is validation evidence, not a candidate:

- comment on the existing Linear issue that captured the requirement,
  source-attributed, or
- leave nothing when no prior issue exists — git history is the record of
  shipped behavior.

A demonstrated behavior still earns a row when something remains demanded:
the source imposes a change to it, leaves an open question or a pending
stakeholder validation, or puts it in conflict.

Two more shapes that are never rows:

- **Action items and validation gates.** "Check with X before building" is
  the pending-validation state of the row it gates — record it in that
  row's derivation (which fixes where validation happens) or blocked-by,
  never as a row of its own. Requirements tables are not to-do lists.
- **Stakeholder-uttered design.** Stakeholders speak at every altitude,
  and attribution does not promote a design sketch into a requirement.
  When a stakeholder proposes mechanisms, extract the property the
  mechanisms are trying to achieve — that is the row — and keep the
  sketches as derivation notes. The tell: a row containing a menu of
  alternatives is a decision pending specification, not a requirement;
  requirements do not have options.

## Classification

SWEBOK's Requirements Classification topic lists six dimensions. Symphony
uses four. Priority and volatility/stability are deliberately dropped, not
overlooked: both exist to ration scarce implementation effort, and with
agent coding implementation is cheap. Do not ask Pedro for priorities or
stability estimates, and do not record them.

Classify each requirement along:

1. **Functional vs nonfunctional** — behavior the system exhibits vs a
   quality or constraint on it.
2. **Derivation** — where it came from, which fixes where it gets
   validated:
   - *Imposed directly* by a stakeholder → validate with that stakeholder.
   - *Derived* from a parent requirement → validate against the parent and
     keep the trace; if the parent dies, the child dies.
   - *Emergent* — a whole-system property no single component satisfies →
     verifiable only end-to-end.
3. **Product vs process** — does it constrain the artifact, or the activity
   of building it? Nonfunctional product requirements are still product
   requirements; process requirements say nothing about what the software
   does.
4. **Scope** — the extent to which it affects the software: narrow
   (satisfiable by one component) vs global (cannot be allocated to a
   discrete component; constrains architecture and every future change).

## Conceptual Modeling

SWEBOK's conceptual modeling topic, scoped to how Pedro actually reads
systems: the data model, at the logical level. Model when the analyzed
requirements reshape data — new entities, moved attributes, changed
relationships. Skip it when they do not; a model with no structural change
is decoration.

- Model the LOGICAL view: entity names, attributes, relationships and
  their cardinalities. No SQL types, no FK id columns, no index noise —
  that is the physical layer, below this skill.
- Present change as a diff on the logical view: "what is" (grounded in the
  actual current entities — read them, never reconstruct from memory)
  against "what will be" (from the requirement rows). Reuse the
  schema-diff visual grammar — ER cards plus a git-style diff block,
  diff-colored added/changed/removed — with open decisions marked amber
  carrying the owning row id, never silently resolved.
- Deliver it as a rendered artifact opened for Pedro alongside the
  requirements table; the table stays the primary deliverable.

## Flow

Analysis runs as a pipeline with one feedback loop:

1. Classify the elicited requirements.
2. Allocate them (under the hood — see below); this can mint new derived
   requirements.
3. Minted rows re-enter classification — they arrive mostly pre-labeled
   (derived with a parent, usually functional and narrow), so this
   converges in a pass or two.
4. Run the conflict check last, over the complete row set. It must be
   last: derived requirements can be the conflicting ones, and they do not
   exist until allocation mints them.
5. When the final rows reshape data, render the conceptual model from
   that final row set — after conflicts, so the diff reflects every row
   that survived.
6. Flush the surviving rows to Linear as one batch (see Linear Is The
   Record) — after the Codex pass, so nothing it kills gets an issue.

Steps 1–5 are one sitting, not separable lanes: allocation feeds back into
classification, and conflicts cannot be checked until allocation has finished
minting rows. Do not split them across skills or across threads.

## Allocation

Allocation runs under the hood. It is never a section of the output — its
visible residue is rows and columns in the requirements table.

Hold each requirement against the target system's decomposition and assign
it internally to the component responsible for satisfying it. Components
are feature-area boxes — for TradeInCode: monitoring, trips, customs,
IntegratorAPI, Nova frontend, and so on — never implementation mechanisms
(mutation vs EF hook vs background job is design inside the box, below
this skill; do not design inside the boxes).

A system is not always software. SWEBOK's definition is a property exhibited by
*something* that solves a real-world problem, so a system may be composed of
software, tools, processes, and people — a Power Automate flow to stand up, a
process to change, a person who has to start doing something. Allocate those to
the tool, process, or role that owns them. The pass is identical; only the
vocabulary of the boxes changes. Do not force non-software work into code
components, and do not drop it because no repo owns it.

The point of the pass is to discover requirements the source does not
contain: when a component cannot satisfy its requirement without something
another component owns, that missing piece becomes a new derived
requirement row, parent-traced to the requirement that minted it. A
requirement no single component can satisfy is global-scope; that lands in
the scope column, not in any call-out.

## Negotiation

SWEBOK names exactly three conflict types. When requirements conflict,
identify which type it is and surface it:

1. **Stakeholder vs stakeholder** — two stakeholders require mutually
   incompatible features.
2. **Requirements vs resources** — a requirement exceeds what is
   available.
3. **Functional vs nonfunctional** — a functional requirement conflicts
   with a nonfunctional one.

The rest of SWEBOK's negotiation topic — the no-unilateral-decision rule
and the prioritization methods (cost-value, pairwise comparison) — is
deliberately dropped, Pedro's call: conflicts go to him regardless, and
prioritization is effort-rationing. Do not apply or record either.

## Output

The deliverable is one requirements table plus a conflicts list:

- Rows: every candidate requirement in scope (see Candidate Scope) —
  elicited and allocation-minted alike, on the same table.
- Columns: the four classification dimensions (derivation carries the
  parent pointer) plus a blocked-by column — which rows must exist first.
  The blocked-by column is the artifact allocation leaves behind; it
  carries build order and maps onto Linear blocking relations at
  specification time.
- Conflicts: a short list after the table, each entry naming the two rows
  involved and which of the three conflict types it is.
- Conceptual model: when the rows reshape data, a logical data-model diff
  (see Conceptual Modeling) delivered as a rendered artifact.

Present the complete table and conflicts list in chat, then the created issues.
Do not replace the deliverable with a summary, selected rows, or a bare link to
Linear. Pedro uses the complete candidate set to choose which item to specify
next, and the table is the surface he negotiates against — killing a row,
blocking one pending someone's input, asking for the data model to understand a
cluster. Those corrections land in Linear the same way re-analysis does: update
in place, cancel what died.

The table is a view of the issues, not a second copy of them. When the two
disagree, Linear is right.

Running unattended does not change what gets written. The issues are created on
the automated run so they already exist when Pedro opens the thread; Backlog
already says they are unfinished, and holding them back would leave the work
nowhere.

## Linear Is The Record

Linear holds the requirements. There is no parallel file that also holds them —
a second copy is a second thing to keep in sync, and it will drift.

Every requirement that survives the flow becomes exactly one Linear issue, in
**Backlog**. Backlog is the requirement state: the row exists, it is still being
worked out, and nothing about it is specified. Promotion to **Todo** is the
specification step and it is Pedro's, per issue — that transition is what
authorizes implementation, and nothing this skill does may substitute for it.

Row IDs (R1, R2…) are discussion references for the chat table only. They are
how blocked-by and conflicts get stated before the issues exist. Once the batch
is created, Linear issue IDs are the identifiers; do not carry row IDs forward
as if they were durable.

### Structure Carries The Analysis

The classification output is not prose in a body — it maps onto Linear:

- **Derivation** — a derived requirement is a **sub-issue** of its parent. If
  the parent dies, the child dies with it. Imposed and emergent requirements are
  top-level; the body names the stakeholder (imposed) or says the property is
  only verifiable end-to-end (emergent).
- **Blocked-by** — Linear **blocking relations**, one per entry in the column.
  This is the build order allocation left behind.
- **Conflicts** — a **related** relation between the two issues involved, plus a
  line in each body naming which of SWEBOK's three conflict types it is and what
  the incompatibility actually is. A conflict that lives only in the chat
  transcript is lost the moment the thread ends.
- **Functional/nonfunctional, product/process, scope** — a short classification
  block in the body. Not labels: the workspace label convention is one repo
  label per issue (see the `linear` skill), and classification would flood it.

Do not set a priority (`linear` skill, standing convention). Apply the one repo
label for the originating repo; for work with no product repo — workplace
process, career, personal-system requirements — that label is `exocortex`.

### Traceability And Re-Analysis

Every issue body cites its source: transcript path, timestamp or quoted line,
and the speaker who imposed it. This is a requirement of the analysis, not a
nicety — an issue that cannot be traced back to what someone actually said
cannot be validated against them later.

The source pointer is also the dedup key. Before creating anything, search
Linear for issues already citing this source and reconcile against them:

- a requirement that still holds → update that issue in place, source
  attribution intact
- a requirement the new evidence killed → cancel the issue, do not delete it
- a newly minted derived requirement → new issue, parented to its parent's issue

Never create a second issue for a requirement that already has one. Never
silently harden a hedge into a specification while updating.

## Codex Adversarial Pass

Claude and Codex fail in opposite directions on this task: Claude's drift
is loose labels and design decisions recorded as requirements; Codex's
drift is dropped provenance and hedges hardened into false precision. So
after drafting the full analysis and before presenting it, dispatch a
critique to the `codex:codex-rescue` subagent as a single read-only task.

Run the critique at maximum rigor: instruct the rescue subagent to pass
`--effort xhigh`, and leave the model unset so the user's configured Codex
default applies. The extra wall time is accepted; do not downgrade the
effort to finish faster.

The forwarded task must contain:

- The complete draft analysis verbatim.
- Repo paths to the source evidence (transcripts, meeting notes) so Codex
  can ground the critique instead of reviewing prose in a vacuum.
- An explicit "review only, read-only, make no edits" instruction.
- The critique brief: challenge each row on requirement vs design
  decision, verifiability (was a hedge quantified into a fake number?),
  derivation traced to a named stakeholder, candidate scope (is the row
  merely re-validating already-shipped behavior?), scope (global only when
  genuinely unallocatable), product vs process, missed requirements still
  in the sources, and conflict typing. Findings only — no rewrite.

Then reconcile in-thread: adopt findings that stick, drop the rest, and
present ONE final analysis. The reconciliation is silent — no changelog,
no list of adopted or rejected findings; anything that survives the pass
is already visible in the table itself.

When this skill runs inside Codex itself, invert the pass rather than dropping
it: dispatch the same critique brief to Claude. Self-review adds nothing, but
the asymmetry is the point and it holds in both directions — the unattended
meeting run happens in Codex, and that is precisely the run with nobody in the
chair to catch a bad row before it becomes an issue.

Skip the pass — and say so plainly in the output — only when neither reviewer
is reachable. Never fabricate a critique on the other model's behalf.

## Contract

- Analysis is a classification and allocation pass over already captured or
  elicited requirements. Answer in chat and create the Linear batch.
- The writes this skill authorizes are Linear issues in Backlog and their
  relations, plus updates and cancellations to issues it previously created from
  the same source. The Codex adversarial pass remains review-only.
- No product-code writes, no promotion to Todo, no implementation dispatch.
- A Backlog issue never authorizes implementation. Pedro's follow-up
  conversation is the specification step; promoting to Todo is how he says so.
