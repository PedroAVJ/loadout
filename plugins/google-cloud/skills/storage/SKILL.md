---
name: storage
description: Work with Google Cloud Storage — the repo-scoped prefix convention, when a bucket earns its own existence, and how to establish which buckets an agent may write before touching one. Use when reading, listing, or inspecting objects, deciding where something belongs, creating buckets, or auditing storage. For publishing an artifact to a URL, use the publish skill instead.
---

# Cloud Storage

This skill carries the conventions. It deliberately does not name projects or
buckets — that is instance data, it changes, and a stale hardcoded table is
worse than no table. Discover the current layout first:

```bash
gcloud projects list
gcloud storage ls --project=<project>
gcloud storage buckets describe gs://<bucket> --format="value(name,location,uniformBucketLevelAccess.enabled,publicAccessPrevention)"
```

## Establish The Bucket's Job Before Writing

Buckets in the same project look interchangeable and are not. A bucket
generally does one of three jobs, and only the first is agent-writable:

| Job | Agent access | How to recognize it |
| --- | --- | --- |
| Published artifacts for embedding | read + write | world-readable, mixed content, referenced from docs |
| Backups | **read only** | dated dump paths, written by a scheduled runner, `public_access_prevention: enforced` |
| Live application media | **read only** | structured paths the running app resolves by URL |

Reading is always fine, and verifying a backup ran is a legitimate task. But
**never write, delete, or reorganize a bucket serving a live application or
holding backups.** Renaming an object a running app resolves breaks the app;
a backup bucket is usually the only irreplaceable data present. If something
looks missing or stale, report it — do not repair it from here.

When the job is not obvious from the name, ask rather than guess.

## Prefix Convention

**`<repo-or-owner>/<kind>/…`** — one top-level segment naming the repo or
person the artifact belongs to, then what kind of thing it is.

Buckets are globally unique and carry IAM and lifecycle overhead, so scoping
happens in prefixes, never by minting a bucket per repo. Every repo can have
its own storage; that means its own *prefix*, in a shared bucket.

Objects predating the convention may use other schemes. Do not retro-migrate
them — published URLs are live and linked from repo docs and external
documents. Apply the convention to new uploads only.

## Creating Buckets

The default answer is a new prefix, not a new bucket. A bucket earns its own
existence only when it needs a different **access posture, lifecycle policy,
or billing boundary** — that is the whole test.

```bash
gcloud storage buckets create gs://<name> \
  --project=<project> \
  --location=<match-existing-region> \
  --uniform-bucket-level-access
```

Match the region already in use, keep uniform bucket-level access on, and
state the storage class and ongoing cost before creating anything billable.

## Verify The Safety Net Rather Than Assuming It

Do not assume lifecycle rules, versioning, or soft-delete are configured.
Check, and say plainly what is missing:

```bash
gcloud storage buckets describe gs://<bucket> --format="value(lifecycle,versioning.enabled,softDeletePolicy.retentionDurationSeconds)"
```

Where versioning and soft-delete are off, **a delete is unrecoverable**.
Require an explicit yes naming the exact object, and prefer a `--dry-run`
first where the tooling supports it.

A bucket whose `publicAccessPrevention` is `inherited` has genuinely
world-readable objects. Never place anything private, personal, or
client-confidential in one.
