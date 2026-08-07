---
name: storage
description: Work with Pedro's Google Cloud Storage buckets — which bucket holds what, the repo-scoped prefix convention, and which buckets an agent must never write to. Use when reading, listing, or inspecting objects, deciding where something belongs, creating buckets, or auditing storage. For publishing an artifact to a URL, use the publish skill instead.
---

# Cloud Storage

All storage lives in `pedro-app-storage-20260801`, in three buckets with
three unrelated jobs. Knowing which is which is the whole point of this
skill — the buckets look interchangeable and are not.

| Bucket | Job | Agent access |
| --- | --- | --- |
| `…-public` | Artifacts published for embedding — Notion assets, spec evidence, distributables | **read + write** |
| `…-private` | Production Postgres backups for avanza-control | **read only** |
| `…-pinggo` | Live product-catalog media | **read only** |

```bash
gcloud storage ls --project=pedro-app-storage-20260801
gcloud storage ls -r "gs://pedro-app-storage-20260801-public/**"
```

## The Two You Must Not Write

**`…-private`** holds `avanza-control/postgres/{daily,weekly,monthly}/*.dump`
— live production database backups, written every morning by a scheduled
runner on the avanza-control server (`pnpm backup:postgres`, its own service
account, retention `KEEP_DAILY=30 / KEEP_WEEKLY=12 / KEEP_MONTHLY=12`
enforced in application code, not bucket lifecycle). This is the only
irreplaceable data in the substrate. `public_access_prevention` is
`enforced`.

Reading is fine and useful — verifying a backup ran is a legitimate task:

```bash
gcloud storage ls -l "gs://pedro-app-storage-20260801-private/avanza-control/postgres/daily/" | tail -5
```

Never upload, delete, or reorganize anything under it. If a backup looks
missing or stale, report that; do not try to fix it from here.

**`…-pinggo`** serves a live product catalog at
`catalogo/{catalog}/items/{item}/colors/{color}/{image,video}/…`, migrated
off Vercel Blob on 2026-08-01. Paths are referenced by the running
application, so renaming or deleting an object breaks the product. The
application owns writes.

## The Public Bucket

This is the one an agent writes, and only through the `publish` skill, which
handles naming, content types, and the Drive-vs-GCS routing question.

**Prefix convention: `<repo-or-owner>/<kind>/…`** — one top-level segment
naming the repo or person the artifact belongs to, then what kind of thing it
is. Buckets are globally unique and carry IAM and lifecycle overhead, so
scoping happens in prefixes, never by minting a bucket per repo.

Existing objects predate the convention and use four different schemes
(`notion-assets/near/…`, `speakpaste-spec-evidence/…`, `diana/apks/…`,
`speakpaste/…`). Do not retro-migrate them — the URLs are live and linked
from repo docs. Apply the convention to new uploads only.

```bash
gcloud storage ls "gs://pedro-app-storage-20260801-public/"
```

## Things That Are Not Configured

State these plainly rather than assuming a safety net exists:

- **No lifecycle rules on any bucket.** Nothing expires. Every artifact
  published to `…-public` lives until someone deletes it by hand. Worth
  raising if the bucket grows, not worth pre-emptively fixing.
- **No object versioning.** A delete is a delete.
- `…-public` and `…-pinggo` have `public_access_prevention: inherited`, so
  their objects are genuinely world-readable by URL. Never put anything
  private, personal, or client-confidential in them. Uniform bucket-level
  access is on for all three.

## Creating Buckets

In scope when Pedro asks, but the default answer is a new prefix, not a new
bucket. A bucket earns its own existence only when it needs a different
access posture, lifecycle policy, or billing boundary — which is exactly why
`…-pinggo` is separate from `…-public` despite both being public.

```bash
gcloud storage buckets create gs://<name> \
  --project=pedro-app-storage-20260801 \
  --location=US-CENTRAL1 \
  --uniform-bucket-level-access
```

Match the existing region (`US-CENTRAL1`) and keep uniform bucket-level
access on. State the storage class and the ongoing cost before creating.

## Deleting

`gcloud storage rm` is unrecoverable — no versioning, no soft-delete
configured. Require an explicit yes naming the exact object, and prefer
`publish-file --json delete … --dry-run` for anything in `…-public`.
