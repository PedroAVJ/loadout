---
name: mcp-servers
description: Install, find, list, remove, and sync MCP servers across coding agents using the installed add-mcp CLI. Use when an agent needs to add an MCP server to Claude Code, Codex, Cursor, or another client; audit which MCP servers are configured where; clean up or deduplicate MCP config; or mirror one agent's MCP setup onto the others.
---

# MCP Servers

Use the installed `add-mcp` CLI as the command surface for MCP server
installation and cleanup. It writes each agent's native config file, so one
command covers every client instead of hand-editing `~/.codex/config.toml`,
`~/.claude.json`, and the rest.

This is the MCP counterpart to the `skills` CLI: `skills` installs SKILL.md
directories, `add-mcp` installs MCP servers. Neither one installs plugins —
Claude Code and Codex plugin marketplaces are separate and per-agent.

## Start

Verify the command before relying on it:

```bash
command -v add-mcp && add-mcp --version
```

If missing: `npm install -g add-mcp`.

Every subcommand defaults to **project scope** (writes config into the
current directory). Pass `-g` for user-level config. Get the scope right
before running anything — a project-scope install in the wrong directory
leaves stray config files behind.

## Two Ways to Attach an MCP Server

The same MCP server can be attached in two different ways, and only one of
them is `add-mcp`'s business. The difference is **who acts as the MCP
client**, not what the server is.

**Locally configured** — the agent on this machine is the client. The
definition is a URL or command in the agent's own config, and any OAuth
token lands locally. Portable: the same recipe works in every agent. This is
what `add-mcp` manages. In Codex these are `[mcp_servers.*]` in
`~/.codex/config.toml`; in Claude Code, `claude mcp add` scopes.

**Vendor-brokered** — the vendor's cloud is the client. You register the
server in your *account*, the vendor's infrastructure connects out to it and
holds the OAuth grant, and nothing lands on disk. Not portable, by design.
Anthropic calls these **connectors** (from the Connectors Directory, or
**custom connectors** when you supply the URL yourself). OpenAI calls the
equivalent **apps** — `[apps.*]` in `config.toml`, an opaque ID and an
enabled flag, no URL or credential.

The trap: "custom connector" describes *who chose the server*, not *who
brokers it*. Pasting `https://mcp.linear.app/mcp` into Claude's connector
settings and running `add-mcp https://mcp.linear.app/mcp -a claude-code`
point at the identical server, but the first is vendor-brokered and the
second is local. Registering one does not create the other.

Practical consequence when auditing: a vendor-brokered integration will
never appear in `add-mcp list`, and that is correct rather than broken.
Never read an empty `list` as "this agent has no MCP tools" — it means "no
locally configured servers." Check the agent's actual tool list too.

## Find a Server

Search the integrations.sh registry. Omit the keyword to browse.

```bash
add-mcp find sentry
```

`find` installs the selected entry, so it takes the same scope and agent
flags as `add`.

## Install a Server

Remote servers take a URL; local stdio servers take a package name.

```bash
# Remote HTTP server, all agents, user-level
add-mcp https://mcp.example.com/mcp -g --all -y

# Remote server with auth header, Claude Code and Codex only
add-mcp https://mcp.example.com/mcp -g -a claude-code -a codex \
  -h 'Authorization: Bearer ${EXAMPLE_TOKEN}'

# Local stdio server with env and args
add-mcp some-mcp-package -g -n example \
  --env 'API_KEY=${EXAMPLE_API_KEY}' --args --read-only
```

Flags that matter:

- `-a <agent>` — repeatable; target specific agents. `--all` installs everywhere.
- `-n <name>` — server name; inferred from the target when omitted. Set it
  explicitly when the inferred name would be ugly or collide.
- `-t http|sse` — transport for remote servers.
- `-h 'Key: Value'` / `--env 'KEY=VALUE'` / `--args <arg>` — repeatable.
- `--auto-approve` — auto-approve tool calls. Only Codex and Claude Code
  support it; other agents get a warning and the flag is dropped. Scope it
  with `--approve-tool <tool>` rather than blanket-approving a server whose
  tools write or send.
- `--gitignore` — for project-scope installs, keeps generated config out of git.

Always single-quote `${VAR}` placeholders so the shell does not expand them.
The CLI prompts for the value interactively unless `-y` is set, and stores a
placeholder reference rather than the literal secret.

## Audit What Is Installed

```bash
add-mcp list -g
```

Prints every detected agent and its configured servers. Run this before
adding anything — the same server is often already installed under a
different name in another agent.

`list` only sees locally configured servers — see "Two Ways to Attach an MCP
Server" above before concluding an agent is empty.

## Remove a Server

```bash
add-mcp remove <query> -g
```

Matches by name and prompts per match. `-a <agent>` narrows to specific
agents; `-y` removes all matches without prompting — only use it when
`list` has already shown exactly what will be hit.

## Sync Across Agents

```bash
add-mcp sync -g
```

Reconciles server names and installations across all detected agents. This
is the cleanup command: it is how a server that exists only in Codex gets
mirrored into Claude Code, and how divergent names for the same server get
unified. It rewrites multiple agents' configs at once, so run `list` first
and review the plan it prints rather than passing `-y` blind.

## Supported Agents

`add-mcp list-agents` prints the current table. As of v2.0.0: antigravity,
cline, cline-cli, claude-code, claude-desktop, codex, cursor, gemini-cli,
goose, github-copilot-cli, grok-build, mcporter, opencode, vscode, windsurf,
zed.

Project scope is not universal — Claude Desktop, Goose, Windsurf, Cline, and
Antigravity are global-only. Check the `Local`/`Global` columns before
assuming a project-scope install will land.

## After Installing

Agents read MCP config at startup. Restart the target agent before reporting
that a server is available, and confirm the tools actually appear rather
than inferring success from a clean exit code.
