# Path and Naming

## Folder structure
```
bdd/{feature}/
  {flow}.md             # the behavior contract
  {flow}.bdd.ts         # Playwright script that automates the contract
```

## Where to put bdd folders (repo-agnostic heuristic)
1. If `tests/bdd/` exists, use it.
2. Else if `tests/` exists, create `tests/bdd/`.
3. Else if `test/` exists, create `test/bdd/`.
4. Else create `bdd/` at the repo root.

## Naming
- `{feature}`: a stable domain name, e.g. `auth`, `billing`, `catalog`, `step5-catalogo`.
- `{flow}`: a verb phrase in hyphen-case, e.g. `cambiar-color-perfil`, `delete-category`, `reset-password`.

## One file per flow
Keep one user goal per file. If a flow has multiple distinct branches, split into multiple files.
