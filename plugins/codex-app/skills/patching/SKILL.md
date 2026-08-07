---
name: patching
description: Patch, re-sign, or restore the local macOS Codex desktop app bundle — Electron ASAR repacking, Info.plist ElectronAsarIntegrity hash repair, ad-hoc codesigning, and rollback from backup. Use only when the user explicitly asks to modify the installed Codex app. To inspect the app without changing it, use the internals skill instead.
---

# Codex App Patching

Local surgery on `/Applications/Codex.app`. Careful forensics and patch
workflow, not general app development.

## Read This Before Patching

**A patched bundle stops taking official updates.** Ad-hoc re-signing breaks
the updater, so every subsequent release has to be reinstalled by hand, and
each reinstall wipes the patch and needs the whole workflow again against
newly minified code. This is the reason the practice was abandoned locally —
the recurring cost outweighed what the patches bought.

So before touching anything:

1. **Check whether the feature already shipped.** Use the `internals` skill.
   Most historical patches here were workarounds for behavior that later
   landed officially, sometimes already present behind a flag.
2. **Check whether config reaches it.** `~/.codex/config.toml`, especially
   `[features]`, turns things on without touching the bundle.
3. **Confirm the user wants the update cost.** They should be saying yes to
   manual updates from here on, not just yes to the feature.

Only proceed past all three. If you patch anyway, say plainly in the report
that automatic updates are now broken.

## Operating Rules

- Identify the exact app version and back up `app.asar`, `app.asar.unpacked`,
  and `Info.plist` before touching the bundle. A backup is valid only for the
  version it came from.
- Patch the smallest possible expression in the extracted ASAR. Minified
  function names and hashed bundle names change every release.
- After repacking, update `Info.plist`
  `ElectronAsarIntegrity:Resources/app.asar:hash` with the **ASAR header
  hash**, not the whole-file hash. This is the step most often gotten wrong,
  and it fails at launch rather than at patch time.
- Re-sign after any bundle change: `codesign --force --deep --sign -`.
- macOS Keychain prompts for `Codex Safe Storage` are expected after ad-hoc
  re-signing. That item is Electron safe-storage material, not the user's
  OpenAI password — say so rather than letting it read as a credential
  request.
- Never replay an old patch binary against a newer version. Re-locate the
  behavior in the current bundle.
- Do not keep stale `app.asar` backups for a patch whose behavior has since
  shipped. Keep the workflow, not the artifact.

## Workflow

Read `references/asar-workflow.md` for the full command sequence — backup,
extract, locate, repack, header hash, install, re-sign, verify — and for the
restore-from-backup path.

## Reporting

Include:

- app version and bundle path
- files backed up and changed
- ASAR header hash update status
- `codesign --verify` result
- whether the app was launched or left untouched
- an explicit note that official updates now require manual reinstall
