---
name: sqlite-cache-cli-pattern
description: Design and implement durable CLIs that sync API, export, or connector data into a local SQLite cache for reliable offline querying. Use when an agent is building a CLI that needs repeatable search, normalized identity resolution, org/user/contact rosters, incremental sync, import/export support, or local joins that a connector/search API cannot provide directly.
metadata:
  author: Pedro
  origin: local-self-authored
  source: hand-written
  provenance: not-openai-curated-not-plugin
---

# SQLite Cache CLI Pattern

Use this pattern when a service connector is good for live reads but bad for complete querying. The CLI should turn the service into a local, inspectable database with explicit sync/import steps and fast query commands.

## When To Use

Use a SQLite cache when:

- The source API/search connector cannot list or filter exactly.
- Future agent runs need repeatable local queries from any repo.
- Data needs normalization, joining, deduping, or enrichment.
- The service is mostly read-heavy, such as contacts, chats, tasks, docs metadata, logs, or billing exports.
- Offline or fixture-backed work is useful before live auth is ready.

Do not use this pattern for one-off transforms or tiny scripts where a JSON file is enough.

## When Not To Use

Do not add SQLite just because a CLI exists. Prefer a direct REST/API CLI when:

- The API already supports the exact reads, filters, pagination, and stable IDs the user needs.
- The CLI can answer the common questions with cheap live calls.
- The local cache would add stale-data risk without improving query quality.
- The workflow is mostly live writes or mutations where cached state could mislead agents.
- The dataset is small and the source API is fast, reliable, and expressive.

Example: a Google Tasks CLI can be useful without SQLite because the REST API directly lists task lists, resolves tasks, reads exact tasks, and performs narrow writes. Add a cache only for extra reporting/history needs such as cross-list analytics, completed-task history, stale-task audits, or offline search.

## Command Shape

Build the CLI around sync first, then query:

```bash
tool --json doctor
tool --json init --db-path ~/.local/share/tool/data.db
tool --json sync --limit 100
tool --json import-json export.json
tool --json db path
tool --json db stats
tool --json entities search "Acme"
tool --json entities get ENTITY_ID
tool --json groups list
tool --json groups entities "Acme"
```

Keep commands composable. Avoid one giant `fix` or `auto` command.

## Storage

Default to:

```text
~/.local/share/<tool-name>/<domain>.db
```

Support overrides:

```bash
export TOOL_DB_PATH=/path/to/cache.db
tool init --db-path /path/to/cache.db
```

Keep config separate from cache:

```text
~/.<tool-name>/config.json
```

## Schema Pattern

Use one canonical entity table plus normalized child tables:

```sql
CREATE TABLE entities (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  source TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE entity_keys (
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  kind TEXT NOT NULL,
  UNIQUE(entity_id, key, kind)
);
```

Add domain child tables such as `phones`, `emails`, `organizations`, `labels`, or `memberships`. Use `entity_keys` for normalized lookup keys such as phone variants, slugs, aliases, external IDs, and last-10 fallbacks.

## Sync Rules

- Make `doctor` work without auth and report missing setup instead of crashing.
- Make `sync` idempotent with upserts by stable source ID.
- Store raw source JSON for debugging and future schema changes.
- Add `import-json` or `import-csv` before live auth if exports are available.
- Record `last_sync` or `last_import` in a `metadata` table.
- Keep write commands separate from sync, and omit writes entirely if the CLI should stay read-only.

## Query Rules

- Query SQLite for exact filters, joins, and rosters.
- Return stable JSON under `--json`.
- Include enough source fields for follow-up commands: row ID, source ID, display name, normalized keys, and related child rows.
- Mark fuzzy or fallback matches clearly, for example `matched_exact`, `matched_normalized`, `matched_last10`, or `unresolved`.

## Guardrails

- Do not hide live API writes in sync or resolve commands.
- Do not print tokens, cookies, or refresh tokens.
- Do not treat a partial connector search as complete database truth.
- Do not delete cache rows on sync unless tombstones, full sync semantics, or explicit `prune` behavior are implemented.
