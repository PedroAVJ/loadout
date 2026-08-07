---
name: requirements-elicitation
description: "Use when Pedro wants Symphony to turn messy stakeholder input, WhatsApp messages, meeting/email evidence, screenshots, docs, or repo context into Linear work packets before implementation. This skill elicits the whole source in one pass, creates all candidate issues in Linear Backlog in a single batch for Pedro to review in Linear, and does not write product code."
---

# Symphony Requirements Elicitation

Use this as Symphony's canonical first lane: messy source evidence in, a batch
of draft Linear work packets out. Pedro reviews and promotes the drafts in
Linear; implementation happens later, usually through
`implementation-dispatch`.

## Contract

- Ground the requirement in the real source before interpreting it.
- Elicit the WHOLE source in one pass and create every actionable candidate as
  a draft Linear issue in a single batch — no per-issue approval gate for
  draft creation.
- Candidates are created in **Backlog** — never Todo, and not Triage. Backlog is
  the state for work still being worked out; Triage is an accept/decline gate
  and forces a binary call per item when the point is to iterate. Promotion to
  Todo is Pedro's review decision, per issue, in Linear or in chat.
- Do not write product code, open a PR, merge, deploy, or mark work review-ready
  from this skill.
- Do not dispatch an implementation thread until Pedro says to implement, pick
  it up, send it to an agent, or otherwise approves implementation.

## Source Order

1. Resolve and read the source of truth: WhatsApp, Gmail, meeting transcript,
   Drive doc, screenshots/media, Linear, repo docs, or code.
2. Use metadata-only discovery first for private chats; read the narrow message
   window needed to understand the ask.
3. Download/open cited screenshots, PDFs, photos, or annotated images when they
   affect scope.
4. Check Linear for existing coverage before proposing a new issue. Include
   inactive states such as Done, Duplicate, Obsolete, Canceled, and Needs Info
   when available.
5. Inspect repo docs/code only enough to avoid wrong or duplicate scope.

## Elicitation

Extract only action-shaped items:

- `Feature`: a missing capability, field, report, workflow, print detail, or
  user-visible behavior. (Call it Feature, not Requirement, in all output —
  and never as a Linear label; labels stay repo-only.)
- `Bug`: promised/current behavior is wrong, broken, regressed, or producing
  incorrect results.
- `Needs Info`: the desired behavior, data source, owner, or correctness rule is
  not clear enough to implement.
- `Deferred`: explicitly later, future-meeting, design/open discussion, or not
  concrete enough for near-term work.
- `Non-actionable`: status, scheduling, thanks, jokes, or background.

Each draft must stay an independently reviewable work packet — batch creation
does not mean merged scope. Split only when two outcomes can be implemented
and reviewed separately.

## Ordering

When one source yields multiple candidate issues, propose them in dependency
order — foundations first, consumers last — not in the chronological order
they came up in the source. Meetings tend to discuss problems top-down;
implementation goes bottom-up. State the dependency rationale so Pedro can see
why the order differs from the conversation. When an explicit stakeholder
"start here" signal conflicts with dependency order, surface the conflict
instead of silently picking one.

## Plain Language First

Phrase each requirement as what the user or system can do after the issue is
done, before any technical scope detail. Pedro should be able to approve the
packet without decoding implementation vocabulary. When a packet bundles
foundation work with a proving consumer (for example "store the token and make
one verified call"), say why the bundle exists and offer the split.

## Linear Rules

- If Pedro only asks what something means, what is missing, or whether it is
  covered, answer the question first and do not mutate Linear.
- When running an elicitation pass, create all `Feature` and `Bug`
  candidates as draft issues in one batch. `Needs Info` items become drafts
  too, flagged with their open question. `Deferred` and `Non-actionable`
  items are reported in chat, not created.
- If Pedro approves a draft for implementation, promote it to Todo unless he
  asks for a different state.
- If an existing issue already covers the work, update/comment on that issue
  instead of creating a duplicate draft.
- A Linear issue is a source-linked work packet, not a transcript summary or
  implementation plan.
- Include source pointers: person/thread/document, message IDs or timestamp
  range, media IDs/paths, transcript timestamps, repo paths, and Linear links
  when available.
- Include compact `Scope` and `Out of scope` sections whenever adjacent work is
  present in the same source.
- Add `Pedro-reviewed specification` only when Pedro explicitly supplies or
  approves exact wording/constraints as his specification.
- Do not add file-level implementation steps, test plans, acceptance criteria,
  architecture, or PR sequencing unless Pedro explicitly asks for that level of
  direction.

## Visual Evidence

When source media contains annotations, red marks, arrows, highlighted fields,
or verbally referenced areas:

- inspect each relevant visual item before writing the issue;
- list each marked area in plain language;
- give each area a disposition: `In this issue`, `Covered by ISSUE`, `Split to
  ISSUE`, `Out of scope because ...`, or `Needs Info`.

Do not say visual evidence is fully covered until each marked item has a
disposition.

## Output

After the batch is created, end with a compact result. Caveats come FIRST —
Pedro clears up what didn't fit before evaluating the drafts, so lead with
everything that is not cleanly an issue, then the draft list. Draft lines are
exactly: number, plain-sentence name (as a Linear link), type, state:

```markdown
Didn't fit / caveats (clear these first):

- ORPHANED_ASK_OR_AMBIGUITY_OR_CONFLICT — what it is, why it isn't a draft
- Covered already (no draft): ISSUE_OR_REASON
- Deferred / non-actionable: SHORT_LIST_OR_NONE
- (none) — when the batch is clean, say so explicitly

Elicitation result (N drafts created):

1. [PLAIN SENTENCE NAME](LINEAR_URL) — Feature|Bug — Backlog|Needs Info
...
```

Every action-shaped item from the source must end up either as a draft issue
or as a line in the caveats section Pedro can see — never only inside a
comment, a scope note, or your head.

Before listing anything under "Covered already", read the existing issue's
full body — a title match is not coverage; if the source decision changes an
input model or scope the issue doesn't state, that's a new draft, not
coverage.

When Pedro asks which issue to work on next, recommend ONE draft from the
batch through the `issue-explainer` lane (a standalone HTML decision
artifact) instead of re-listing everything in chat.

When Pedro approves implementation of a draft, promote it in Linear first,
then use `implementation-dispatch` in a separate step to create the fresh
agent thread.
