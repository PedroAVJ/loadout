# sentry

Read and triage Sentry through the `sentry` CLI — issues, events, logs, traces,
and the distinctions between them.

## Install

```bash
skills install sentry
plugins/sentry/bin/install-sentry-cli
```

The installer fetches the official binary from `getsentry/cli` releases into
`~/.local/bin` (override with `SENTRY_CLI_DEST`). Sentry's own
`curl … | bash` installer also rewrites shell PATH config and drops agent
skills into `~/.claude` and `~/.agents`; this one does neither, so skills stay
managed by whatever manages skills.

Authenticate with `sentry auth login`, or set `SENTRY_AUTH_TOKEN`.

## Why this exists

The CLI already covers the whole API, and Sentry ships its own agent skill
teaching the commands. What neither provides is the part that makes answers
wrong:

- **Sentry is four datasets, not one.** Issues, events, logs, and traces are
  distinct. `captureException` creates events that group into issues; it does
  not create logs. Sentry's own agent docs never draw the line, so an agent
  will happily report "checked the logs" after listing issues.
- **`issue list` has no `--environment` flag.** Environment is a query term. A
  project can have `prod`, `production`, and `vercel-production` where only one
  has data, so filtering on the wrong one returns zero and reads as all-clear
  instead of as a mistake.
- **`issue list` defaults to 90 days**, not all time.

This plugin carries those rules. The CLI carries the mechanism.

## Usage

```bash
sentry issue list <org>/ --period 14d --json        # every project in the org
sentry issue list <org>/<project> --query "is:unresolved environment:production"
sentry issue view <issue>                           # detail + latest event
sentry issue explain <issue>                        # Seer AI root cause
sentry log list <org>/<project>                     # a different dataset
sentry trace list <org>/<project>
sentry explore <org>/<project> --dataset logs --query "..."
sentry api "/projects/<org>/<project>/environments/"
```

## Scope

Reads are unrestricted. `issue resolve|unresolve|archive|merge` mutate state
that other people and alert rules observe — the skill treats them as
third-party side effects: never unattended, confirmed when interactive.
