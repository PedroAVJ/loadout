---
name: publish
description: Publish a local file to a durable public URL using the bundled publish-file CLI, so it can be embedded in Notion, linked from a repo doc, or handed to someone. Use when a generated image, screenshot, recording, PDF, APK, or other artifact needs a URL that outlives the session. Decides first whether the file belongs in Cloud Storage or Google Drive.
---

# Publish

Turns a local file into a URL that outlives the session.

## Ask This First: Embed Or Download?

The substrate depends entirely on who fetches the file, and getting it wrong
is the failure mode this skill exists to prevent.

| The consumer is | Use | Why |
| --- | --- | --- |
| An anonymous renderer — Notion image block, markdown `![](…)`, `<img>`, a page loading the asset | **Cloud Storage** (below) | Serves raw bytes with the right content type at a stable path you choose |
| A person who will open or download it — sending someone an APK, a document, an installer | **Google Drive** — hand off to the `google-drive-cli` plugin | Familiar UI, per-person access control, no world-readable URL |

Drive cannot do the first job. Google blocked anonymous hotlinking —
`drive.google.com/uc?export=view` returns 403, a consequence of the
third-party-cookie changes. Drive URLs are document identities
(`/file/d/{opaque-id}/view`), not resource locations, so there is no stable
path and no correct content type. Drive *will* serve bytes to an
authenticated caller (`files.get?alt=media`, which is how `google-drive-cli`
downloads), but never to the open internet.

The reverse mistake matters too: publishing a personal document to
`…-public` puts it at a world-readable URL with no expiry. When in doubt
about whether something should be public, ask.

## Cloud Storage Path

The bundled `publish-file` CLI wraps the upload. It resolves project and
bucket config, uses Application Default Credentials, and returns parseable
JSON.

```bash
publish-file --json doctor
```

Resolve `bin/publish-file` relative to the plugin root — from this skill file
that is `../../bin/publish-file`. Use that shim rather than the `.mjs` beside
it: plugin marketplaces copy source into a cache without running an
installer, so the shim installs the CLI's dependencies on first run. Invoking
the `.mjs` directly from a fresh install fails with `Cannot find package
'@google-cloud/storage'`.

Config resolves in order:
`GCP_PROJECT_ID` / `GCS_PUBLIC_BUCKET` / `GCS_PRIVATE_BUCKET` from the
environment or `--env-file`, then `~/.publish-file/config.json`. There are no
built-in defaults — an unconfigured install fails with a message naming the
config path rather than writing to someone else's bucket.

First-time setup:

```bash
gcloud auth application-default login
publish-file --json init
```

### Upload

Use the `<repo-or-owner>/<kind>/…` prefix convention from the `storage` skill.

```bash
publish-file --json upload ./output/sheet.png \
  --prefix speakpaste/spec-evidence \
  --add-random-suffix
```

`--dry-run` first on anything broad or uncertain:

```bash
publish-file --json upload ./report.pdf --prefix forfeit/reports --dry-run
```

For a URL that must stay stable across republishes, set the pathname
explicitly and drop the suffix — overwrite is a live write, so only pass
`--allow-overwrite` when Pedro asked for a replacement:

```bash
publish-file --json upload ./report.pdf \
  --pathname forfeit/reports/latest.pdf \
  --no-add-random-suffix \
  --allow-overwrite
```

Prefer `--json` always, and read `url`, `downloadUrl`, `pathname`, and `etag`
from it rather than reconstructing the URL by hand.

### Inspect And Manage

```bash
publish-file --json list --prefix speakpaste --limit 20
publish-file --json head speakpaste/spec-evidence/sheet.png
publish-file --json download speakpaste/spec-evidence/sheet.png --out /tmp/sheet.png
```

Delete only on an explicit request, and dry-run it first — the bucket has no
versioning, so a delete is final:

```bash
publish-file --json delete <url-or-pathname> --dry-run
```

`publish-file --json native ...` escapes to `gcloud storage` when a feature
is not exposed by the high-level commands.

## After Publishing

Report the URL and where it was written. When the artifact is going into a
repo doc, write the link in with it — the existing pattern is inline markdown
links, as in `SpeakPaste/docs/ios-keyboard-roundtrip-spec.md`, which
references seven published objects as spec evidence.

Remember that nothing expires. Published artifacts accumulate permanently, so
publish what needs to persist and be referenced — not one-shot review output,
which belongs in a temp directory.
