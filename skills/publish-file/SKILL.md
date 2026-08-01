---
name: publish-file
description: Publish local files to durable URLs using the installed publish-file CLI, backed by Google Cloud Storage. Use when an agent needs to upload generated images, PDFs, screenshots, archives, or other local artifacts; embed uploaded assets in Notion or Markdown; inspect/list/download/delete published files; or verify publishing auth from any repo.
---

# Publish File

Use the installed `publish-file` CLI as the command surface for local file publishing. The backing provider is Google Cloud Storage.

## Start

Verify the command and auth state first:

```bash
command -v publish-file
publish-file --json doctor
```

Storage settings are resolved in this order:

1. `GCP_PROJECT_ID`, `GCS_PUBLIC_BUCKET`, and `GCS_PRIVATE_BUCKET` from the environment or `--env-file`
2. `~/.publish-file/config.json`
3. The CLI's built-in Pedro App Storage defaults

Authentication uses Google Application Default Credentials. Initialize them and store the bucket configuration with:

```bash
gcloud auth application-default login
publish-file --json init
```

## Upload Files

Use `upload` for generated images, contact sheets, PDFs, and handoff artifacts that need a URL.

```bash
publish-file --json upload ./output/imagegen/sheet.png \
  --prefix notion-assets \
  --add-random-suffix
```

Use `--dry-run` before a broad or uncertain upload:

```bash
publish-file --json upload ./output/imagegen/sheet.png \
  --prefix notion-assets \
  --dry-run
```

For a stable pathname, avoid the random suffix and allow overwrite only when the user asked for replacement:

```bash
publish-file --json upload ./report.pdf \
  --pathname reports/latest.pdf \
  --no-add-random-suffix \
  --allow-overwrite
```

## Inspect And Manage

List recent objects:

```bash
publish-file --json list --prefix notion-assets --limit 20
```

Read metadata:

```bash
publish-file --json head notion-assets/sheet.png
```

Download to a file:

```bash
publish-file --json download notion-assets/sheet.png --out /tmp/sheet.png
```

Delete only when the user explicitly asks:

```bash
publish-file --json delete https://storage.googleapis.com/pedro-app-storage-20260801-public/notion-assets/sheet.png --dry-run
```

## Safety

- Prefer `--json` so future steps can parse `url`, `downloadUrl`, `pathname`, and `etag`.
- Do not print access tokens or service-account credentials. `doctor` reports only whether application-default auth is available.
- Use public uploads for Notion/Markdown embeds that need to render without auth.
- Use private uploads only when the consumer can authenticate or when the URL should not be embedded publicly.
- Treat `delete`, `copy --allow-overwrite`, and `upload --allow-overwrite` as live writes; use `--dry-run` unless the user has already approved the write.
- Use `publish-file --json native ...` only when the high-level commands do not expose a Google Cloud Storage CLI feature.
