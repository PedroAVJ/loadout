# Symphony

Local Codex plugin for Pedro's explicit Symphony meta-workflow loops.

## Where The Name Comes From

[Symphony](https://github.com/openai/symphony) is OpenAI's open-source spec for
Codex orchestration, published February 2026 under Apache-2.0 with an Elixir
reference implementation. It "turns project work into isolated, autonomous
implementation runs, allowing teams to manage work instead of supervising coding
agents": a daemon polls a tracker such as Linear, claims eligible issues, gives
each one a per-issue workspace, launches a coding agent against it, and tracks
the run to a handoff state. Workflow policy lives in-repo in `WORKFLOW.md` so the
agent prompt and runtime settings are versioned with the code. `SPEC.md` is the
normative document; OpenAI states it does not intend to maintain Symphony as a
product, and expects forks and reimplementations.

This plugin is Pedro's reimplementation of that thesis at N=1, and it keeps the
principles rather than the Elixir:

- **Manage the work, not the agent.** Pedro reviews packets and results, not
  agent turns.
- **Isolate every run.** Fresh threads and worktrees per unit of work, so runs
  never contend over one checkout.
- **Keep the policy in the repo.** Skills and `AGENTS.md` are versioned
  alongside the code they govern, the same role `WORKFLOW.md` plays upstream.
- **Prove the work landed.** Runs end at merge/release proof or an explicitly
  named handoff state, never at "the agent said it was done."

The differences are deliberate. Upstream Symphony is a continuously polling
daemon over a whole board; this plugin runs only when Pedro invokes a lane, plus
the scheduled intake watchers governed by `intake-automation`. The parts of the
lifecycle upstream leaves implementation-defined — branch and PR policy, release
proof, tracker reconciliation — are exactly what `merge`, `azure-merge`, and
`codex-review` pin down here.

Codex owns stewardship: grounding, source boundaries, issue lifecycle judgment,
and final reporting. Symphony owns repeatable workflow shape. Claude may be
invoked as a collaborator for design, HTML, presentation, or UI implementation
passes, but Claude should not become the source of truth for work status.

## Current Role

- Coordinate source-of-truth intake from WhatsApp, meetings, Linear, git, and
  repo docs when Pedro explicitly asks for a Symphony workflow.
- Elicit requirements into approved Linear work packets before implementation.
- Dispatch approved Linear work into separate Codex implementation threads so
  Pedro can follow up there with fresh context.
- Preserve meeting/call/audio evidence before issue extraction.
- Analyze elicited requirements against SWEBOK and create each one as a Linear
  Backlog issue, so the complete candidate set is available as tracked work for
  Pedro's specification decisions.
- Keep implementable Linear work separate from bookmarks, vague future topics,
  and canceled/obsolete scope.
- Run coverage checks as a mode of requirements elicitation so stakeholder
  input has issue/comment/doc tracking without making Linear the full spec.
- Treat issue/spec rewrites as a restart boundary for stale work.
- Run explicit Codex review, merge, release-proof, and Azure DevOps lifecycle
  lanes when Pedro asks for shipping work.
- Generate sprint-review and stakeholder-facing artifacts from grounded issue
  and repo state.
- Surface concise completion/status updates to Pedro after the workflow has
  actually finished.
- Govern unattended intake automations: a cheap watcher spawns a capable worker,
  the worker lands its code, and outbound side effects stay gated.

## Repo-Specific Boundary

Individual product repos are not Symphony-owned implementation lanes by default.
Ordinary repo work should use normal Codex repo behavior: read the repo, answer
from the source of truth, implement the issue directly, and handle chats one at
a time.

Do not use Symphony to automatically intake, create, rewrite, restart, merge,
or monitor implementation issues. Use Symphony for a repo only when Pedro
explicitly invokes it for a meta artifact or workflow, such as a grounded review
HTML, a deliberately scoped intake audit, or a status summary.

## Skills

- `symphony`
- `intake-automation`
- `elicitation`
- `analysis`
- `requirements-elicitation`
- `requirements-map`
- `delivery-map`
- `issue-explainer`
- `implementation-dispatch`
- `linear-issue-writer` (compatibility/internal issue-body rules)
- `issue-intake` (compatibility alias)
- `coverage-pass` (compatibility mode)
- `codex-review`
- `review-handoff`
- `change-preview`
- `sprint-review`
- `merge`
- `azure-publish-changes`
- `azure-merge`
- `linear` (workspace-wide issue conventions)
- `bdd-test` (behavior contracts paired with Playwright automation)

`intake-automation` is the unattended edge: the rules a scheduled Codex
automation follows when it wakes on a heartbeat with nobody watching — watcher
versus worker tiers, explicit model escalation on spawn, worktree choice, the
requirement that code work actually gets pushed, and the hard boundary at
outbound sends. It governs the automation prompt; the work the spawned worker
does still runs through the ordinary lanes below.

The last two are standing conventions rather than lifecycle steps. `linear`
governs every issue in the workspace however it was created — no priorities,
one repo label, plain-English references — and sits underneath
`requirements-elicitation` and `linear-issue-writer` rather than competing
with them. `bdd-test` is the acceptance-criteria format the lifecycle produces
when a work packet needs a human-reviewable contract.

## Boundary

This plugin is a product-style workflow plugin, not an MCP server. Add
MCP tools only when there is a concrete runtime action that cannot be handled
cleanly by Codex skills, existing app connectors, the Symphony CLI, or local
scripts.
