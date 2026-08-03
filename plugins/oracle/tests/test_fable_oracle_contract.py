import importlib.util
import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_ROOT = REPO_ROOT / "plugins" / "oracle"
SKILL_PATH = PLUGIN_ROOT / "skills" / "oracle" / "SKILL.md"


class FableOracleContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill = SKILL_PATH.read_text(encoding="utf-8")
        self.codex_manifest = json.loads(
            (PLUGIN_ROOT / ".codex-plugin" / "plugin.json").read_text(
                encoding="utf-8"
            )
        )
        self.claude_manifest = json.loads(
            (PLUGIN_ROOT / ".claude-plugin" / "plugin.json").read_text(
                encoding="utf-8"
            )
        )
        helper_path = (
            PLUGIN_ROOT / "skills" / "oracle" / "scripts" / "oracle_fable.py"
        )
        spec = importlib.util.spec_from_file_location("oracle_fable", helper_path)
        assert spec is not None and spec.loader is not None
        self.oracle_fable = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.oracle_fable)

    def test_release_version_is_0_2_1(self) -> None:
        self.assertEqual(self.codex_manifest["version"], "0.2.1")
        self.assertEqual(self.claude_manifest["version"], "0.2.1")

    def test_fable_is_the_only_oracle_model(self) -> None:
        for text in (
            self.skill,
            (PLUGIN_ROOT / "README.md").read_text(encoding="utf-8"),
            self.codex_manifest["description"],
            self.claude_manifest["description"],
        ):
            self.assertIn("Fable 5", text)
        self.assertIn("Fable 5 is the only Oracle model", self.skill)

    def test_fable_invocation_is_explicit_and_ephemeral(self) -> None:
        for required in (
            "--model claude-fable-5",
            "CLAUDE_CODE_NO_MODEL_FALLBACK=1",
            "--tools ''",
            "--output-format json",
            "--no-session-persistence",
            "claude-fable-5",
        ):
            self.assertIn(required, self.skill)
        self.assertIn("canonical identifier", self.skill)
        self.assertIn("omit an effort override", self.skill.lower())
        self.assertNotIn("\n  --effort", self.skill)
        self.assertNotIn("\n  --model fable", self.skill)

        environment = self.oracle_fable._claude_environment()
        self.assertEqual(environment["CLAUDE_CODE_NO_MODEL_FALLBACK"], "1")

    def test_fable_identity_guard_is_fail_closed(self) -> None:
        valid_fable = {
            "is_error": False,
            "result": "answer",
            "modelUsage": {
                "fable": {
                    "canonicalModel": "claude-fable-5",
                    "outputTokens": 900,
                }
            },
        }
        valid_with_auxiliary = {
            "is_error": False,
            "result": "answer",
            "modelUsage": {
                "helper": {
                    "canonicalModel": "claude-haiku-4-5-20251001",
                    "outputTokens": 16,
                },
                "fable": {
                    "canonicalModel": "claude-fable-5",
                    "outputTokens": 10,
                },
            },
        }
        opus_only = {
            "is_error": False,
            "result": "answer",
            "modelUsage": {
                "helper": {
                    "canonicalModel": "claude-haiku-4-5-20251001",
                    "outputTokens": 16,
                },
                "opus": {
                    "canonicalModel": "claude-opus-5",
                    "outputTokens": 900,
                },
            },
        }
        fable_and_opus = {
            "is_error": False,
            "result": "answer",
            "modelUsage": {
                "fable": {
                    "canonicalModel": "claude-fable-5",
                    "outputTokens": 900,
                },
                "opus": {
                    "canonicalModel": "claude-opus-5",
                    "outputTokens": 1,
                },
            },
        }

        self.oracle_fable.validate_fable_result(valid_fable)
        self.oracle_fable.validate_fable_result(valid_with_auxiliary)
        with self.assertRaises(self.oracle_fable.FableValidationError):
            self.oracle_fable.validate_fable_result(opus_only)
        with self.assertRaises(self.oracle_fable.FableValidationError):
            self.oracle_fable.validate_fable_result(fable_and_opus)

    def test_failure_returns_no_oracle_answer(self) -> None:
        self.assertIn("Oracle did not produce an answer", self.skill)
        self.assertIn("do not return an Oracle answer", self._agent_yaml())
        self.assertIn("Do not silently", self.skill)

    def test_neutral_icons_exist_and_are_referenced(self) -> None:
        icon = PLUGIN_ROOT / "assets" / "oracle-icon.svg"
        skill_icon = PLUGIN_ROOT / "skills" / "oracle" / "assets" / "oracle-icon.svg"
        self.assertTrue(icon.is_file())
        self.assertTrue(skill_icon.is_file())
        self.assertEqual(
            self.codex_manifest["interface"]["logo"], "./assets/oracle-icon.svg"
        )
        self.assertIn('./assets/oracle-icon.svg', self._agent_yaml())

    def test_removed_lane_claims_are_absent_from_visible_content(self) -> None:
        removed_terms = (
            "g" + "pt",
            "chat" + "gpt",
            "chro" + "me",
            "two-" + "model",
            "coun" + "cil",
        )
        visible_files = [
            REPO_ROOT / "README.md",
            REPO_ROOT / "plugins" / "README.md",
            REPO_ROOT / ".claude-plugin" / "marketplace.json",
            *[
                path
                for path in PLUGIN_ROOT.rglob("*")
                if path.is_file()
                and "__pycache__" not in path.parts
                and "tests" not in path.parts
                and path.suffix.lower() in {".md", ".json", ".yaml", ".py", ".svg"}
            ],
        ]
        for path in visible_files:
            text = path.read_text(encoding="utf-8").lower()
            if path in {REPO_ROOT / "README.md", REPO_ROOT / "plugins" / "README.md"}:
                text = "\n".join(
                    line for line in text.splitlines() if "plugins/oracle" in line or "oracle" in line
                )
            if path == REPO_ROOT / ".claude-plugin" / "marketplace.json":
                marketplace = json.loads(path.read_text(encoding="utf-8"))
                text = json.dumps(
                    next(
                        plugin
                        for plugin in marketplace["plugins"]
                        if plugin["name"] == "oracle"
                    )
                ).lower()
            for term in removed_terms:
                self.assertNotIn(term, text, msg=f"{term} in {path}")

    def _agent_yaml(self) -> str:
        return (
            PLUGIN_ROOT / "skills" / "oracle" / "agents" / "openai.yaml"
        ).read_text(encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
