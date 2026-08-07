---
name: bdd-test
description: Minimal BDD tests — a behavior contract (Feature/Given/When/Then Markdown) paired with a Playwright script that automates it. Use to turn specs into human-reviewable acceptance criteria and executable tests.
---

# BDD Test

## Goal
Write a comically simple, human-reviewable behavior contract and a Playwright script that automates it.

## Folder Structure
```
bdd/{feature}/
  {flow}.md             # the behavior contract
  {flow}.bdd.ts         # Playwright script that automates the contract
```

## Contract Format
- One Markdown file per flow.
- First line: `Feature: ...`
- Then only step lines beginning with: `Given`, `When`, `Then`, `And`
- Keywords must be capitalized exactly as shown above.
- Steps must be user-observable and testable (avoid implementation details).
- No comments or metadata. The file path and name convey the source.

## Workflow
1. Identify the flow boundary (one user goal).
2. Draft the contract steps:
   - Put the minimal `Given` preconditions first.
   - Write actions as `When` and assertions as `Then`.
   - Interleave `When` and `Then` in a linear script when the flow has multiple stages.
3. Self-check:
   - Every `Then` is something a user can observe.
   - Any ambiguity is captured as an explicit assumption.
   - If the file gets long, split into multiple flows.
4. Write the Playwright script that automates the contract.
   - Treat the contract as the source of truth; update the contract first if requirements change.
   - Implement shared preconditions (login, seeded data, frozen time) via fixtures/helpers to keep tests independent without duplicating setup.

## References
- Template: `references/template.md`
- Writing rules: `references/writing-rules.md`
- Paths and naming: `references/path-and-naming.md`
- Examples: `references/examples.md`
