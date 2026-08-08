import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const pluginRoot = path.resolve(import.meta.dirname, "..");

test("legacy MCP config no longer auto-registers during the workaround", () => {
  assert.equal(fs.existsSync(path.join(pluginRoot, ".mcp.json")), false);
});

test("claude metadata no longer registers an MCP server during the workaround", () => {
  const claudeManifest = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"),
  );

  assert.equal("mcpServers" in claudeManifest, false);
  assert.equal("interface" in claudeManifest, false);
});

test("claude local MCP config no longer auto-registers during the workaround", () => {
  assert.equal(fs.existsSync(path.join(pluginRoot, ".claude-mcp.json")), false);
});

test("codex metadata no longer registers an MCP server during the workaround", () => {
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );

  assert.equal("mcpServers" in codexManifest, false);
  assert.match(codexManifest.description, /WhatsApp chats/i);
});

test("package scripts expose the direct CLI and bridge lifecycle commands", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, "package.json"), "utf8"));
  assert.equal(pkg.scripts.start, "/bin/zsh ./scripts/start_bridge.sh");
  assert.equal(pkg.scripts.stop, "/bin/zsh ./scripts/stop_bridge.sh");
  assert.equal(pkg.scripts.status, "/bin/zsh ./scripts/status_bridge.sh");
  assert.equal(pkg.scripts["reset-sync"], "/bin/zsh ./scripts/reset_sync.sh");
  assert.equal(pkg.scripts.cli, "python3 ./cli/whatsapp_cli.py");
  assert.equal(pkg.scripts.backend, "/bin/zsh ./scripts/run_cli.sh");
  assert.equal(pkg.scripts.setup, "/bin/zsh ./scripts/setup.sh");
  assert.equal("setup:bridge" in pkg.scripts, false);
});

test("bridge admin and direct CLI scripts exist", () => {
  for (const scriptName of [
    "start_bridge.sh",
    "stop_bridge.sh",
    "status_bridge.sh",
    "reset_sync.sh",
    "run_cli.sh",
    "whatsapp_cli.py",
  ]) {
    assert.equal(fs.existsSync(path.join(pluginRoot, "scripts", scriptName)), true);
  }
});

test("vendored upstream MCP exposes only read-only tools", () => {
  const mainPy = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-mcp-server", "main.py"),
    "utf8",
  );

  assert.match(mainPy, /def search_contacts/);
  assert.match(mainPy, /def list_messages/);
  assert.match(mainPy, /def list_chats/);
  assert.match(mainPy, /def get_message_context/);
  assert.match(mainPy, /def download_media/);

  assert.doesNotMatch(mainPy, /def send_message/);
  assert.doesNotMatch(mainPy, /def send_file/);
  assert.doesNotMatch(mainPy, /def send_audio_message/);
});

test("upstream backend is patched for local state env vars", () => {
  const whatsappPy = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-mcp-server", "whatsapp.py"),
    "utf8",
  );
  const bridgeGo = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-bridge", "main.go"),
    "utf8",
  );

  assert.match(whatsappPy, /WHATSAPP_MCP_MESSAGES_DB_PATH/);
  assert.match(whatsappPy, /WHATSAPP_MCP_API_BASE_URL/);
  assert.match(bridgeGo, /WHATSAPP_MCP_STORE_DIR/);
  assert.match(bridgeGo, /WHATSAPP_MCP_HTTP_PORT/);
  assert.match(bridgeGo, /api\/health/);
});

