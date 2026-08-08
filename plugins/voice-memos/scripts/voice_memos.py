#!/usr/bin/env python3
"""Read the macOS Voice Memos store.

Voice Memos keeps its index in a Core Data SQLite database, not in the audio
filenames. Reading it directly is the difference between a correct enumeration
and a plausible one:

- The store is WAL-mode and live. Opening `CloudRecordings.db` alone can miss
  recordings that are still only in the write-ahead log, and the miss is silent
  — you get an older snapshot, not an error. This module always snapshots the
  `.db`, `-wal` and `-shm` together before reading.
- Timestamps are Core Data reference dates (seconds since 2001-01-01), not Unix
  epoch. Treating one as the other is a 31-year error.
- `ZUNIQUEID` is a stable identifier that survives renames; the filename is not.

Voice Memos also embeds Apple's own on-device transcript in the audio file, as
JSON inside a `tsrp` atom under `udta`. It is free to read, but it is written
lazily — a recording that has never been opened in the app usually has none —
so treat it as an opportunistic fast path, never as a guaranteed source.

Requires Full Disk Access for the calling process to read the store.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import sqlite3
import struct
import sys
import tempfile
import uuid
from pathlib import Path

RECORDINGS = Path.home() / (
    "Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings"
)
DB = RECORDINGS / "CloudRecordings.db"
STATE_DB = Path(
    os.environ.get(
        "VOICE_MEMOS_STATE_DB",
        Path.home() / "Library/Application Support/voice-memos/intake.sqlite3",
    )
)

# Core Data reference date (2001-01-01T00:00:00Z) expressed as a Unix timestamp.
CORE_DATA_EPOCH = 978_307_200

_TEXT_RUN = re.compile(rb"[\x20-\x7e]{4,}")

# Voice Memos seeds ZCUSTOMLABEL with an ISO timestamp when the user has not
# named a recording. A label that is *not* this shape was typed by a human, and
# is a much better signal about a recording than anything else in the store.
_AUTO_LABEL = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$")


class VoiceMemosError(RuntimeError):
    pass


class IntakeError(VoiceMemosError):
    pass


def _snapshot(dest_dir: Path) -> Path:
    """Copy the live store (and its WAL sidecars) so reads see current data."""
    if not DB.exists():
        raise VoiceMemosError(
            f"Voice Memos database not found at {DB}. Open Voice Memos once, "
            "and make sure this process has Full Disk Access."
        )
    snap = dest_dir / DB.name
    shutil.copy2(DB, snap)
    for suffix in ("-wal", "-shm"):
        side = DB.with_name(DB.name + suffix)
        if side.exists():
            shutil.copy2(side, snap.with_name(snap.name + suffix))
    return snap


def read_recordings() -> list[dict]:
    """Every recording in the store, oldest first."""
    with tempfile.TemporaryDirectory() as tmp:
        snap = _snapshot(Path(tmp))
        con = sqlite3.connect(f"file:{snap}?mode=ro", uri=True)
        try:
            rows = con.execute(
                """
                SELECT ZUNIQUEID, ZPATH, ZDATE, ZDURATION, ZCUSTOMLABEL
                FROM ZCLOUDRECORDING
                WHERE ZPATH IS NOT NULL
                ORDER BY ZDATE
                """
            ).fetchall()
        except sqlite3.DatabaseError as exc:  # schema drift across macOS versions
            raise VoiceMemosError(f"could not read the Voice Memos store: {exc}") from exc
        finally:
            con.close()

    out = []
    for uid, rel, zdate, duration, label in rows:
        recorded = dt.datetime.fromtimestamp((zdate or 0) + CORE_DATA_EPOCH)
        path = RECORDINGS / rel
        out.append(
            {
                "uuid": uid,
                "filename": rel,
                "path": str(path),
                "exists": path.exists(),
                "recorded_at": recorded.isoformat(timespec="seconds"),
                "date": recorded.strftime("%Y-%m-%d"),
                "time": recorded.strftime("%H:%M"),
                "duration_seconds": int(duration or 0),
                "title": label,
                "title_is_auto": bool(label is None or _AUTO_LABEL.match(str(label))),
            }
        )
    return out


def resolve(ref: str) -> dict:
    """Find a recording by UUID, filename, or filename stem."""
    ref = ref.strip()
    candidates = read_recordings()
    for r in candidates:
        if ref in (r["uuid"], r["filename"], Path(r["filename"]).stem):
            return r
    # Allow the short hex suffix Voice Memos puts in filenames, e.g. "38BEC65A".
    for r in candidates:
        if r["uuid"].startswith(ref.upper()):
            return r
    raise VoiceMemosError(f"no recording matches {ref!r}")


def _state_connection() -> sqlite3.Connection:
    """Open the plugin-owned intake database and apply its small schema."""
    STATE_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(STATE_DB, timeout=10, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS intake_batches (
            id TEXT PRIMARY KEY,
            state TEXT NOT NULL CHECK (state IN ('claimed', 'dispatched', 'released')),
            created_at TEXT NOT NULL,
            task_id TEXT,
            dispatched_at TEXT
        );

        CREATE TABLE IF NOT EXISTS intake_items (
            uuid TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            recorded_at TEXT NOT NULL,
            batch_id TEXT,
            state TEXT NOT NULL CHECK (state IN ('ready', 'claimed', 'dispatched', 'completed', 'pending', 'baseline')),
            claimed_at TEXT,
            resolved_at TEXT,
            destination TEXT,
            note TEXT,
            FOREIGN KEY (batch_id) REFERENCES intake_batches(id)
        );

        CREATE INDEX IF NOT EXISTS intake_items_batch_id ON intake_items(batch_id);
        """
    )
    return con


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def intake_claim() -> dict:
    """Atomically claim every previously unseen recording for one worker batch."""
    records = read_recordings()
    now = _now()
    batch_id = str(uuid.uuid4())
    claimed: list[dict] = []
    con = _state_connection()
    try:
        con.execute("BEGIN IMMEDIATE")
        con.execute(
            "INSERT INTO intake_batches (id, state, created_at) VALUES (?, 'claimed', ?)",
            (batch_id, now),
        )
        for record in records:
            existing = con.execute(
                "SELECT state FROM intake_items WHERE uuid = ?", (record["uuid"],)
            ).fetchone()
            if existing is None:
                con.execute(
                    """
                    INSERT INTO intake_items
                        (uuid, filename, recorded_at, batch_id, state, claimed_at)
                    VALUES (?, ?, ?, ?, 'claimed', ?)
                    """,
                    (record["uuid"], record["filename"], record["recorded_at"], batch_id, now),
                )
            elif existing["state"] == "ready":
                con.execute(
                    "UPDATE intake_items SET batch_id = ?, state = 'claimed', claimed_at = ? WHERE uuid = ?",
                    (batch_id, now, record["uuid"]),
                )
            else:
                continue
            claimed.append(record)
        if not claimed:
            con.execute("DELETE FROM intake_batches WHERE id = ?", (batch_id,))
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.close()

    return {"batch_id": batch_id if claimed else None, "count": len(claimed), "memos": claimed}


