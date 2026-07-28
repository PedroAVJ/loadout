import importlib.util
import pathlib
import unittest


SCRIPT_PATH = pathlib.Path(__file__).parents[1] / "scripts" / "run_design_pass.py"
SPEC = importlib.util.spec_from_file_location("run_design_pass", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class BuildCommandTests(unittest.TestCase):
    def test_visual_mode_is_read_only_and_defaults_to_fable(self):
        command = MODULE.build_command(
            pathlib.Path("/tmp/repo"),
            pathlib.Path("/tmp/debug.log"),
            "visual",
            MODULE.DEFAULT_MODEL,
            "medium",
            "prompt",
        )

        self.assertEqual("fable", MODULE.DEFAULT_MODEL)
        self.assertEqual("plan", command[command.index("--permission-mode") + 1])
        self.assertEqual("Read,Glob,Grep,LS", command[command.index("--tools") + 1])
        self.assertIn("--no-session-persistence", command)

    def test_implementation_mode_can_edit_without_bash(self):
        command = MODULE.build_command(
            pathlib.Path("/tmp/repo"),
            pathlib.Path("/tmp/debug.log"),
            "implement",
            "fable",
            "high",
            "prompt",
        )

        self.assertEqual("acceptEdits", command[command.index("--permission-mode") + 1])
        tools = command[command.index("--tools") + 1]
        self.assertIn("Edit", tools)
        self.assertIn("Write", tools)
        self.assertNotIn("Bash", tools)


if __name__ == "__main__":
    unittest.main()
