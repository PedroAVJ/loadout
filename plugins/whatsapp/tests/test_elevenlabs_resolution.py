import importlib.util
import pathlib
import unittest
from unittest import mock


CLI_PATH = pathlib.Path(__file__).parents[1] / "cli" / "whatsapp_cli.py"
SPEC = importlib.util.spec_from_file_location("whatsapp_cli", CLI_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class ElevenLabsResolutionTests(unittest.TestCase):
    def test_uses_elevenlabs_cli_from_path(self):
        with mock.patch.dict(MODULE.os.environ, {}, clear=False):
            MODULE.os.environ.pop("ELEVENLABS_TRANSCRIBE_SCRIPT", None)
            with mock.patch.object(MODULE.shutil, "which", return_value="/usr/local/bin/elevenlabs"):
                self.assertEqual(
                    MODULE.elevenlabs_transcribe_command(),
                    ["/usr/local/bin/elevenlabs", "transcribe"],
                )

    def test_resolution_is_independent_of_plugin_version_layout(self):
        """The old resolver guessed sibling plugin paths pinned to one version."""
        with mock.patch.dict(MODULE.os.environ, {}, clear=False):
            MODULE.os.environ.pop("ELEVENLABS_TRANSCRIBE_SCRIPT", None)
            with mock.patch.object(MODULE.shutil, "which", return_value="/opt/bin/elevenlabs") as which:
                command = MODULE.elevenlabs_transcribe_command()
            which.assert_called_once_with("elevenlabs")
            self.assertNotIn("0.1.0", " ".join(command))
            self.assertNotIn("cache", " ".join(command))

    def test_env_override_wins_over_path(self):
        with mock.patch.dict(MODULE.os.environ, {"ELEVENLABS_TRANSCRIBE_SCRIPT": "/tmp/custom.py"}):
            with mock.patch.object(MODULE.shutil, "which", return_value="/usr/local/bin/elevenlabs"):
                self.assertEqual(
                    MODULE.elevenlabs_transcribe_command(),
                    ["python3", "/tmp/custom.py"],
                )

    def test_missing_cli_raises_actionable_error(self):
        with mock.patch.dict(MODULE.os.environ, {}, clear=False):
            MODULE.os.environ.pop("ELEVENLABS_TRANSCRIBE_SCRIPT", None)
            with mock.patch.object(MODULE.shutil, "which", return_value=None):
                with self.assertRaises(MODULE.CliError) as caught:
                    MODULE.elevenlabs_transcribe_command()
        self.assertEqual(caught.exception.code, "missing_elevenlabs_cli")


if __name__ == "__main__":
    unittest.main()
