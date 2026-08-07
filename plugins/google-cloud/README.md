# Google Cloud

Google Cloud through the `gcloud` CLI, plus the storage substrate this
machine actually uses.

## Why The CLI, Not An MCP Server

`gcloud` is a wrapper over the Google Cloud REST APIs and exposes effectively
the entire surface. An MCP server fronting the same platform exposes a curated
subset — a product decision, not a technical ceiling. So reaching Google Cloud
through MCP is strictly *less* capability at the cost of extra context for
tool schemas.

Google does ship an official MCP server ([`googleapis/gcloud-mcp`](https://github.com/googleapis/gcloud-mcp),
in preview, not covered by Google Cloud ToS) and official per-service skills
(`google/skills`). Neither is installed here. The rule in this repo is
CLI + skill, and MCP only when no callable interface exists — `gcloud` is
callable, so it wins.

## Skills

| Skill | Use it when |
| --- | --- |
| `google-cloud` | Any GCP task: which project a thing lives in, auth, scoping commands, provisioning, and the safety boundary around production resources. |
| `storage` | Which bucket holds what, the repo-scoped prefix convention, and which two buckets are read-only for agents. |
| `publish` | Turning a local file into a durable URL — including deciding whether it belongs in Cloud Storage or Google Drive at all. |

## The Substrate

One project, `pedro-app-storage-20260801`, three buckets with unrelated jobs:

- `…-public` — published artifacts, agent-writable
- `…-private` — avanza-control production Postgres backups, **read only**
- `…-pinggo` — live product-catalog media, **read only**

The write boundary is the reason this plugin exists. The buckets look
interchangeable and are not.

## Bundled CLI

`publish-file` uploads a local file and returns JSON with `url`, `pathname`,
and `etag`. It uses Application Default Credentials.

```bash
gcloud auth application-default login
./bin/publish-file.mjs --json doctor
```

```bash
pnpm --dir plugins/google-cloud test
```

## Install

```bash
claude plugin install google-cloud@loadout
```

```bash
codex plugin add google-cloud@loadout
```
