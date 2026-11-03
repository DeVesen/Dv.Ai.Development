"""Selbsttests der Plugin-Druckerei: neues Projekt, Vorlagen, Try-Deploy, Deploy, Übernahme, Abgleich, Sensoren.

Start: python3 -m unittest discover -s tests (im Plugin-Ordner). Die Tests arbeiten nur in Temp-Ordnern.
"""

from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
CLI = PLUGIN / "scripts" / "druckerei.py"
HOOK = PLUGIN / "scripts" / "hook.js"
ENV = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
# Ohne claude CLI im PATH bleibt der TÜV-Schritt aus; die Tests prüfen die Druckerei, nicht den Validator.
ENV_NO_CLAUDE = {**ENV, "PATH": os.pathsep.join(p for p in ENV.get("PATH", "").split(os.pathsep) if not (Path(p) / "claude").exists())}


def run(*args: str, cwd: Path | None = None, env: dict | None = None) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(CLI), *args], cwd=cwd, env=env or ENV_NO_CLAUDE, capture_output=True, text=True)


class Base(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="druckerei-test-"))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp, ignore_errors=True)

    def new_project(self, name: str = "dv-probe") -> Path:
        root = self.tmp / "projekt"
        result = run("neu", str(root), "--name", name, "--beschreibung", "Probe.", "--owner", "Test")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return root


class NeuesProjekt(Base):
    def test_neu_PrintsAndTryDeployIsGreen(self):
        root = self.new_project()
        self.assertTrue((root / "druckerei.yaml").is_file())
        self.assertTrue((root / "dist" / "probe" / "skills" / "probe" / "SKILL.md").is_file())
        result = run("pruefen", "--projekt", str(root))
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("TRY-DEPLOY ok.", result.stdout)

    def test_neu_InvalidName_IsRefused(self):
        result = run("neu", str(self.tmp / "x"), "--name", "Claude-Tool", "--owner", "Test")
        self.assertEqual(result.returncode, 1)
        self.assertIn("Kleinbuchstaben", result.stderr)

    def test_brokenReference_FailsWithFileAndLine(self):
        root = self.new_project()
        skill = root / "src" / "probe" / "skills" / "probe" / "SKILL.md"
        skill.write_text(skill.read_text(encoding="utf-8") + "\nSiehe dv-probe:gibt-es-nicht.\n", encoding="utf-8")
        result = run("pruefen", "--schnell", "--projekt", str(root))
        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stdout, r"FEHLER src/probe/skills/probe/SKILL\.md:\d+: Verweis dv-probe:gibt-es-nicht")

    def test_missingRequiredField_FailsInSchemaStage(self):
        root = self.new_project()
        skill = root / "src" / "probe" / "skills" / "probe" / "SKILL.md"
        skill.write_text(skill.read_text(encoding="utf-8").replace("model_invocation: allowed\n", ""), encoding="utf-8")
        result = run("pruefen", "--schnell", "--projekt", str(root))
        self.assertEqual(result.returncode, 1)
        self.assertIn("model_invocation", result.stdout)


class Vorlagen(unittest.TestCase):
    def test_vorlage_ListsEveryKindAndPrintsEach(self):
        listing = run("vorlage")
        self.assertEqual(listing.returncode, 0)
        kinds = [line.split()[0] for line in listing.stdout.splitlines()[1:] if line.strip()]
        self.assertGreaterEqual(len(kinds), 10)
        for kind in kinds:
            result = run("vorlage", kind)
            self.assertEqual(result.returncode, 0, kind)
            self.assertIn("Pflicht", result.stdout, kind)

    def test_vorlage_UnknownKind_ExitsTwo(self):
        self.assertEqual(run("vorlage", "gibtsnicht").returncode, 2)


