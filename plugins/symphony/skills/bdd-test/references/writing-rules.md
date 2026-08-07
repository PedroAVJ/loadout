# Writing Rules

## Non-negotiables
- Every `Then` must be something a user can observe (UI text/visibility, navigation, API status/body, etc.).
- Avoid implementation details (no libraries, internal functions, seeds, fixtures, or class names).
- Write the smallest flow that is still meaningful. If the file gets long, split it.
- Prefer a linear script and interleave `When` and `Then` so it is obvious what each action is validating.
- Use `And` to extend the current section (`Given`, `When`, or `Then`). Do not introduce new keywords.

## Determinism guidance
- If a behavior depends on time, randomness, network, or external systems, call it out as an assumption.
- If setup is required (login, seeded data), express it as a `Given` even if automation will implement it via fixtures.

## Copy brittleness (important)
- If copy is part of the spec, asserting on exact strings is fine.
- If copy is likely to change, prefer stable descriptions over implementation details:
  - sections/areas (e.g. "the catalog section") instead of literal routes (e.g. `"/catalogo"`)
  - user intent (e.g. "I confirm") instead of quoted button labels (e.g. `I click "Confirmar"`)
  - semantic roles (e.g. the confirm action, the delete action) if the UI has them
- Contracts describe behavior from the user's perspective. Routes, CSS selectors, data attributes, and exact button labels are implementation details.
- If you cannot avoid copy, keep the contract correct and accept that tests may need updates when copy changes.

