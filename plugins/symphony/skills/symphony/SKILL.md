---
name: symphony
description: "Use only when Pedro explicitly asks for Symphony or a Symphony-owned meta-workflow: requirements elicitation, implementation dispatch to a fresh thread, elicitation session capture, source-of-truth audits, Linear lifecycle hygiene, Codex review, merge/release proof, review artifacts, status summaries, or notifications after agent work completes."
---

# Symphony

Use this skill as the orchestration layer for Pedro's explicit meta-workflows.
Codex remains the steward: ground the state, decide the workflow boundary, call
the right tools or collaborators, and report the actual result.

## Repo-Specific Boundary

Individual product repos are not Symphony-owned implementation lanes by
default. For normal repo work, use that repo's AGENTS.md instructions and
ordinary Codex coding flow: inspect the source, implement the requested change,
verify it, and report back. Handle stakeholder chats and implementation details
one request at a time.

Do not use Symphony to automatically create, rewrite, restart, move, merge, or
monitor repo implementation issues. Use this skill for a product repo only when
Pedro explicitly invokes Symphony for a meta-workflow, such as a grounded review
artifact, a deliberately scoped intake audit, or a status summary.

## Core Model

- Symphony owns repeatable meta-workflow shape when explicitly invoked:
  requirements elicitation, implementation dispatch, lifecycle hygiene,
  code-review closeout, explicit merge/release proof, status review, and notify
  Pedro.
- Codex owns judgment and source boundaries.
- Claude owns artifact/design/presentation passes when useful, but not the
  canonical interpretation of work status.
- Linear tracks implementable work, real Needs Info blockers, and explicitly
  requested backlog parking. Do not create bookmark cards for vague future
  topics unless Pedro explicitly asks to park them.
- Symphony is not a background deploy daemon. Merge, release, and deploy actions
  happen only when Pedro explicitly asks for that lifecycle step or the current
  task clearly includes it.

## Two-Lane Product Work Model

For stakeholder-driven software work, prefer this split:

1. `requirements-elicitation`: read the source of truth, talk through
   meaning/scope with Pedro, check Linear coverage, and create/update the
   approved Linear work packet. Do not code.
2. `implementation-dispatch`: after Pedro approves implementation, create a
   fresh Codex thread/agent from the Linear issue and report that thread back.
   Do not implement in the elicitation thread.

The old intake, coverage, and issue-writing lanes are compatibility modes under
requirements elicitation. Use the two-lane model when the request is about
extracting requirements and then letting another agent implement them.

## Lifecycle Lanes

Use the narrower Symphony skills when the request names a lane:

- `intake-automation`: the rules for unattended scheduled/heartbeat watchers —
  watcher spawns worker, escalate the model explicitly on spawn, choose worktree
  versus main checkout by repo count, land code work with a branch/push/PR, keep
  outbound sends gated at a draft, and stay silent on an empty run. Use it when
  writing or auditing an automation prompt, and when a spawned worker must
  decide what "done" means with nobody watching.
- `elicitation`: capture elicitation sessions — meetings, calls, voice memos,
  transcripts, Drive/Gmail artifacts, and local media — as durable evidence
  before extraction.
- `analysis`: classify elicited requirements with the SWEBOK vocabulary
  (functional/nonfunctional, derivation, product/process, scope) into one
  requirements table with a blocked-by column, allocation running under
  the hood to mint derived rows, plus a conflicts list typed by SWEBOK's
  three conflict types; in-thread only, no writes.
- `requirements-elicitation`: extract grounded requirements into approved Linear
  work packets before implementation.
- `implementation-dispatch`: create a separate Codex implementation thread from
  an approved Linear issue.
- `linear-issue-writer`: compatibility/internal issue-body rules.
- `issue-intake`: compatibility alias for requirements elicitation.
- `coverage-pass`: compatibility mode for checking missing Linear/doc
  coverage.
- `codex-review`: run Codex review as closeout and verify findings.
- `review-handoff`: produce human-readable UI review videos or
  screenshots.
- `change-preview`: produce a Pedro-facing HTML preview artifact.
- `sprint-review`: produce grounded demo/review artifacts.
- `merge`: run explicit publish/merge/release-proof lifecycle.
- `azure-publish-changes` and `azure-merge`: use for
  Azure DevOps style publish and release proof.

## Source-Of-Truth Order

Choose the source before advising:

- What someone said or implied: WhatsApp, Gmail, transcript, or direct document.
- What work exists or is done: Linear plus git/PR/deploy state.
- What changed in code: repo diff/history and relevant tests.
- What should be presented: Done issues and merged/proven work first; in-flight,
  canceled, deferred, and unknown work in separate sections.

## WhatsApp / Meeting To Linear

When Pedro explicitly asks Symphony to turn messages, meetings, or stakeholder
feedback into work:

1. Read the actual source conversation or transcript before classifying intent.
2. Identify implementable work, Needs Info blockers, explicit backlog parking,
   canceled/obsolete items, and future-meeting topics.
3. Use `requirements-elicitation` for the issue/body/evidence shape.
4. Put uncertain or review-needed issues in Backlog/Needs Info unless Pedro asks
   for Todo.
5. Use Todo when the issue is implementation-ready and Pedro wants agents to
   pick it up.
6. Use `implementation-dispatch` to create a fresh implementation thread after
   Pedro approves pickup.
7. After rewriting a picked-up issue, move it back to Todo only when the new
   body should restart implementation.
8. If a stale PR/workspace exists for rewritten work, report the restart
   boundary clearly. Do not take over repo implementation unless Pedro
   explicitly asks for that separate coding task.

## Status And Completion

When Pedro asks whether something is done:

- Check Linear status, active Symphony workspace/log state, branch/PR state, and
  deploy/proof surfaces when relevant to the explicit Symphony workflow.
- Say plainly what is local, pushed, merged, deployed, canceled, blocked, or
  waiting for review.
- Do not say "done" when the issue is still Merging/HumanReview/In Progress.

## Collaboration With Claude

Invoke Claude through the local Claude plugin/workflow when the task benefits
from visual taste, editorial HTML, design critique, or UI implementation.
Ground the brief first. Claude receives a bounded brief; Codex verifies and
owns the final answer.