class Deploy(Base):
    def test_deploy_RaisesVersionAndPrintsDist(self):
        root = self.new_project()
        result = run("deploy", "--stufe", "minor", "--projekt", str(root))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("0.1.0 → 0.2.0", result.stdout)
        manifest = json.loads((root / "dist" / "probe" / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["version"], "0.2.0")
        self.assertIn("version: 0.2.0", (root / "src" / "plugins" / "probe.yaml").read_text(encoding="utf-8"))

    def test_deploy_RedTryDeploy_KeepsVersion(self):
        root = self.new_project()
        skill = root / "src" / "probe" / "skills" / "probe" / "SKILL.md"
        skill.write_text(skill.read_text(encoding="utf-8") + "\nSiehe dv-probe:gibt-es-nicht.\n", encoding="utf-8")
        result = run("deploy", "--stufe", "patch", "--projekt", str(root))
        self.assertEqual(result.returncode, 1)
        self.assertIn("Deploy abgebrochen", result.stderr)
        self.assertIn("version: 0.1.0", (root / "src" / "plugins" / "probe.yaml").read_text(encoding="utf-8"))


class Uebernahme(Base):
    def fake_plugin(self) -> Path:
        plugin = self.tmp / "bestand" / "demo"
        files = {
            ".claude-plugin/plugin.json": json.dumps({"name": "dv-demo", "version": "1.2.3", "description": "Demo"}, indent=2) + "\n",
            "README.md": "# dv-demo\n\nDemo-Plugin.\n",
            "skills/eins/SKILL.md": "---\nname: eins\ndescription: Does one thing. Use when one thing is needed.\n---\n\n# Eins\n\n"
                                    "Dieser Absatz steht wortgleich in zwei Skills und wird deshalb ein Baustein der Druckerei.\n",
            "skills/zwei/SKILL.md": "---\nname: zwei\ndescription: >\n  Does a second thing.\n  Use when two is needed.\ndisable-model-invocation: true\n---\n\n# Zwei\n\n"
                                    "Dieser Absatz steht wortgleich in zwei Skills und wird deshalb ein Baustein der Druckerei.\n",
            "agents/pruefer.md": "---\nname: pruefer\ndescription: Use when something needs a check.\ntools: Read\nmodel: sonnet\n---\n\nPrüft.\n",
            "hooks/hooks.json": json.dumps({"hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": [
                {"type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/wache.js\" pre"}]}]}}, indent=2) + "\n",
            "scripts/wache.js": "process.exit(0);\n",
            "bin/demo": "#!/bin/sh\necho demo\n",
        }
        for rel, content in files.items():
            path = plugin / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        (plugin / "bin" / "demo").chmod(0o755)
        return plugin

    def test_neuAus_IsWordForWordWithPartialsHooksAndExecutableBit(self):
        plugin = self.fake_plugin()
        root = self.tmp / "projekt"
        result = run("neu", str(root), "--aus", str(plugin), "--owner", "Test")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("jede Datei entspricht dem Bestand", result.stdout)
        self.assertIn("1 Partials", result.stdout)
        self.assertIn("Hooks als Daten", result.stdout)
        manifest = (root / "src" / "plugins" / "demo.yaml").read_text(encoding="utf-8")
        self.assertIn("lint: bestand", manifest)
        self.assertIn("wache.js pre", manifest)
        skill = (root / "src" / "demo" / "skills" / "zwei" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("model_invocation: disabled", skill)
        deployed = run("deploy", "--stufe", "patch", "--projekt", str(root))
        self.assertEqual(deployed.returncode, 0, deployed.stdout + deployed.stderr)
        self.assertTrue(os.stat(root / "dist" / "demo" / "bin" / "demo").st_mode & stat.S_IXUSR)

    def test_changeWithoutChangelog_IsAnError_AbnehmenAfterEntry(self):
        plugin = self.fake_plugin()
        root = self.tmp / "projekt"
        self.assertEqual(run("neu", str(root), "--aus", str(plugin), "--owner", "Test").returncode, 0)
        readme = root / "src" / "demo" / "README.md"
        readme.write_text(readme.read_text(encoding="utf-8").replace("Demo-Plugin.", "Demo-Plugin, geändert."), encoding="utf-8")
        result = run("pruefen", "--schnell", "--projekt", str(root))
        self.assertEqual(result.returncode, 1)
        self.assertIn("nicht im Änderungsprotokoll", result.stdout)
        changes = root / "src" / "demo" / "CHANGES.yaml"
        changes.write_text(changes.read_text(encoding="utf-8").replace(
            "changes: []", 'changes:\n  - befund: "1"\n    titel: README ergänzt\n    dateien:\n      - README.md'), encoding="utf-8")
        self.assertEqual(run("pruefen", "--schnell", "--projekt", str(root)).returncode, 1, "ohne abgenommenen Stand bleibt das Siegel offen")
        self.assertEqual(run("abnehmen", "--projekt", str(root)).returncode, 0)
        self.assertEqual(run("pruefen", "--schnell", "--projekt", str(root)).returncode, 0)


@unittest.skipUnless(shutil.which("node"), "node fehlt")
class Sensoren(Base):
    def hook(self, mode: str, file: Path) -> subprocess.CompletedProcess:
        payload = json.dumps({"tool_name": "Edit", "tool_input": {"file_path": str(file)}})
        return subprocess.run(["node", str(HOOK), mode], input=payload, capture_output=True, text=True, env=ENV_NO_CLAUDE)

    def test_pre_EditInDist_IsBlocked(self):
        root = self.new_project()
        result = self.hook("pre", root / "dist" / "probe" / "README.md")
        self.assertEqual(result.returncode, 2)
        self.assertIn("ist gedruckt", result.stderr)

    def test_pre_EditInSrc_Passes(self):
        root = self.new_project()
        self.assertEqual(self.hook("pre", root / "src" / "probe" / "README.md").returncode, 0)

    def test_post_BrokenSource_ReportsTheError(self):
        root = self.new_project()
        skill = root / "src" / "probe" / "skills" / "probe" / "SKILL.md"
        skill.write_text(skill.read_text(encoding="utf-8") + "\nSiehe dv-probe:gibt-es-nicht.\n", encoding="utf-8")
        result = self.hook("post", skill)
        self.assertEqual(result.returncode, 2)
        self.assertIn("gibt-es-nicht", result.stderr)

    def test_outsideAProject_Passes(self):
        self.assertEqual(self.hook("pre", self.tmp / "irgendwo" / "datei.md").returncode, 0)


if __name__ == "__main__":
    unittest.main()
