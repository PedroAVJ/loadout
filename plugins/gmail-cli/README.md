# Loadout Gmail CLI Plugin

Use Gmail through the authenticated Google Workspace CLI, `gws`.

This plugin is for raw Gmail workflows where connector-shaped tools are not enough: exact Gmail API metadata, original MIME source, unsupported MIME types, binary attachments, and base64url attachment decoding.

This project is unofficial and is not affiliated with Google.

## Requirements

- `gws` installed and authenticated.
- Gmail API enabled for the OAuth project used by `gws`.

## Start

```bash
gws auth status
gws gmail users getProfile --params '{"userId":"me"}'
```

Use the `gmail-cli` skill in Codex or Claude Code for the safety rules and helper commands.
