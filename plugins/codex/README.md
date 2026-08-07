# Codex App

Local forensics on the installed macOS Codex desktop app.

The bundle skills are split by whether they write to it.

## Skills

| Skill | Does |
| --- | --- |
| `internals` | Extract and search the app bundle read-only — feature flags, gated behavior, config keys, IPC surfaces, version. Never writes. |
| `patching` | Modify the bundle: ASAR repack, `ElectronAsarIntegrity` hash repair, ad-hoc re-signing, restore from backup. |
| `automations` | Where `automation.toml` lives, heartbeat vs cron, why an automation looks missing when it is not, and how plugin/skill changes reach a running app. |

The split matters because the two have completely different costs. Reading
the bundle is free and reversible by definition. Patching it breaks the
official updater — every subsequent release needs a manual reinstall, and each
reinstall wipes the patch.

That cost is why patching was abandoned locally. The workflow is kept because
the knowledge is expensive to reconstruct, not because it is recommended.

## The Useful One Is `internals`

Codex ships behavior before it ships UI. Flags, gated panes, and config keys
land in the bundle ahead of any announcement, so reading it answers "can the
installed version already do this?" — which is usually the real question, and
which patching was often a premature answer to.

## Install

```bash
claude plugin install codex-app@loadout
```

```bash
codex plugin add codex-app@loadout
```