test("setup defaults to QR pairing and keeps phone-number pairing as an explicit fallback", () => {
  const commonEnv = fs.readFileSync(path.join(pluginRoot, "scripts", "common_env.sh"), "utf8");
  const setupScript = fs.readFileSync(path.join(pluginRoot, "scripts", "setup.sh"), "utf8");
  const bridgeGo = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-bridge", "main.go"),
    "utf8",
  );

  assert.match(commonEnv, /resolve_pair_phone/);
  assert.doesNotMatch(commonEnv, /Developer\/me/);
  assert.match(commonEnv, /WHATSAPP_MCP_PAIR_PHONE_SOURCE_FILE/);
  assert.match(setupScript, /WHATSAPP_USE_PHONE_PAIRING/);
  assert.match(setupScript, /resolve_pair_phone/);
  assert.match(setupScript, /QR pairing enabled/);
  assert.match(setupScript, /Link a device/);
  assert.match(setupScript, /Link with phone number instead/);
  assert.match(bridgeGo, /WHATSAPP_MCP_PAIR_PHONE/);
  assert.match(bridgeGo, /PairPhone/);
  assert.match(bridgeGo, /Pairing code:/);
  assert.doesNotMatch(bridgeGo, /Pairing code for %s/);
});

test("reply metadata is persisted and exposed by the vendored backend", () => {
  const whatsappPy = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-mcp-server", "whatsapp.py"),
    "utf8",
  );
  const bridgeGo = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-bridge", "main.go"),
    "utf8",
  );

  assert.match(bridgeGo, /reply_to_message_id TEXT/);
  assert.match(bridgeGo, /reply_to_sender TEXT/);
  assert.match(bridgeGo, /reply_to_content TEXT/);
  assert.match(bridgeGo, /reply_to_media_type TEXT/);
  assert.match(bridgeGo, /extractReplyMetadata/);

  assert.match(whatsappPy, /reply_to_message_id: Optional\[str\] = None/);
  assert.match(whatsappPy, /reply_to_sender: Optional\[str\] = None/);
  assert.match(whatsappPy, /reply_preview: Optional\[str\] = None/);
  assert.match(whatsappPy, /reply_media_type: Optional\[str\] = None/);
  assert.match(whatsappPy, /LEFT JOIN messages AS reply_target/);
});

test("bridge send endpoint supports outbound quoted replies", () => {
  const bridgeGo = fs.readFileSync(
    path.join(pluginRoot, "vendor", "lharries-whatsapp-mcp", "whatsapp-bridge", "main.go"),
    "utf8",
  );

  assert.match(bridgeGo, /ReplyToMessageID string `json:"reply_to_message_id,omitempty"`/);
  assert.match(bridgeGo, /func buildReplyContext/);
  assert.match(bridgeGo, /StanzaID:\s+proto\.String\(reply\.MessageID\)/);
  assert.match(bridgeGo, /QuotedMessage: quotedMessageFromReply\(reply\)/);
  assert.match(bridgeGo, /ExtendedTextMessage/);
  assert.match(bridgeGo, /applyReplyContext/);
});

