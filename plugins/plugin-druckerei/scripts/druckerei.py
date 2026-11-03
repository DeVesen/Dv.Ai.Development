#!/usr/bin/env python3
"""Plugin-Druckerei: ein Befehl für Plugin-Projekte.

    druckerei neu <ordner> --name <plugin> [--beschreibung <text>] [--marketplace <name>] [--owner <name>]
    druckerei neu <ordner> --aus <plugin-ordner>   neues Projekt aus einem bestehenden Plugin (wortgleich übernommen)
    druckerei vorlage <art>                 Gerüst zum Ausfüllen; ohne <art> die Liste
    druckerei pruefen [--schnell]           Try-Deploy: drucken in einen Temp-Ordner, prüfen, TÜV, Probeläufe; ändert nichts
    druckerei deploy --stufe patch|minor|major [--plugin <name>]
                                            nur wenn pruefen grün ist: Version erhöhen, nach dist/ drucken, erneut prüfen
    druckerei uebernehmen <plugin-ordner> [--force]
                                            bestehendes Plugin wortgleich in die Quellen des Projekts übernehmen
    druckerei abnehmen                      gewollte Abweichungen vom Bestand als neuen Stand ins Änderungsprotokoll übernehmen
    druckerei status                        Plugins, Versionen, offene Warnungen

Gemeinsame Option: --projekt <ordner> (sonst: Ordner mit druckerei.yaml ab dem aktuellen Ordner aufwärts).
Exit-Code 0 = alles in Ordnung, 1 = Problem gefunden, 2 = falscher Aufruf.
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
BUILD = HERE / "build.py"
VORLAGEN = HERE / "vorlagen"
PROJECT_FILE = "druckerei.yaml"
DEPS = ("yaml", "jinja2", "jsonschema")


def fail(message: str, code: int = 1) -> int:
    sys.stdout.flush()
    print(f"druckerei: {message}", file=sys.stderr)
    return code


def check_deps() -> str | None:
    missing = []
    for mod in DEPS:
        try:
            __import__(mod)
        except ImportError:
            missing.append({"yaml": "pyyaml"}.get(mod, mod))
    return f"Python-Pakete fehlen: {', '.join(missing)}. Installieren: pip install {' '.join(missing)}" if missing else None


def find_project(start: Path) -> Path | None:
    for folder in [start, *start.parents]:
        if (folder / PROJECT_FILE).is_file():
            return folder
    return None


def project_of(args) -> Path:
    if getattr(args, "projekt", None):
        root = Path(args.projekt).resolve()
        if not (root / PROJECT_FILE).is_file():
            sys.exit(fail(f"{root} ist kein Projekt ({PROJECT_FILE} fehlt)"))
        return root
    root = find_project(Path.cwd().resolve())
    if not root:
        sys.exit(fail(f"kein Projekt gefunden ({PROJECT_FILE} fehlt hier und darüber). Neues Projekt: druckerei neu <ordner> --name <plugin>"))
    return root


# ---------------------------------------------------------------------------------------------------------------------
# Drucken und Prüfen


def run_build(root: Path, out: Path | None = None, accept: bool = False) -> tuple[int, str]:
    env = {**os.environ, "DRUCKEREI_PROJEKT": str(root), "PYTHONDONTWRITEBYTECODE": "1"}
    env.pop("DRUCKEREI_AUSGABE", None)
    if out:
        env["DRUCKEREI_AUSGABE"] = str(out)
    cmd = [sys.executable, str(BUILD)] + (["--accept"] if accept else [])
    result = subprocess.run(cmd, cwd=root, env=env, capture_output=True, text=True)
    return result.returncode, result.stdout + result.stderr


def validate(dist: Path, relaxed: set | None = None) -> tuple[bool | None, list[str]]:
    """claude plugin validate für den Marketplace und jedes Plugin; None, wenn die claude CLI fehlt.
    --strict, außer für Plugins mit lint: bestand (frisch übernommen): dort zählen strenge Hinweise nur als Warnung."""
    claude = shutil.which("claude")
    if not claude:
        return None, ["claude CLI nicht gefunden; TÜV übersprungen"]
    relaxed = relaxed or set()
    lines, ok = [], True
    targets = [dist] + sorted(p for p in dist.iterdir() if (p / ".claude-plugin" / "plugin.json").is_file())
    for target in targets:
        label = target.name if target != dist else "Marketplace"
        soft = (target.name in relaxed) or (target == dist and bool(relaxed))
        result = subprocess.run([claude, "plugin", "validate", *([] if soft else ["--strict"]), str(target)], capture_output=True, text=True)
        verdict = next((l for l in result.stdout.splitlines() if re.match(r"^(√|×) Validation", l)), result.stdout.strip()[-120:])
        passed = result.returncode == 0
        ok = ok and passed
        lines.append(f"{'bestanden' if passed else 'DURCHGEFALLEN'}: {label} ({verdict}{', ohne --strict wegen lint: bestand' if soft else ''})")
        hints = [l.strip() for l in result.stdout.splitlines() if l.strip().startswith(">")]
        if not passed or soft:
            lines += [f"    {h}" for h in hints if "plugin directory" not in h.lower()][:8]
    return ok, lines


def relaxed_dirs(root: Path) -> set:
    return {d.get("dir", p.stem) for _, (p, d) in manifests(root).items() if d.get("lint") == "bestand"}


def run_tests(dist: Path) -> tuple[bool | None, list[str]]:
    """Probeläufe je Plugin: node --test für tests/*.test.js, unittest für tests/test_*.py. None, wenn es keine gibt."""
    lines, ok, ran = [], True, False
    for plugin in sorted(p for p in dist.iterdir() if (p / ".claude-plugin" / "plugin.json").is_file()):
        tests = plugin / "tests"
        if list(tests.glob("*.test.js")):
            ran = True
            node = shutil.which("node")
            if not node:
                lines.append(f"{plugin.name}: node fehlt, JavaScript-Tests übersprungen")
                continue
            result = subprocess.run([node, "--test", "tests/*.test.js"], cwd=plugin, capture_output=True, text=True)
            counts = dict(re.findall(r"^# (pass|fail|skipped) (\d+)$", result.stdout, re.M))
            passed = result.returncode == 0
            ok = ok and passed
            lines.append(f"{plugin.name}: {counts.get('pass', '?')} bestanden, {counts.get('fail', '?')} fehlgeschlagen, {counts.get('skipped', '0')} übersprungen")
            if not passed:
                lines += [f"    {l.strip()}" for l in result.stdout.splitlines() if l.startswith("not ok")][:10]
        if list(tests.glob("test_*.py")):
            ran = True
            result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-q"], cwd=plugin, capture_output=True, text=True)
            passed = result.returncode == 0
            ok = ok and passed
            lines.append(f"{plugin.name}: Python-Tests {'bestanden' if passed else 'FEHLGESCHLAGEN'}")
            if not passed:
                lines += [f"    {l}" for l in result.stderr.splitlines()[-8:]]
    return (ok if ran else None), lines


def compare_dirs(new: Path, old: Path) -> tuple[int, int, int]:
    if not old.is_dir():
        return 0, sum(1 for p in new.rglob("*") if p.is_file()), 0
    a = {p.relative_to(new).as_posix(): p for p in new.rglob("*") if p.is_file()}
    b = {p.relative_to(old).as_posix(): p for p in old.rglob("*") if p.is_file()}
    changed = sum(1 for k in a.keys() & b.keys() if a[k].read_bytes() != b[k].read_bytes())
    return changed, len(a.keys() - b.keys()), len(b.keys() - a.keys())


def split_output(text: str) -> tuple[list[str], list[str], list[str]]:
    errors = [l[len("FEHLER "):] for l in text.splitlines() if l.startswith("FEHLER ")]
    warnings = [l[len("WARNUNG "):] for l in text.splitlines() if l.startswith("WARNUNG ")]
    other = [l for l in text.splitlines() if not l.startswith(("FEHLER ", "WARNUNG "))]
    return errors, warnings, other


def try_deploy(root: Path, quick: bool, label: str = "TRY-DEPLOY") -> bool:
    """Druckt in einen Temp-Ordner und prüft alles; im Projekt ändert sich nichts."""
    with tempfile.TemporaryDirectory(prefix="druckerei-") as tmp:
        out = Path(tmp) / "dist"
        code, text = run_build(root, out)
        errors, warnings, other = split_output(text)
        stage = next((l for l in other if l.startswith("build: ") and "Fehler in Stufe" in l), "")
        if code != 0:
            print(f"{label} fehlgeschlagen. {stage.removeprefix('build: ')}".rstrip())
            for e in errors:
                print(f"  FEHLER {e}")
            if not errors:
                print("\n".join(f"  {l}" for l in other[-15:]))
            return False
        print(f"Drucken und Prüfen: ok ({len(warnings)} Warnungen)")
        for l in other:
            if l.startswith("  "):
                print(f"  {l.strip()}")
        ok = True
        if not quick:
            v_ok, v_lines = validate(out, relaxed_dirs(root))
            print("TÜV (claude plugin validate):")
            for l in v_lines:
                print(f"  {l}")
            t_ok, t_lines = run_tests(out)
            print("Probeläufe (Tests):" if t_ok is not None else "Probeläufe (Tests): keine Tests im Projekt")
            for l in t_lines:
                print(f"  {l}")
            ok = (v_ok is not False) and (t_ok is not False)
            changed, new, gone = compare_dirs(out, root / "dist")
            print(f"Gegenüber dist/: {changed} Dateien geändert, {new} neu, {gone} entfernt.")
        if warnings:
            print("Warnungen:")
            for w in warnings:
                print(f"  {w}")
        print(f"{label} {'ok' if ok else 'fehlgeschlagen'}.")
        return ok


# ---------------------------------------------------------------------------------------------------------------------
# Deploy


VERSION_LINE = re.compile(r"^version:\s*['\"]?(\d+)\.(\d+)\.(\d+)['\"]?\s*$", re.M)


def manifests(root: Path) -> dict:
    import yaml
    found = {}
    for path in sorted((root / "src" / "plugins").glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        found[data.get("name", path.stem)] = (path, data)
    return found


def bumped(version: tuple[int, int, int], stufe: str) -> tuple[int, int, int]:
    major, minor, patch = version
    return {"major": (major + 1, 0, 0), "minor": (major, minor + 1, 0), "patch": (major, minor, patch + 1)}[stufe]


def ensure_version_entry(changelog: Path, new: str) -> None:
    """Steht plugin.json nicht im Änderungsprotokoll, kommt ein Eintrag für die Version dazu (vor dem abgenommenen Stand)."""
    text = changelog.read_text(encoding="utf-8")
    if ".claude-plugin/plugin.json" in text:
        return
    entry = f'  - befund: "V"\n    titel: Version {new} (druckerei deploy)\n    dateien:\n      - .claude-plugin/plugin.json\n'
    mark = "# --- Abgenommener Stand"
    if "changes: []" in text:
        text = text.replace("changes: []", "changes:\n" + entry.rstrip("\n"), 1)
    elif mark in text:
        head, tail = text.split(mark, 1)
        text = head.rstrip("\n") + "\n" + entry + "\n" + mark + tail
    else:
        text = text.rstrip("\n") + "\n" + entry
    changelog.write_text(text, encoding="utf-8")


def deploy(root: Path, stufe: str, name: str | None) -> int:
    found = manifests(root)
    if name is None:
        if len(found) != 1:
            return fail(f"mehrere Plugins im Projekt ({', '.join(found)}); wähle eines mit --plugin <name>")
        name = next(iter(found))
    if name not in found:
        alias = {d.get("dir", p.stem): n for n, (p, d) in found.items()}
        if name not in alias:
            return fail(f"Plugin {name} gibt es nicht; vorhanden: {', '.join(found)}")
        name = alias[name]
    path, data = found[name]
    print(f"== 1/3 Try-Deploy vor dem Deploy ({name})")
    if not try_deploy(root, quick=False, label="TRY-DEPLOY"):
        return fail("Deploy abgebrochen: der Try-Deploy ist nicht grün. Erst die Probleme beheben.")
    text = path.read_text(encoding="utf-8")
    m = VERSION_LINE.search(text)
    if not m:
        return fail(f"{path.relative_to(root)}: keine Zeile version: x.y.z")
    old = tuple(int(x) for x in m.groups())
    new = bumped(old, stufe)
    old_s, new_s = ".".join(map(str, old)), ".".join(map(str, new))
    backups = {path: text}
    changelog = root / data["changelog"] if data.get("changelog") else None
    if changelog and changelog.is_file():
        backups[changelog] = changelog.read_text(encoding="utf-8")
    dist_backup = None
    if (root / "dist").is_dir():
        dist_backup = Path(tempfile.mkdtemp(prefix="druckerei-dist-")) / "dist"
        shutil.copytree(root / "dist", dist_backup, symlinks=True)

    def rollback(reason: str) -> int:
        for file, content in backups.items():
            file.write_text(content, encoding="utf-8")
        if dist_backup:
            shutil.rmtree(root / "dist", ignore_errors=True)
            shutil.copytree(dist_backup, root / "dist", symlinks=True)
        return fail(f"Deploy zurückgenommen: {reason}. Version bleibt {old_s}, dist/ wie vorher.")

    print(f"== 2/3 Version {old_s} → {new_s} ({stufe}), drucken nach dist/")
    path.write_text(text[:m.start()] + f"version: {new_s}" + text[m.end():], encoding="utf-8")
    if changelog and changelog.is_file():
        ensure_version_entry(changelog, new_s)
    code, out = run_build(root, accept=bool(changelog and changelog.is_file()))
    if code != 0:
        print(out[-3000:])
        return rollback("der Druck mit neuer Version scheiterte")
    print(f"== 3/3 Abnahme der gedruckten Fassung in dist/")
    v_ok, v_lines = validate(root / "dist", relaxed_dirs(root))
    t_ok, t_lines = run_tests(root / "dist")
    for l in v_lines + t_lines:
        print(f"  {l}")
    if v_ok is False or t_ok is False:
        return rollback("die gedruckte Fassung besteht TÜV oder Probeläufe nicht")
    print(f"DEPLOY ok: {name} {old_s} → {new_s}; dist/ ist neu gedruckt. Nichts committet und nichts gepusht.")
    return 0


# ---------------------------------------------------------------------------------------------------------------------
# Neues Projekt, Vorlagen, Status


def neu(target: Path, name: str, beschreibung: str, marketplace: str | None, owner: str) -> int:
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", name) or re.search(r"claude|anthropic", name):
        return fail("--name: Kleinbuchstaben, Ziffern, Bindestriche, höchstens 64 Zeichen, ohne claude oder anthropic")
    if target.exists() and any(target.iterdir()):
        return fail(f"{target} existiert und ist nicht leer")
    folder = name.removeprefix("dv-")
    skill = folder
    if not owner:
        owner = subprocess.run(["git", "config", "user.name"], capture_output=True, text=True).stdout.strip()
    if not owner:
        return fail("--owner <name> fehlt (wird author in plugin.json; claude plugin validate --strict verlangt ihn)")
    market = marketplace or folder + "-lokal"
    files = {
        PROJECT_FILE: f"# Projekt der Plugin-Druckerei. Quellen in src/, Ausgabe in dist/.\nmarketplace: {market}\nowner: {owner}\nbeschreibung: \"{beschreibung}\"\n",
        ".gitignore": "# Ausgabe einchecken, damit sie mit dem Druck verglichen werden kann (manche Repos ignorieren dist/).\n!dist/\n",
        f"src/plugins/{folder}.yaml": (VORLAGEN / "projekt-plugin.yaml").read_text(encoding="utf-8")
            .replace("<name>", name).replace("<ordner>", folder).replace("<beschreibung>", beschreibung).replace("<owner>", owner),
        f"src/{folder}/README.md": (VORLAGEN / "projekt-readme.md").read_text(encoding="utf-8")
            .replace("<name>", name).replace("<ordner>", folder).replace("<beschreibung>", beschreibung).replace("<marketplace>", market),
        f"src/{folder}/skills/{skill}/SKILL.md": (VORLAGEN / "projekt-skill.md").read_text(encoding="utf-8")
            .replace("<name>", name).replace("<ordner>", folder).replace("<skill>", skill),
    }
    for rel_path, content in files.items():
        p = target / rel_path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
    print(f"Projekt angelegt: {target}")
    print("Erster Druck zur Kontrolle:")
    code, out = run_build(target.resolve())
    print("\n".join(f"  {l}" for l in out.strip().splitlines()))
    return 0 if code == 0 else 1


def neu_aus(target: Path, plugin: Path, marketplace: str | None, owner: str) -> int:
    meta_file = plugin / ".claude-plugin" / "plugin.json"
    if not meta_file.is_file():
        return fail(f"{plugin} ist kein Plugin (.claude-plugin/plugin.json fehlt)")
    if target.exists() and any(target.iterdir()):
        return fail(f"{target} existiert und ist nicht leer")
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    target.mkdir(parents=True, exist_ok=True)
    (target / PROJECT_FILE).write_text(
        f"# Projekt der Plugin-Druckerei, angelegt aus {plugin.name}. Quellen in src/, Ausgabe in dist/.\n"
        f"marketplace: {marketplace or plugin.name + '-lokal'}\nowner: {owner}\nbeschreibung: \"{meta.get('description', '')}\"\n", encoding="utf-8")
    (target / ".gitignore").write_text("!dist/\n", encoding="utf-8")
    import uebernehmen
    return uebernehmen.run(target.resolve(), plugin, False)


VORLAGE_ARTEN = {
    "regel": "Eine Regel im gemeinsamen Kern (src/rules/<thema>.yaml) oder im Bestellschein eines Plugins",
    "regeldatei": "Eine Regeldatei, aus der eine geteilte Markdown-Datei mit nummerierten Regeln entsteht (src/<plugin>/rules/)",
    "etappe": "Ein Schritt eines Ablaufs mit Eingang, Ergebnis und Gate (src/phases/<id>.yaml)",
    "etappen": "Die Etappen einer Kette, die eine Leit-Instanz startet (src/<plugin>/etappen.yaml)",
    "partial": "Ein Textbaustein, der wortgleich an mehreren Stellen steht (src/<plugin>/partials/<name>.md)",
    "skill": "Eine Arbeitsanweisung (src/<plugin>/skills/<name>/SKILL.md)",
    "referenz": "Ein Beiblatt zu einem Skill (src/<plugin>/skills/<name>/references/<datei>.md)",
    "agent": "Ein Spezialist mit frischem Kontext und begrenzten Werkzeugen (src/<plugin>/agents/<name>.md)",
    "befehl": "Eine Kurzwahl, ein Slash-Befehl (src/<plugin>/commands/<name>.md)",
    "geteilt": "Eine geteilte Datei, die mehrere Skills lesen (src/<plugin>/shared/<pfad>.md)",
    "hook": "Ein Sensor, der bei einem Ereignis ein Skript startet (Eintrag in src/plugins/<plugin>.yaml)",
    "begriff": "Ein Eintrag im Wörterbuch (src/glossary.yaml)",
    "aenderung": "Ein Eintrag im Änderungsprotokoll (src/<plugin>/CHANGES.yaml)",
    "plugin": "Ein Bestellschein für ein Plugin aus Komponenten (src/plugins/<plugin>.yaml)",
}


def vorlage(art: str | None) -> int:
    if not art:
        print("Vorlagen: druckerei vorlage <art>")
        for k, v in VORLAGE_ARTEN.items():
            print(f"  {k:<11} {v}")
        return 0
    if art not in VORLAGE_ARTEN:
        return fail(f"unbekannte Art {art}; erlaubt: {', '.join(VORLAGE_ARTEN)}", 2)
    print((VORLAGEN / f"{art}.txt").read_text(encoding="utf-8"), end="")
    return 0


def status(root: Path) -> int:
    found = manifests(root)
    print(f"Projekt {root} ({len(found)} Plugins)")
    for name, (path, data) in found.items():
        art = "Komponenten" if "source" in data else "Etappen-Modell"
        extra = f", Abgleich mit {data['equivalent_to']}" if data.get("equivalent_to") else ""
        print(f"  {name} {data.get('version')} · {art} · {path.relative_to(root)}{extra}")
    return 0


# ---------------------------------------------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="druckerei", description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("neu"); p.add_argument("ordner"); p.add_argument("--name"); p.add_argument("--aus")
    p.add_argument("--beschreibung", default="TODO: ein Satz, was das Plugin kann"); p.add_argument("--marketplace"); p.add_argument("--owner", default="")
    p = sub.add_parser("vorlage"); p.add_argument("art", nargs="?")
    for name in ("pruefen", "try-deploy"):
        p = sub.add_parser(name); p.add_argument("--schnell", action="store_true"); p.add_argument("--projekt")
    p = sub.add_parser("deploy"); p.add_argument("--stufe", required=True, choices=["patch", "minor", "major"]); p.add_argument("--plugin"); p.add_argument("--projekt")
    p = sub.add_parser("uebernehmen"); p.add_argument("plugin_ordner"); p.add_argument("--force", action="store_true"); p.add_argument("--projekt")
    p = sub.add_parser("status"); p.add_argument("--projekt")
    p = sub.add_parser("abnehmen"); p.add_argument("--projekt")
    args = parser.parse_args(argv)

    if args.cmd == "vorlage":
        return vorlage(args.art)
    if (msg := check_deps()):
        return fail(msg)
    if args.cmd == "neu":
        if args.aus:
            return neu_aus(Path(args.ordner), Path(args.aus).resolve(), args.marketplace, args.owner)
        if not args.name:
            return fail("neu braucht --name <plugin> oder --aus <plugin-ordner>", 2)
        return neu(Path(args.ordner), args.name, args.beschreibung, args.marketplace, args.owner)
    root = project_of(args)
    if args.cmd in ("pruefen", "try-deploy"):
        return 0 if try_deploy(root, args.schnell) else 1
    if args.cmd == "deploy":
        return deploy(root, args.stufe, args.plugin)
    if args.cmd == "status":
        return status(root)
    if args.cmd == "abnehmen":
        with tempfile.TemporaryDirectory(prefix="druckerei-") as tmp:
            code, out = run_build(root, Path(tmp) / "dist", accept=True)
        errors, _, _ = split_output(out)
        for e in errors:
            print(f"  FEHLER {e}")
        print("Stand abgenommen; das Änderungsprotokoll nennt jetzt den aktuellen Fingerabdruck jeder geänderten Datei."
              if code == 0 else "Abnahme nicht möglich: erst die Fehler beheben.")
        return code
    if args.cmd == "uebernehmen":
        import uebernehmen
        return uebernehmen.run(root, Path(args.plugin_ordner).resolve(), args.force)
    return 2


if __name__ == "__main__":
    sys.exit(main())
