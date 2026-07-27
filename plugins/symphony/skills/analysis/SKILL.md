---
name: analysis
description: "Use when Pedro wants Symphony to analyze requirements: apply the SWEBOK definition of a requirement and deliver one requirements table (classified along the kept SWEBOK dimensions, with allocation-minted derived rows and a blocked-by column), a conflicts list typed by SWEBOK's three conflict types, and a logical data-model diff when the requirements reshape data. Persist the final analysis as a source-scoped repo ledger when a target product repo is available. Allocation runs under the hood, never as output."
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

- annotate the prior ledger row that captured the requirement (update in
  place, source-attributed), or
- leave nothing when no prior row exists — git history is the record of
  shipped behavior.

A demonstrated behavior still earns a row when something remains demanded:
the source imposes a change to it, leaves an open question or a pending
stakeholder validation, or puts it in conflict.

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

## Allocation

Allocation runs under the hood. It is never a section of the output — its
visible residue is rows and columns in the requirements table.

Hold each requirement against the target system's decomposition and assign
it internally to the component responsible for satisfying it. Components
are feature-area boxes — for TradeInCode: monitoring, trips, customs,
IntegratorAPI, Nova frontend, and so on — never implementation mechanisms
(mutation vs EF hook vs background job is design inside the box, below
this skill; do not design inside the boxes).

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

Present the complete table and conflicts list in chat. Do not replace the
deliverable with a summary, selected rows, or a link to the persisted file.
Pedro uses the complete candidate set to choose which item to specify next.

## Repository Ledger

When a target product repo is available, persist the final analysis under:

```text
docs/requirements-analysis/YYYY-MM-DD[-to-YYYY-MM-DD]-topic.md
```

The date or date range identifies the source evidence, not the day the file is
written. Use a stable, source-scoped filename so re-analysis of the same source
updates the same ledger instead of creating copies.

The file begins with:

- an explicit `Analysis only — not approved implementation scope` status;
- links or repo-relative paths to every canonical source;
- the analysis date; and
- a short statement that row IDs are discussion references, not Linear issue
  IDs, and do not authorize implementation.

Then write the same complete requirements table and conflicts list presented in
chat. Number the final reconciled table contiguously from R1 before first
persisting it — rows dropped during drafting (including the Codex pass) leave
no gaps. Identifier stability begins at first persist: from then on keep row
identifiers stable, and a row removed by later re-analysis leaves its gap so
surviving references hold. When later evidence
changes the analysis, update the row with its source attribution intact; never
silently harden a hedge into an approved specification.

If `docs/requirements-analysis/README.md` does not exist, create it. It must
explain this lifecycle:

```text
source evidence -> analysis ledger -> Pedro chooses and specifies a candidate
-> Linear implementation work
```

The README must say plainly that analysis ledgers are not approved scope,
Linear issues, implementation authorization, or delivery-status records.

If there is no target repo, or the environment is read-only, return the complete
analysis in chat and say that it was not persisted. Do not invent a repo or
write outside the product repo.

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

Skip the pass — and say so plainly — when the rescue subagent is
unavailable or returns nothing (including when this skill runs inside
Codex itself, where self-review adds nothing). Never fabricate a critique
on Codex's behalf.

## Contract

- Analysis is a classification and allocation pass over already captured or
  elicited requirements. Answer in chat and, when possible, persist the final
  analysis ledger in the target product repo.
- The only write this skill authorizes is the requirements-analysis Markdown
  artifact and its directory README. The Codex adversarial pass remains
  review-only and makes no edits.
- No Linear writes and no product-code writes from this skill.
- A candidate row never authorizes implementation. Pedro's follow-up
  conversation is the specification step; he chooses what proceeds.
