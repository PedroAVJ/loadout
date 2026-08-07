---
name: automations
description: How the Codex desktop app really stores and schedules automations — the SQLite runtime store, the generated automation.toml export, and why editing that file does not change anything. Use before reading, creating, editing, or reporting on a Codex automation, and before believing a directory listing of ~/.codex/automations.
---

# Codex Desktop Automations

Verified against ChatGPT.app `26.803.41515` (build 6321). Codex ships inside
`/Applications/ChatGPT.app`, not a standalone `Codex.app` — resolve the bundle
by identifier, never by name.

## The Store Is SQLite. The TOML Is An Export.

```text
~/.codex/sqlite/codex-dev.db     <- the real thing
  automations                    id, name, prompt, status, rrule, cwds,
                                 target_type, project_id, model,
                                 reasoning_effort, next_run_at, last_run_at
  automation_runs                run history, FK to automations.id

~/.codex/automations/<id>/automation.toml   <- generated output
```

The Electron main process owns the table and mutates it with
`INSERT OR REPLACE INTO automations (...)`. Separately it runs an export,
**once per process**, that reads the automations out of the database and writes
each `automation.toml` — atomically, to a `.automation.toml.tmp-<ts>-<uuid>`
that is then renamed into place.

The data flows **database → file**. Nothing about the schedule is driven by the
file.

## Do Not Edit automation.toml

Editing that file does not change the automation. The scheduler does not read
it, and the next export overwrites it from the database. A hand-edit that
appears to survive proves nothing — the export simply has not run yet.

The supported mutation path is the app's `automation_update` tool, which
handles create, update, view, and delete. The app's own guidance is explicit:
never hand-write automation directives, and prefer updating an existing
automation over creating a near-duplicate. Preserve fields you were not asked
to change.

To change an automation, use the app or `automation_update`. If neither is
reachable from where you are, say so and hand it back — do not fall through to
writing the file.

## Reading Automations

Two surfaces, and they can disagree:

- **Authoritative**: query the database.

  ```bash
  sqlite3 -header ~/.codex/sqlite/codex-dev.db \
    "select id, name, status, rrule, last_run_at from automations;"
  ```

- **Convenient but derived**: `~/.codex/automations/*/automation.toml`. The
  app's built-in tool description points agents here, and it is fine for
  reading a prompt. It is not evidence of what exists.

An automation visible in the app's schedule view with no file on disk is
normal and expected — the row is in the database and the export has not
written it yet. **Never conclude an automation does not exist from a directory
listing.** Check the database before making that claim.

The two files also carry different fields: the TOML has `target_thread_id` and
`notification_policy`; the table has `target_type`, `project_id`, `model`, and
`reasoning_effort`. Do not treat one as a faithful mirror of the other.

## Two Kinds

- **heartbeat** — attached to the current local thread; the default for
  recurring requests. Wakes on its `rrule` and runs in that thread.
- **cron** — a standalone local job scoped to one project. Resolve the project
  id with `list_projects`.

Prefer heartbeat unless the user explicitly wants a fresh task per run or
standalone project work.

Immediate creates must not include `DTSTART` in the `rrule` — it can convert
local wall-clock times to UTC. The app rejects this and points at
`mode=suggested_create` for genuinely timezone-anchored schedules.

Cursor files an automation maintains for itself (`handled-message-ids.json` and
friends) live beside the exported TOML in the same directory. Those are the
automation's own durable state, are not app-managed, and are safe to read and
write.

## Skill Reload

Quitting the app is not how plugin changes take effect. The app refreshes its
skill catalog when a plugin is installed or changed, and the command menu has
**"Force reload skills"** as the manual fallback. When the refresh fails the app
says so: *"Plugin changed, but skills couldn't refresh. Reload skills before
starting a new chat."*

That sentence also bounds it — the refreshed catalog applies to **new chats**.
An already-running thread keeps the skill versions it started with.

This has a consequence worth checking rather than assuming: a heartbeat
automation runs inside a long-lived `target_thread_id`. If thread-scoped skill
catalogs are fixed at thread creation, a heartbeat could keep invoking the skill
versions from the day its thread was created, and upgrading the plugin would not
reach it until the automation gets a fresh thread. This has not been verified
here. Before concluding a skill change did not take effect in an automation,
test it — and if it holds, recreating the automation is the fix.

There is a separate `codex-app-server-restart` control for the app server. It
is not the same thing as reloading skills and is not needed for plugin changes.

## Reporting

Findings are version-scoped. State the app version, and state which surface was
read — the database or the exported files. Those are different claims.
