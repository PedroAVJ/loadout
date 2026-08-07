---
name: linear
description: Conventions for creating, updating, and discussing Linear issues in the user's workspace. Use whenever filing or editing a Linear issue, triaging issues, or referencing issues in conversation.
---

# Linear Conventions

How to use Linear in this user's workspace. These are standing conventions —
they apply to every issue regardless of which repo or project it came from.

## No priorities

Never set a priority on an issue. Leave it as "No priority"; if an existing
issue carries one, that's legacy — don't propagate it. Urgency, ordering, and
stakes are conveyed in the issue description (deadlines, what the work is
load-bearing for), not in the priority field.

## Label by originating repo

Every issue carries exactly one repo label: the repo whose work produced the
issue. The label set mirrors the user's local repos one-to-one.

- Before filing, list existing labels and use the matching one.
- If the originating repo has no label yet, create it (label name = repo
  name) with a one-line description of what the repo is, then apply it.
- Don't use labels for anything else (no priority-like labels, no status
  labels) unless the user introduces a new convention explicitly.

## Discussing issues: plain English first

Issue IDs (e.g. `ABC-123`) are codenames — never rely on them alone when
talking to the user. Lead with the plain-English name of the work ("the
citation-fix task"), keep the ID as a secondary reference, especially when
comparing order, dependencies, or scope between issues.

## Issue bodies

- Self-contained: a fresh agent must be able to pick the issue up cold —
  include absolute repo paths, file names, and enough context to act without
  the conversation that spawned it.
- Ground claims in sources (files, messages, links), not memory.
- Knowledge-work issues are first-class: the deliverable can be repo
  knowledge (analysis, citations, documentation), not just code.
- Assign to the requesting user by default.

## What this skill is not

This covers workspace-wide mechanics that hold for every issue, however it
was created. Two sibling skills sit above it and neither overrides it:

- `requirements-elicitation` — how issues get *discovered* from stakeholder
  input, and the approval gate before anything is created.
- `linear-issue-writer` — what belongs in an issue *body* when Symphony
  drafts one.

Conventions here (no priorities, one repo label, plain-English references)
apply to issues from those flows too.