test("run_mcp no longer auto-starts the bridge", () => {
  const runScript = fs.readFileSync(path.join(pluginRoot, "scripts", "run_mcp.sh"), "utf8");

  assert.doesNotMatch(runScript, /start_bridge\(/);
  assert.match(runScript, /WhatsApp bridge is not running/);
  assert.match(runScript, /pnpm start/);
});

test("run_mcp requires explicit opt-in for the legacy native MCP path", () => {
  const runScript = fs.readFileSync(path.join(pluginRoot, "scripts", "run_mcp.sh"), "utf8");

  assert.match(runScript, /WHATSAPP_ALLOW_NATIVE_MCP/);
  assert.match(runScript, /disabled by default/i);
  assert.match(runScript, /pnpm cli -- --json chats list/i);
});

test("skill documents the temporary MCP collision workaround", () => {
  const skill = fs.readFileSync(path.join(pluginRoot, "skills", "whatsapp", "SKILL.md"), "utf8");

  assert.match(skill, /QR pairing flow/i);
  assert.match(skill, /Link a device/i);
  assert.match(skill, /WHATSAPP_USE_PHONE_PAIRING=1/);
  assert.match(skill, /whatsapp --json chats list/i);
});

test("audio transcription is scheduled and cached through the CLI", () => {
  const cli = fs.readFileSync(path.join(pluginRoot, "cli", "whatsapp_cli.py"), "utf8");
  const skill = fs.readFileSync(path.join(pluginRoot, "skills", "whatsapp", "SKILL.md"), "utf8");
  const readme = fs.readFileSync(path.join(pluginRoot, "README.md"), "utf8");

  assert.match(cli, /media_transcripts/);
  assert.match(cli, /media_transcribe = media_sub\.add_parser/);
  assert.match(cli, /TRANSCRIPT_PROVIDER = "elevenlabs"/);
  assert.match(cli, /WHATSAPP_TRANSCRIPTS_DB_PATH/);
  assert.match(cli, /--refresh/);
  assert.match(skill, /media transcribe MESSAGE_ID/);
  assert.match(skill, /Do not loop `media transcribe` over a listing/i);
  assert.match(readme, /Audio transcription is scheduled and cached/i);
});

test("pending transcription drains on a schedule without an agent deciding", () => {
  const cli = fs.readFileSync(path.join(pluginRoot, "cli", "whatsapp_cli.py"), "utf8");
  const skill = fs.readFileSync(path.join(pluginRoot, "skills", "whatsapp", "SKILL.md"), "utf8");
  const readme = fs.readFileSync(path.join(pluginRoot, "README.md"), "utf8");

  // Backfill selects only audio with no cached transcript, and is bounded per run.
  assert.match(cli, /media_sub\.add_parser\(\s*"transcribe-pending"/);
  assert.match(cli, /def pending_audio_messages/);
  assert.match(cli, /def command_media_transcribe_pending/);
  assert.match(cli, /"--dry-run"/);

  // The scheduler is installable from the plugin, not hand-rolled per machine.
  assert.match(cli, /AUTOTRANSCRIBE_LABEL = "com\.loadout\.whatsapp\.transcribe-pending"/);
  assert.match(cli, /media_sub\.add_parser\(\s*"autotranscribe"/);
  assert.match(cli, /"bootstrap"/);
  // A login shell keeps ELEVENLABS_API_KEY out of the plist.
  assert.match(cli, /"\/bin\/zsh", "-lc", command/);

  // The CDN expiry window is the reason this is scheduled; keep it documented.
  assert.match(skill, /expires media from\s+its CDN/i);
  assert.match(readme, /expires media from\s+its CDN/i);
});

test("permanently unavailable audio leaves the queue instead of retrying forever", () => {
  const cli = fs.readFileSync(path.join(pluginRoot, "cli", "whatsapp_cli.py"), "utf8");
  const readme = fs.readFileSync(path.join(pluginRoot, "README.md"), "utf8");

  // Failures are durable and counted, not just logged.
  assert.match(cli, /CREATE TABLE IF NOT EXISTS media_transcript_failures/);
  assert.match(cli, /def record_transcribe_failure/);
  assert.match(cli, /MAX_TRANSCRIBE_ATTEMPTS = \d+/);

  // Exhausted messages are excluded from the pending queue by default,
  // so an unattended drain does not rediscover expired media every run.
  assert.match(cli, /FROM media_transcript_failures WHERE attempts >= \?/);
  assert.match(cli, /not in exhausted/);
  assert.match(cli, /"--retry-failed"/);

  assert.match(readme, /--retry-failed/);
});

test("list_messages returns structured reply metadata", () => {
  const mcpServerDir = path.join(
    pluginRoot,
    "vendor",
    "lharries-whatsapp-mcp",
    "whatsapp-mcp-server",
  );
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "whatsapp-mcp-test-"));
  const tempDbPath = path.join(tempDir, "messages.db");
  const pythonScript = `
import json
import os
import sqlite3
from whatsapp import list_messages

db_path = os.environ["WHATSAPP_MCP_MESSAGES_DB_PATH"]
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("CREATE TABLE chats (jid TEXT PRIMARY KEY, name TEXT, last_message_time TEXT)")
cursor.execute("""
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_jid TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT,
    timestamp TEXT NOT NULL,
    is_from_me INTEGER NOT NULL,
    media_type TEXT,
    reply_to_message_id TEXT,
    reply_to_sender TEXT,
    reply_to_content TEXT,
    reply_to_media_type TEXT
)
""")
cursor.execute(
    "INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)",
    ("chat@g.us", "Example Launch", "2026-04-09T12:50:14-05:00"),
)
cursor.executemany(
    """
    INSERT INTO messages (
        id,
        chat_jid,
        sender,
        content,
        timestamp,
        is_from_me,
        media_type,
        reply_to_message_id,
        reply_to_sender,
        reply_to_content,
        reply_to_media_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    [
        (
            "orig-1",
            "chat@g.us",
            "99900123456789",
            "The uploaded image is getting cropped",
            "2026-04-09T12:09:15-05:00",
            0,
            None,
            None,
            None,
            None,
            None,
        ),
        (
            "reply-1",
            "chat@g.us",
            "99900987654321",
            "I'll check that.",
            "2026-04-09T12:15:18-05:00",
            1,
            None,
            "orig-1",
            "99900123456789",
            "The uploaded image is getting cropped",
            None,
        ),
    ],
)
conn.commit()
conn.close()

messages = list_messages(chat_jid="chat@g.us", include_context=False, limit=10, page=0)
print(json.dumps({
    "type": type(messages).__name__,
    "items": [message.__dict__ for message in messages],
}, default=str))
`;

  const output = execFileSync(
    "uv",
    ["run", "python", "-c", pythonScript],
    {
      cwd: mcpServerDir,
      encoding: "utf8",
      env: {
        ...process.env,
        WHATSAPP_MCP_MESSAGES_DB_PATH: tempDbPath,
      },
    },
  );

  const parsed = JSON.parse(output.trim());
  assert.equal(parsed.type, "list");
  assert.equal(Array.isArray(parsed.items), true);
  assert.equal(parsed.items[0].reply_to_message_id, "orig-1");
  assert.equal(
    parsed.items[0].reply_preview,
    "The uploaded image is getting cropped",
  );
});

test("list_messages returns reactions and read receipts as structured data", () => {
  const mcpServerDir = path.join(
    pluginRoot,
    "vendor",
    "lharries-whatsapp-mcp",
    "whatsapp-mcp-server",
  );
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "whatsapp-mcp-reactions-test-"));
  const tempDbPath = path.join(tempDir, "messages.db");
  const pythonScript = `
import json
import os
import sqlite3
from dataclasses import asdict
from whatsapp import list_messages

db_path = os.environ["WHATSAPP_MCP_MESSAGES_DB_PATH"]
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("CREATE TABLE chats (jid TEXT PRIMARY KEY, name TEXT, last_message_time TEXT)")
cursor.execute("""
CREATE TABLE messages (
    id TEXT,
    chat_jid TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT,
    timestamp TEXT NOT NULL,
    is_from_me INTEGER NOT NULL,
    media_type TEXT,
    reply_to_message_id TEXT,
    reply_to_sender TEXT,
    reply_to_content TEXT,
    reply_to_media_type TEXT,
    PRIMARY KEY (id, chat_jid)
)
""")
cursor.execute("""
CREATE TABLE message_reactions (
    chat_jid TEXT NOT NULL,
    target_message_id TEXT NOT NULL,
    target_sender TEXT NOT NULL DEFAULT '',
    reaction_sender TEXT NOT NULL,
    emoji TEXT NOT NULL,
    reaction_message_id TEXT,
    grouping_key TEXT,
    sender_timestamp_ms INTEGER,
    timestamp TEXT,
    is_from_me INTEGER,
    PRIMARY KEY (chat_jid, target_message_id, reaction_sender)
)
""")
cursor.execute("""
CREATE TABLE message_receipts (
    message_id TEXT NOT NULL,
    chat_jid TEXT NOT NULL,
    receipt_type TEXT NOT NULL,
    receipt_sender TEXT NOT NULL,
    message_sender TEXT NOT NULL DEFAULT '',
    timestamp TEXT,
    PRIMARY KEY (message_id, chat_jid, receipt_type, receipt_sender, message_sender)
)
""")
cursor.execute(
    "INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)",
    ("chat@s.whatsapp.net", "Example", "2026-04-09T12:50:14-05:00"),
)
cursor.execute(
    """
    INSERT INTO messages (
        id, chat_jid, sender, content, timestamp, is_from_me, media_type,
        reply_to_message_id, reply_to_sender, reply_to_content, reply_to_media_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    ("out-1", "chat@s.whatsapp.net", "me", "Please review this", "2026-04-09T12:15:18-05:00", 1, None, None, None, None, None),
)
cursor.execute(
    """
    INSERT INTO message_reactions (
        chat_jid, target_message_id, target_sender, reaction_sender, emoji,
        reaction_message_id, grouping_key, sender_timestamp_ms, timestamp, is_from_me
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    ("chat@s.whatsapp.net", "out-1", "me", "15551230001@s.whatsapp.net", "+1", "react-1", "grp", 1775747718000, "2026-04-09T12:16:18-05:00", 0),
)
cursor.execute(
    """
    INSERT INTO message_receipts (
        message_id, chat_jid, receipt_type, receipt_sender, message_sender, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?)
    """,
    ("out-1", "chat@s.whatsapp.net", "read", "15551230001@s.whatsapp.net", "me", "2026-04-09T12:17:18-05:00"),
)
conn.commit()
conn.close()

messages = list_messages(chat_jid="chat@s.whatsapp.net", include_context=False, limit=10, page=0)
print(json.dumps({
    "items": [asdict(message) for message in messages],
}, default=str))
`;

  const output = execFileSync(
    "uv",
    ["run", "python", "-c", pythonScript],
    {
      cwd: mcpServerDir,
      encoding: "utf8",
      env: {
        ...process.env,
        WHATSAPP_MCP_MESSAGES_DB_PATH: tempDbPath,
      },
    },
  );

  const parsed = JSON.parse(output.trim());
  assert.equal(parsed.items[0].reactions.length, 1);
  assert.equal(parsed.items[0].reactions[0].emoji, "+1");
  assert.equal(parsed.items[0].reactions[0].sender, "15551230001@s.whatsapp.net");
  assert.equal(parsed.items[0].receipts.length, 1);
  assert.equal(parsed.items[0].receipts[0].type, "read");
  assert.equal(parsed.items[0].seen_by.length, 1);
  assert.equal(parsed.items[0].seen_by[0].sender, "15551230001@s.whatsapp.net");
});

