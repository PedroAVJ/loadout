import json
import importlib.util
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_ROOT = REPO_ROOT / "plugins" / "oracle"
SKILL_PATH = PLUGIN_ROOT / "skills" / "oracle" / "SKILL.md"


class DualOracleContractTests(unittest.TestCase):
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

    def test_manifest_versions_match_and_are_semver(self) -> None:
        codex_version = self.codex_manifest["version"]
        self.assertEqual(codex_version, self.claude_manifest["version"])
        self.assertRegex(codex_version, r"^\d+\.\d+\.\d+$")

    def test_both_requested_models_are_named(self) -> None:
        for text in (
            self.skill,
            (PLUGIN_ROOT / "README.md").read_text(encoding="utf-8"),
            self.codex_manifest["description"],
            self.claude_manifest["description"],
        ):
            self.assertIn("GPT-5.6 Sol Pro", text)
            self.assertIn("Fable 5", text)

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

    def test_both_independent_answers_are_required(self) -> None:
        normalized_skill = " ".join(self.skill.split())
        self.assertIn("Both answers are required", self.skill)
        self.assertIn(
            "Do not include one model's answer in the other model's prompt",
            normalized_skill,
        )
        self.assertIn("do not silently", self.skill.lower())
        self.assertIn("partial council result", self.skill)
        self.assertIn("Disagreements", self.skill)

    def test_visible_pro_verification_is_required(self) -> None:
        self.assertIn("choose **Pro**", self.skill)
        self.assertIn("explicit `GPT-5.6 Sol Pro` label", self.skill)
        self.assertIn("A control reading `Instant`", self.skill)

    def test_neutral_icons_exist_and_are_referenced(self) -> None:
        icon = PLUGIN_ROOT / "assets" / "oracle-icon.svg"
        skill_icon = PLUGIN_ROOT / "skills" / "oracle" / "assets" / "oracle-icon.svg"
        self.assertTrue(icon.is_file())
        self.assertTrue(skill_icon.is_file())
        self.assertEqual(self.codex_manifest["interface"]["logo"], "./assets/oracle-icon.svg")
        agent_yaml = (
            PLUGIN_ROOT / "skills" / "oracle" / "agents" / "openai.yaml"
        ).read_text(encoding="utf-8")
        self.assertIn('./assets/oracle-icon.svg', agent_yaml)

    def test_stale_gpt_5_5_references_are_gone(self) -> None:
        stale_marker = "gpt-" + "5.5"
        checked_paths = [
            REPO_ROOT / "README.md",
            REPO_ROOT / "plugins" / "README.md",
            REPO_ROOT / ".claude-plugin" / "marketplace.json",
            *[path for path in PLUGIN_ROOT.rglob("*") if path.is_file()],
        ]
        for path in checked_paths:
            self.assertNotIn(stale_marker, str(path).lower())
            if path.suffix.lower() in {".md", ".json", ".yaml", ".py", ".svg"}:
                self.assertNotIn(
                    stale_marker,
                    path.read_text(encoding="utf-8").lower(),
                    msg=str(path),
                )


if __name__ == "__main__":
    unittest.main()