def intake_baseline() -> dict:
    """Record the current store as already seen before enabling intake."""
    records = read_recordings()
    now = _now()
    con = _state_connection()
    try:
        con.execute("BEGIN IMMEDIATE")
        existing = con.execute("SELECT COUNT(*) FROM intake_items").fetchone()[0]
        if existing:
            raise IntakeError(
                "intake state already exists; refusing to replace its cursor with a baseline"
            )
        for record in records:
            con.execute(
                """
                INSERT INTO intake_items
                    (uuid, filename, recorded_at, state, resolved_at, note)
                VALUES (?, ?, ?, 'baseline', ?, 'Initial store baseline')
                """,
                (record["uuid"], record["filename"], record["recorded_at"], now),
            )
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.close()
    return {"count": len(records), "state": "baseline"}


def intake_attach(batch_id: str, task_id: str) -> dict:
    """Record the task that owns an already claimed batch."""
    now = _now()
    con = _state_connection()
    try:
        con.execute("BEGIN IMMEDIATE")
        batch = con.execute("SELECT state FROM intake_batches WHERE id = ?", (batch_id,)).fetchone()
        if batch is None:
            raise IntakeError(f"unknown intake batch {batch_id}")
        if batch["state"] != "claimed":
            raise IntakeError(f"intake batch {batch_id} is already {batch['state']}")
        con.execute(
            "UPDATE intake_batches SET state = 'dispatched', task_id = ?, dispatched_at = ? WHERE id = ?",
            (task_id, now, batch_id),
        )
        changed = con.execute(
            "UPDATE intake_items SET state = 'dispatched' WHERE batch_id = ? AND state = 'claimed'",
            (batch_id,),
        ).rowcount
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.close()
    return {"batch_id": batch_id, "task_id": task_id, "count": changed}


def intake_release(batch_id: str) -> dict:
    """Return a claim to the ready queue when task creation did not happen."""
    con = _state_connection()
    try:
        con.execute("BEGIN IMMEDIATE")
        batch = con.execute("SELECT state FROM intake_batches WHERE id = ?", (batch_id,)).fetchone()
        if batch is None:
            raise IntakeError(f"unknown intake batch {batch_id}")
        if batch["state"] != "claimed":
            raise IntakeError(f"only an un-dispatched batch can be released; {batch_id} is {batch['state']}")
        changed = con.execute(
            "UPDATE intake_items SET state = 'ready', batch_id = NULL, claimed_at = NULL WHERE batch_id = ? AND state = 'claimed'",
            (batch_id,),
        ).rowcount
        con.execute("UPDATE intake_batches SET state = 'released' WHERE id = ?", (batch_id,))
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.close()
    return {"batch_id": batch_id, "count": changed}


