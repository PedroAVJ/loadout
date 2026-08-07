---
name: automations
description: How the Codex desktop app stores, schedules, and reloads local automations and skills — where automation.toml lives, the heartbeat vs cron split, why an automation can look missing when it is not, and how plugin changes reach a running app. Use before claiming an automation does not exist, before hand-editing automation.toml, and when a plugin or skill change does not appear to have taken effect.
---

# Codex Desktop Automations And Reload

Verified against ChatGPT.app `26.803.41515` (build 6321). Codex ships inside
`/Applications/ChatGPT.app`, not a standalone `Codex.app` — resolve the bundle
by identifier, never by name.

## Where Automations Live

One directory per automation under `$CODEX_HOME/automations/` (normally
`~/.codex/automations/`), each holding an `automation.toml`:

```text
~/.codex/automations/<id>/automation.toml
```

The app's own tool description instructs agents to "inspect
`$CODEX_HOME/automations/*/automation.toml` to find matching automation ids by
name or prompt." That file is the enumeration surface — there is no separate
database to consult, and nothing about automations lives only in app memory.

Fields that matter: `id`, `kind`, `name`, `prompt`, `status`, `rrule`,
`notification_policy`, `target_thread_id`, `created_at`, `updated_at`. Sibling
files in the same directory are the automation's own durable state — cursor
files like `handled-message-ids.json` — not app-managed.

## The File Is Not Stale — Your Reading Is

`automation.toml` is written synchronously on every create and edit. Across a
full local set, file mtime matches `updated_at` exactly, every time. There is
no lazy flush and no window where the app knows about an automation the
filesystem does not.

So when the app's schedule view shows an automation and a directory scan does
not, the scan is old. This is the actual failure mode, and it is easy to hit:
automations get created and edited while a long agent thread is running, and a
`find` from the top of the conversation is minutes or hours stale by the time
it gets cited.

**Re-read immediately before asserting that an automation does not exist.**
Never carry an earlier directory listing forward as evidence of absence. The
same applies to `status` and `prompt` — an automation the user just edited in
the app has a `prompt` your earlier read does not contain.

## Two Kinds

- **heartbeat** — attached to the current local thread; the default for
  recurring requests. Wakes on its `rrule` and runs in that thread.
- **cron** — a standalone local job scoped to one project. Resolve the project
  id with `list_projects`.

Prefer heartbeat unless the user explicitly wants a fresh task per run or
standalone project work.

## Editing

The app exposes `automation_update` for create, update, view, and delete, and
its guidance is explicit: do not hand-write automation directives, and prefer
updating an existing automation over creating a near-duplicate. Preserve
existing fields on update unless the user asked to change them.

Hand-editing `automation.toml` is possible and the file is plain TOML, but two
caveats hold:

- whether a running scheduler re-reads a hand-edit is not established here —
  confirm the change is visible in the app's own schedule view before treating
  it as live;
- a later `automation_update` writes the whole file, so a hand-edit can be
  overwritten without warning.

Back up the file before hand-editing, and say plainly that the edit was made on
disk rather than through the app.

Immediate creates must not include `DTSTART` in the `rrule` — it can convert
local wall-clock times to UTC. The app rejects this outright and points at
`mode=suggested_create` for genuinely timezone-anchored schedules.

## Plugin And Skill Reload

**Quitting the app is not the way to pick up plugin changes.** The app refreshes
its skill catalog when a plugin is installed or changed, and exposes a manual
fallback in the command menu:

```text
Force reload skills
```

When the automatic refresh fails, the app says so directly — "Plugin changed,
but skills couldn't refresh. Reload skills before starting a new chat." That
sentence also fixes the scope: **the refreshed catalog applies to new chats.**
An already-running thread keeps the skill versions it started with, so a reload
mid-thread does not retroactively update the current conversation.

Practical consequence when developing a plugin locally: after upgrading the
install, force reload skills and then start a fresh thread. A skill that still
behaves like the old version in an open thread is expected, not a failed
upgrade — check the installed cache path and version before debugging further.

There is a separate `codex-app-server-restart` control for the app server,
which is not the same thing as reloading skills and is not needed for plugin
changes.

## Reporting

Automation findings are version-scoped and time-scoped. State the app version,
and state when the directory was read — a claim about what exists is only as
good as its timestamp.