test("list_messages merges phone and LID histories for one contact by default", () => {
  const mcpServerDir = path.join(
    pluginRoot,
    "vendor",
    "lharries-whatsapp-mcp",
    "whatsapp-mcp-server",
  );
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "whatsapp-mcp-identity-test-"));
  const tempDbPath = path.join(tempDir, "messages.db");
  const pythonScript = `
import json
import os
import sqlite3
from whatsapp import list_messages

messages_db_path = os.environ["WHATSAPP_MCP_MESSAGES_DB_PATH"]
whatsapp_db_path = os.path.join(os.path.dirname(messages_db_path), "whatsapp.db")

conn = sqlite3.connect(messages_db_path)
cursor = conn.cursor()
cursor.execute("CREATE TABLE chats (jid TEXT PRIMARY KEY, name TEXT, last_message_time TEXT)")
cursor.execute("""
CREATE TABLE messages (
    id TEXT,
    chat_jid TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT,
    timestamp TEXT NOT NULL,
    is_from_me INTEGER NOT NULL,
    media_type TEXT,
    reply_to_message_id TEXT,
    reply_to_sender TEXT,
    reply_to_content TEXT,
    reply_to_media_type TEXT,
    PRIMARY KEY (id, chat_jid)
)
""")
cursor.executemany(
    "INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)",
    [
        ("15551230001@s.whatsapp.net", "Acme Ops", "2026-05-14T18:14:57-05:00"),
        ("99900123456789@lid", "unresolved-lid", "2026-05-20T21:58:17-05:00"),
    ],
)
cursor.executemany(
    """
    INSERT INTO messages (
        id, chat_jid, sender, content, timestamp, is_from_me, media_type,
        reply_to_message_id, reply_to_sender, reply_to_content, reply_to_media_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    [
        ("old-1", "15551230001@s.whatsapp.net", "15551230001", "old one", "2026-05-14T18:14:57-05:00", 0, None, None, None, None, None),
        ("old-2", "15551230001@s.whatsapp.net", "me", "old two", "2026-05-14T18:15:57-05:00", 1, None, None, None, None, None),
        ("new-1", "99900123456789@lid", "99900123456789", "new one", "2026-05-20T21:58:17-05:00", 0, None, None, None, None, None),
    ],
)
conn.commit()
conn.close()

conn = sqlite3.connect(whatsapp_db_path)
cursor = conn.cursor()
cursor.execute("CREATE TABLE whatsmeow_lid_map (lid TEXT PRIMARY KEY, pn TEXT UNIQUE NOT NULL)")
cursor.execute("""
CREATE TABLE whatsmeow_contacts (
    our_jid TEXT,
    their_jid TEXT,
    first_name TEXT,
    full_name TEXT,
    push_name TEXT,
    business_name TEXT,
    redacted_phone TEXT,
    PRIMARY KEY (our_jid, their_jid)
)
""")
cursor.execute("INSERT INTO whatsmeow_lid_map (lid, pn) VALUES (?, ?)", ("99900123456789", "15551230001"))
cursor.executemany(
    "INSERT INTO whatsmeow_contacts (our_jid, their_jid, first_name, full_name, push_name, business_name, redacted_phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
        ("me@s.whatsapp.net", "15551230001@s.whatsapp.net", None, "Acme Ops", "Acme Ops", None, None),
        ("me@s.whatsapp.net", "99900123456789@lid", None, None, "Acme Ops", None, None),
    ],
)
conn.commit()
conn.close()

merged = list_messages(chat_jid="99900123456789@lid", include_context=False, limit=10, page=0)
merged_from_phone = list_messages(chat_jid="15551230001@s.whatsapp.net", include_context=False, limit=10, page=0)
exact = list_messages(chat_jid="99900123456789@lid", include_context=False, limit=10, page=0, expand_identity=False)
print(json.dumps({
    "merged": [message.__dict__ for message in merged],
    "merged_from_phone": [message.__dict__ for message in merged_from_phone],
    "exact": [message.__dict__ for message in exact],
}, default=str))
`;

  const output = execFileSync(
    "uv",
    ["run", "python", "-c", pythonScript],
    {
      cwd: mcpServerDir,
      encoding: "utf8",
      env: {
        ...process.env,
        WHATSAPP_MCP_MESSAGES_DB_PATH: tempDbPath,
      },
    },
  );

  const parsed = JSON.parse(output.trim());
  assert.deepEqual(parsed.merged.map((message) => message.id), ["new-1", "old-2", "old-1"]);
  assert.deepEqual(parsed.merged_from_phone.map((message) => message.id), ["new-1", "old-2", "old-1"]);
  assert.deepEqual(parsed.merged.map((message) => message.chat_name), ["Acme Ops", "Acme Ops", "Acme Ops"]);
  assert.deepEqual(parsed.exact.map((message) => message.id), ["new-1"]);
});

test("CLI exposes direct code-backed access without MCP registration", () => {
  const output = execFileSync(
    "python3",
    [path.join(pluginRoot, "cli", "whatsapp_cli.py"), "--help"],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.match(output, /Read WhatsApp chats/i);
  assert.match(output, /chats/);
  assert.match(output, /media/);
  assert.match(output, /drafts/);
});