def intake_resolve(recording: str, state: str, destination: str | None, note: str | None) -> dict:
    """Finish an item after a worker has made the content-based routing decision."""
    record = resolve(recording)
    con = _state_connection()
    try:
        con.execute("BEGIN IMMEDIATE")
        item = con.execute("SELECT state FROM intake_items WHERE uuid = ?", (record["uuid"],)).fetchone()
        if item is None:
            raise IntakeError(f"recording {record['uuid']} was never claimed for intake")
        if item["state"] not in ("claimed", "dispatched"):
            raise IntakeError(f"recording {record['uuid']} is already {item['state']}")
        con.execute(
            "UPDATE intake_items SET state = ?, resolved_at = ?, destination = ?, note = ? WHERE uuid = ?",
            (state, _now(), destination, note, record["uuid"]),
        )
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.close()
    return {"uuid": record["uuid"], "state": state, "destination": destination, "note": note}


def intake_status() -> dict:
    """Return intake state for audit and recovery; it does not inspect memo content."""
    con = _state_connection()
    try:
        rows = con.execute(
            """
            SELECT i.uuid, i.filename, i.recorded_at, i.state, i.destination, i.note,
                   i.batch_id, b.task_id
            FROM intake_items AS i
            LEFT JOIN intake_batches AS b ON b.id = i.batch_id
            ORDER BY i.recorded_at, i.uuid
            """
        ).fetchall()
    finally:
        con.close()
    return {"count": len(rows), "items": [dict(row) for row in rows]}


