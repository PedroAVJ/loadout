# Loadout

The plugin that manages the loadout itself.

Every other module in this repo gives an agent reach into some external
system. This one is recursive: it governs what the agent equips. Three verbs
on one noun — skills, MCP servers, and plugins are all answers to "what can
this agent do", and they are constantly confused for each other.

## Skills

| Skill | Use it when |
| --- | --- |
| `agent-skills` | Deciding whether something should be a skill, an MCP server, or a plugin; finding and vetting a skill before installing it; choosing which agents it targets; auditing what is installed where. |
| `mcp-servers` | Installing, finding, listing, removing, or syncing MCP servers across agents via the `add-mcp` CLI; distinguishing locally configured servers from vendor-brokered connectors. |
| `sqlite-cache-cli-pattern` | Designing a CLI that needs a local SQLite cache — repeatable search, identity resolution, incremental sync, offline joins a connector API cannot do. |
| `loadout-release` | Changing a plugin or standalone skill in this repo and getting it live in both Codex and Claude Code: version bumps, marketplace manifests, cache verification. |

## The Distinction It Exists To Enforce

| Mechanism | Carries | Installed by |
| --- | --- | --- |
| Skill | Procedure and knowledge. No code of its own. | `npx skills` |
| MCP server | Tools the model can call. | `add-mcp` |
| Plugin | A versioned bundle: skills + scripts + CLIs + MCP config + assets. | per-agent plugin marketplace |

A skill that says "use the installed `foo` CLI" without owning `foo` is a
plugin waiting to be written — the install is incomplete without it. That
rule is why this plugin exists, and it is the rule most often broken while
prototyping.

`sqlite-cache-cli-pattern` sits here for the same reason: deciding a CLI needs
a durable local cache is a decision about what to build into the loadout, made
before any of it can be installed.

## Dependencies

Neither CLI is vendored here; both are third-party and install globally.

```bash
npm install -g add-mcp     # MCP server installs
npx skills --help          # vercel-labs/skills, run through npx
```

## Install

```bash
claude plugin install loadout@loadout
```

```bash
codex plugin marketplace upgrade
```
