# Loadout Google Contacts CLI Plugin

Use Google Contacts through the authenticated Google Workspace CLI, `gws`.

This plugin is for resolving people, phone numbers, organizations, and WhatsApp identities through Google People and Contacts APIs.

This project is unofficial and is not affiliated with Google.

## Requirements

- `gws` installed and authenticated.
- People API enabled for the OAuth project used by `gws`.

## Start

```bash
gws auth status
gws people people get --params '{"resourceName":"people/me","personFields":"names,emailAddresses"}'
```

Use the `google-contacts` skill when identity, phone-number, or company matching is unclear.