def apple_transcript(path: Path) -> dict | None:
    """Apple's on-device transcript, or None if the file carries none.

    Stored as JSON in a `tsrp` atom: an NSAttributedString-shaped array that
    alternates text segments with attribute dicts carrying time ranges.
    """
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise VoiceMemosError(f"could not read {path}: {exc}") from exc

    idx = data.find(b"tsrp")
    if idx < 4:
        return None

    # An MP4 atom is [4-byte big-endian size][4-byte type][body].
    size = struct.unpack(">I", data[idx - 4 : idx])[0]
    end = idx - 4 + size
    body = data[idx + 4 : end] if 4 < size <= len(data) - idx + 4 else data[idx + 4 :]

    try:
        parsed = json.loads(body.decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        # Truncated or a shape we do not know; fall back to visible text runs
        # rather than claiming there is no transcript.
        runs = [m.group().decode("ascii") for m in _TEXT_RUN.finditer(body)]
        return {"text": " ".join(runs).strip(), "locale": None, "segments": [], "exact": False} if runs else None

    attributed = parsed.get("attributedString") or []
    segments, texts = [], []
    for i in range(0, len(attributed), 2):
        chunk = attributed[i]
        if not isinstance(chunk, str):
            continue
        texts.append(chunk)
        attrs = attributed[i + 1] if i + 1 < len(attributed) else {}
        span = attrs.get("timeRange") if isinstance(attrs, dict) else None
        segments.append({"text": chunk, "time_range": span})

    locale = (parsed.get("locale") or {}).get("identifier")
    return {"text": "".join(texts).strip(), "locale": locale, "segments": segments, "exact": True}


def _humanize(seconds: int) -> str:
    return f"{seconds}s" if seconds < 60 else f"{seconds // 60}m {seconds % 60:02d}s"


def cmd_list(args: argparse.Namespace) -> int:
    records = read_recordings()
    if args.since:
        records = [r for r in records if r["date"] >= args.since]
    if args.check_transcripts:
        for r in records:
            p = Path(r["path"])
            r["has_apple_transcript"] = p.exists() and b"tsrp" in p.read_bytes()

    if args.json:
        json.dump({"count": len(records), "recordings": records}, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
        return 0

    if not records:
        print("No recordings found.")
        return 0
    for r in records:
        mark = ""
        if args.check_transcripts:
            mark = "  [apple transcript]" if r["has_apple_transcript"] else "  [no transcript]"
        title = "" if r["title_is_auto"] else f"  {r['title']}"
        print(f"{r['date']} {r['time']}  {_humanize(r['duration_seconds']):>9}  {r['filename']}{mark}{title}")
    return 0


def cmd_transcript(args: argparse.Namespace) -> int:
    record = resolve(args.recording)
    result = apple_transcript(Path(record["path"]))
    if result is None:
        if args.json:
            json.dump({"recording": record, "transcript": None}, sys.stdout, indent=2, ensure_ascii=False)
            sys.stdout.write("\n")
        else:
            print(
                f"{record['filename']}: no Apple transcript embedded.\n"
                "Apple writes these lazily — open the memo in Voice Memos, or transcribe "
                "the audio yourself (e.g. `elevenlabs transcribe`)."
            )
        return 1
    if args.json:
        json.dump({"recording": record, "transcript": result}, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        print(result["text"])
    return 0


def cmd_path(args: argparse.Namespace) -> int:
    print(resolve(args.recording)["path"])
    return 0


def _print_intake_result(result: dict, as_json: bool) -> None:
    if as_json:
        json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        print(result.get("count", 1))


def cmd_intake_claim(args: argparse.Namespace) -> int:
    _print_intake_result(intake_claim(), args.json)
    return 0


def cmd_intake_baseline(args: argparse.Namespace) -> int:
    _print_intake_result(intake_baseline(), args.json)
    return 0


def cmd_intake_attach(args: argparse.Namespace) -> int:
    _print_intake_result(intake_attach(args.batch, args.task), args.json)
    return 0


def cmd_intake_release(args: argparse.Namespace) -> int:
    _print_intake_result(intake_release(args.batch), args.json)
    return 0


def cmd_intake_resolve(args: argparse.Namespace) -> int:
    _print_intake_result(intake_resolve(args.recording, args.state, args.destination, args.note), args.json)
    return 0


def cmd_intake_status(args: argparse.Namespace) -> int:
    result = intake_status()
    if args.json:
        json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        for item in result["items"]:
            print(f"{item['state']:>10}  {item['uuid']}  {item['filename']}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="voice-memos", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="list recordings in the Voice Memos store")
    p_list.add_argument("--json", action="store_true", help="emit JSON")
    p_list.add_argument("--since", metavar="YYYY-MM-DD", help="only recordings on or after this date")
    p_list.add_argument(
        "--check-transcripts",
        action="store_true",
        help="also report whether each file carries an Apple transcript (reads every file)",
    )
    p_list.set_defaults(func=cmd_list)

    p_tr = sub.add_parser("transcript", help="print Apple's embedded transcript, if any")
    p_tr.add_argument("recording", help="UUID, filename, or filename stem")
    p_tr.add_argument("--json", action="store_true", help="emit JSON")
    p_tr.set_defaults(func=cmd_transcript)

    p_path = sub.add_parser("path", help="print the absolute audio path for a recording")
    p_path.add_argument("recording", help="UUID, filename, or filename stem")
    p_path.set_defaults(func=cmd_path)

    p_intake = sub.add_parser("intake", help="manage the plugin-owned durable intake queue")
    intake_sub = p_intake.add_subparsers(dest="intake_command", required=True)

    p_baseline = intake_sub.add_parser("baseline", help="mark the current store as already seen")
    p_baseline.add_argument("--json", action="store_true", help="emit JSON")
    p_baseline.set_defaults(func=cmd_intake_baseline)

    p_claim = intake_sub.add_parser("claim", help="atomically claim unseen recordings for one worker batch")
    p_claim.add_argument("--json", action="store_true", help="emit JSON")
    p_claim.set_defaults(func=cmd_intake_claim)

    p_attach = intake_sub.add_parser("attach", help="attach a created Codex task to a claimed batch")
    p_attach.add_argument("--batch", required=True, help="batch ID returned by intake claim")
    p_attach.add_argument("--task", required=True, help="Codex task ID")
    p_attach.add_argument("--json", action="store_true", help="emit JSON")
    p_attach.set_defaults(func=cmd_intake_attach)

    p_release = intake_sub.add_parser("release", help="return an un-dispatched claim to the queue")
    p_release.add_argument("--batch", required=True, help="batch ID returned by intake claim")
    p_release.add_argument("--json", action="store_true", help="emit JSON")
    p_release.set_defaults(func=cmd_intake_release)

    p_resolve = intake_sub.add_parser("resolve", help="record a worker's finished routing decision")
    p_resolve.add_argument("recording", help="recording UUID, filename, or filename stem")
    p_resolve.add_argument("--state", choices=("completed", "pending"), required=True)
    p_resolve.add_argument("--destination", help="canonical destination or concise outcome pointer")
    p_resolve.add_argument("--note", help="brief unresolved-routing note")
    p_resolve.add_argument("--json", action="store_true", help="emit JSON")
    p_resolve.set_defaults(func=cmd_intake_resolve)

    p_status = intake_sub.add_parser("status", help="show plugin-owned intake state")
    p_status.add_argument("--json", action="store_true", help="emit JSON")
    p_status.set_defaults(func=cmd_intake_status)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except VoiceMemosError as exc:
        print(f"voice-memos: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
