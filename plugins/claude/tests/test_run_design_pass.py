import importlib.util
import json
import pathlib
import unittest


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

        self.assertEqual("0.1.6", manifest["version"])
        self.assertIn("Claude Opus 5", skill)
        self.assertIn("--model claude-opus-5", skill)
        self.assertIn("`claude-opus-5`", readme)
        self.assertIn("Claude Opus 5", manifest["interface"]["longDescription"])
        for text in (skill, readme, json.dumps(manifest)):
            self.assertNotIn("Fable", text)
            self.assertNotIn("--model fable", text)


if __name__ == "__main__":
    unittest.main()
