# Loadout Google Drive CLI Plugin

Use Google Drive through the authenticated Google Workspace CLI, `gws`.

This plugin is for Drive search, metadata inspection, downloads, Google-native exports, uploads, folder creation, and permission reads or guarded writes.

This project is unofficial and is not affiliated with Google.

## Requirements

- `gws` installed and authenticated.
- Drive API enabled for the OAuth project used by `gws`.

## Start

```bash
gws auth status
gws drive files list --params '{"pageSize":10,"fields":"files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken"}'
```

Use the `google-drive-cli` skill for read-first safety rules and sharing guardrails.
