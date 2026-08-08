import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "voice_memos.py"
SPEC = importlib.util.spec_from_file_location("voice_memos", MODULE_PATH)
voice_memos = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(voice_memos)


RECORD = {
    "uuid": "A1111111-1111-1111-1111-111111111111",
    "filename": "20260808 100000-A1111111.m4a",
    "recorded_at": "2026-08-08T10:00:00",
    "path": "/tmp/20260808 100000-A1111111.m4a",
}


class IntakeStateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.state_db = Path(self.tmp.name) / "intake.sqlite3"
        self.state_patch = mock.patch.object(voice_memos, "STATE_DB", self.state_db)
        self.state_patch.start()

    def tearDown(self):
        self.state_patch.stop()
        self.tmp.cleanup()

    @mock.patch.object(voice_memos, "read_recordings", return_value=[RECORD])
    def test_baseline_marks_existing_store_as_already_seen(self, _read_recordings):
        result = voice_memos.intake_baseline()

        self.assertEqual(result, {"count": 1, "state": "baseline"})
        self.assertEqual(voice_memos.intake_claim()["count"], 0)

    @mock.patch.object(voice_memos, "read_recordings", return_value=[RECORD])
    def test_claim_is_uuid_deduplicated_and_attachable(self, _read_recordings):
        first = voice_memos.intake_claim()
        second = voice_memos.intake_claim()

        self.assertEqual(first["count"], 1)
        self.assertEqual(second["count"], 0)

        attached = voice_memos.intake_attach(first["batch_id"], "task-123")
        self.assertEqual(attached["count"], 1)
        self.assertEqual(voice_memos.intake_status()["items"][0]["state"], "dispatched")

    @mock.patch.object(voice_memos, "read_recordings", return_value=[RECORD])
    @mock.patch.object(voice_memos, "resolve", return_value=RECORD)
    def test_worker_resolution_is_durable_and_not_reclaimed(self, _resolve, _read_recordings):
        batch = voice_memos.intake_claim()
        voice_memos.intake_attach(batch["batch_id"], "task-123")
        result = voice_memos.intake_resolve(RECORD["uuid"], "completed", "/canonical/home", None)

        self.assertEqual(result["state"], "completed")
        self.assertEqual(voice_memos.intake_claim()["count"], 0)
        item = voice_memos.intake_status()["items"][0]
        self.assertEqual(item["destination"], "/canonical/home")

    @mock.patch.object(voice_memos, "read_recordings", return_value=[RECORD])
    def test_release_only_allows_a_task_creation_failure_to_retry(self, _read_recordings):
        batch = voice_memos.intake_claim()
        voice_memos.intake_release(batch["batch_id"])

        retried = voice_memos.intake_claim()
        self.assertEqual(retried["count"], 1)
        voice_memos.intake_attach(retried["batch_id"], "task-123")
        with self.assertRaises(voice_memos.IntakeError):
            voice_memos.intake_release(retried["batch_id"])


if __name__ == "__main__":
    unittest.main()
