import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const pluginsDir = join(repo, "plugins");

// Plugins are defined by what the repo *ships*, which is what git tracks.
// Untracked work-in-progress under plugins/ is deliberately out of scope —
// it is not published to either marketplace and does not have to be
// manifest-complete yet.
const plugins = [
  ...new Set(
    execFileSync("git", ["ls-files", "plugins/"], { cwd: repo, encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((p) => p.split("/")[1])
      .filter((n) => n && !n.includes(".")),
  ),
].sort();

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// The rule: this repo ships plugins, and only plugins.
//
// Standalone skills and standalone MCP servers are not published here. A
// plugin may contain skills and MCP config internally — that is the point of
// a plugin — but nothing is distributed outside one. Skills install through
// a separate CLI with a separate lockfile and drift from the repo that owns
// them; plugins are versioned, released, and upgraded as a unit.
test("no top-level skills directory", () => {
  assert.equal(
    existsSync(join(repo, "skills")),
    false,
    "loadout ships plugins only — put the skill inside the plugin that owns it",
  );
});

test("no repo-scoped agent skills outside plugins", () => {
  for (const dir of [".agents/skills", ".claude/skills", ".codex/skills"]) {
    assert.equal(
      existsSync(join(repo, dir)),
      false,
      `${dir} is a standalone-skill location — loadout ships plugins only`,
    );
  }
});

test("no top-level MCP server outside a plugin", () => {
  for (const f of [".mcp.json", "mcp.json"]) {
    assert.equal(
      existsSync(join(repo, f)),
      false,
      `${f} at the repo root would ship an MCP server outside a plugin`,
    );
  }
});

test("every plugin carries at least one client manifest", () => {
  for (const p of plugins) {
    const claude = existsSync(join(pluginsDir, p, ".claude-plugin/plugin.json"));
    const codex = existsSync(join(pluginsDir, p, ".codex-plugin/plugin.json"));
    assert.ok(claude || codex, `plugins/${p} has no client manifest`);
  }
});

test("manifest name matches directory and versions agree across clients", () => {
  for (const p of plugins) {
    const versions = [];
    for (const m of [".claude-plugin", ".codex-plugin"]) {
      const file = join(pluginsDir, p, m, "plugin.json");
      if (!existsSync(file)) continue;
      const json = readJson(file);
      assert.equal(json.name, p, `plugins/${p}/${m} declares name "${json.name}"`);
      versions.push(json.version);
    }
    assert.equal(
      new Set(versions).size,
      1,
      `plugins/${p} manifests disagree on version: ${versions.join(" vs ")}`,
    );
  }
});

test("both marketplaces list every plugin that has their manifest", () => {
  const markets = [
    [".claude-plugin/marketplace.json", ".claude-plugin"],
    [".agents/plugins/marketplace.json", ".codex-plugin"],
  ];
  for (const [market, manifest] of markets) {
    const listed = new Set(readJson(join(repo, market)).plugins.map((x) => x.name));
    const onDisk = plugins.filter((p) =>
      existsSync(join(pluginsDir, p, manifest, "plugin.json")),
    );
    for (const p of onDisk) {
      assert.ok(listed.has(p), `${market} is missing plugins/${p}`);
    }
    for (const name of listed) {
      assert.ok(onDisk.includes(name), `${market} lists "${name}" which is not on disk`);
    }
  }
});

test("every skill lives inside a plugin and declares name and description", () => {
  const tracked = execFileSync("git", ["ls-files", "plugins/"], {
    cwd: repo,
    encoding: "utf8",
  })
    .split("\n")
    .filter((p) => p.endsWith("SKILL.md"));

  assert.ok(tracked.length > 0, "no SKILL.md files found under plugins/");

  for (const rel of tracked) {
    const file = join(repo, rel);
    assert.match(
      rel,
      /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/,
      `${rel} is not at plugins/<plugin>/skills/<skill>/SKILL.md`,
    );
    const head = readFileSync(file, "utf8").split("---")[1] ?? "";
    assert.match(head, /\bname:/, `${rel} frontmatter has no name`);
    assert.match(head, /\bdescription:/, `${rel} frontmatter has no description`);

    // A ": " inside an unquoted YAML scalar fails to parse, and the failure is
    // silent — the skill loads at runtime with every frontmatter field dropped,
    // so it simply never triggers. Quote the value or rephrase.
    for (const line of head.split("\n")) {
      const m = /^([a-zA-Z_-]+):[ \t]+(.*)$/.exec(line);
      if (!m) continue;
      const value = m[2].trim();
      const quoted = /^["'>|]/.test(value);
      assert.ok(
        quoted || !/: /.test(value),
        `${rel} frontmatter key "${m[1]}" has an unquoted value containing ": " — YAML drops the whole block`,
      );
    }
  }
});
