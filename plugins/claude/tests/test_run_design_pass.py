import importlib.util
import json
import os
import pathlib
import sys
import unittest
from unittest import mock


SCRIPT_PATH = pathlib.Path(__file__).parents[1] / "scripts" / "run_design_pass.py"
PLUGIN_ROOT = pathlib.Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location("run_design_pass", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class BuildCommandTests(unittest.TestCase):
    def test_visual_mode_is_read_only_and_defaults_to_canonical_opus_5(self):
        command = MODULE.build_command(
            pathlib.Path("/tmp/repo"),
            pathlib.Path("/tmp/debug.log"),
            "visual",
            MODULE.DEFAULT_MODEL,
            "medium",
            "prompt",
        )

        self.assertEqual("claude-opus-5", MODULE.DEFAULT_MODEL)
        self.assertEqual("plan", command[command.index("--permission-mode") + 1])
        self.assertEqual("Read,Glob,Grep,LS", command[command.index("--tools") + 1])
        self.assertIn("--no-session-persistence", command)
        self.assertEqual(
            "claude-opus-5", command[command.index("--model") + 1]
        )

    def test_implementation_mode_can_edit_without_bash(self):
        command = MODULE.build_command(
            pathlib.Path("/tmp/repo"),
            pathlib.Path("/tmp/debug.log"),
            "implement",
            MODULE.DEFAULT_MODEL,
            "high",
            "prompt",
        )

        self.assertEqual("acceptEdits", command[command.index("--permission-mode") + 1])
        tools = command[command.index("--tools") + 1]
        self.assertIn("Edit", tools)
        self.assertIn("Write", tools)
        self.assertNotIn("Bash", tools)

    def test_frontend_contract_pins_canonical_opus_5(self):
        skill = (PLUGIN_ROOT / "skills" / "frontend-ui" / "SKILL.md").read_text(
            encoding="utf-8"
        )
        readme = (PLUGIN_ROOT / "README.md").read_text(encoding="utf-8")
        manifest = json.loads(
            (PLUGIN_ROOT / ".codex-plugin" / "plugin.json").read_text(
                encoding="utf-8"
            )
        )

        self.assertEqual("0.2.0", manifest["version"])
        self.assertIn("Claude Opus 5", skill)
        self.assertIn("--model claude-opus-5", skill)
        self.assertIn("`claude-opus-5`", readme)
        self.assertIn("Claude Opus 5", manifest["interface"]["longDescription"])

        # The plugin now also hosts oracle, so Fable may appear at plugin level.
        # The frontend pass itself must never drift onto it.
        self.assertNotIn("Fable", skill)
        self.assertNotIn("--model fable", skill)

    def test_design_pass_refuses_to_run_inside_claude_code(self):
        argv = ["run_design_pass.py", "--repo", "/tmp/repo"]
        with mock.patch.object(sys, "argv", argv):
            with mock.patch.dict(os.environ, {"CLAUDECODE": "1"}):
                # Must refuse before spawning anything; a nested Claude Code call
                # would ask the running model to second-opinion itself.
                self.assertEqual(2, MODULE.main())

    def test_design_pass_disables_model_fallback(self):
        environment = MODULE.claude_environment()
        self.assertEqual("1", environment["CLAUDE_CODE_NO_MODEL_FALLBACK"])


if __name__ == "__main__":
    unittest.main()
