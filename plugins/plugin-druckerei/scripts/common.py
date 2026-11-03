"""Gemeinsame Bausteine der Plugin-Druckerei: Projekt finden, Fehlerbericht mit Ort, YAML mit Zeilennummern, Schema-Prüfung.

Die Projektwurzel ist der Ordner mit druckerei.yaml (Umgebungsvariable DRUCKEREI_PROJEKT oder Suche ab dem aktuellen Ordner).
DRUCKEREI_AUSGABE lenkt die Ausgabe um (Try-Deploy baut in einen Temp-Ordner)."""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import jsonschema
import yaml

PROJECT_FILE = "druckerei.yaml"
PLUGIN_SCRIPTS = Path(__file__).resolve().parent


def find_project(start: Path) -> Path | None:
    """Ordner mit druckerei.yaml: der Ordner selbst oder der nächste darüber."""
    for folder in [start, *start.parents]:
        if (folder / PROJECT_FILE).is_file():
            return folder
    return None


def _project_root() -> Path:
    env = os.environ.get("DRUCKEREI_PROJEKT")
    if env:
        return Path(env).resolve()
    found = find_project(Path.cwd().resolve())
    if not found:
        sys.exit(f"druckerei: kein Projekt gefunden ({PROJECT_FILE} fehlt in {Path.cwd()} und darüber). "
                 "Neues Projekt: druckerei neu <ordner> --name <plugin>")
    return found


def _project_settings(root: Path) -> dict:
    try:
        data = yaml.safe_load((root / PROJECT_FILE).read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError) as exc:
        sys.exit(f"druckerei: {root / PROJECT_FILE} nicht lesbar: {exc}")
    return data if isinstance(data, dict) else {}


ROOT = _project_root()
SETTINGS = _project_settings(ROOT)
SRC = ROOT / "src"
DIST = Path(os.environ["DRUCKEREI_AUSGABE"]).resolve() if os.environ.get("DRUCKEREI_AUSGABE") else ROOT / SETTINGS.get("ausgabe", "dist")
SCHEMAS = PLUGIN_SCRIPTS / "schemas"
DEFAULT_TEMPLATES = PLUGIN_SCRIPTS / "vorlagen" / "templates"
MARKETPLACE = SETTINGS.get("marketplace", ROOT.name)
OWNER = SETTINGS.get("owner", "")
EXECUTABLE: set = set()  # Ausgabepfade, die ausführbar bleiben müssen (bin/, Skripte mit Shebang)
HEADER = "GENERIERT - nicht editieren."
ICON = {"red": "🔴", "yellow": "🟡", "green": "🟢"}
SEVERITY_ORDER = {"red": 0, "yellow": 1, "green": 2}
TERM_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
RULE_REF_RE = re.compile(r"\[(R-\d{3})\]")
SKILL_MAX_LINES = 500
NAME_MAX = 64
DESCRIPTION_MAX = 1024


# ---------------------------------------------------------------------------------------------------------------------
# Fehler mit Ort


@dataclass
class Problem:
    file: str
    line: int
    message: str

    def __str__(self) -> str:
        return f"{self.file}:{self.line}: {self.message}"


@dataclass
class Report:
    errors: list[Problem] = field(default_factory=list)
    warnings: list[Problem] = field(default_factory=list)

    def error(self, file: str, line: int, message: str) -> None:
        self.errors.append(Problem(file, line, message))

    def warn(self, file: str, line: int, message: str) -> None:
        self.warnings.append(Problem(file, line, message))

    def stop_if_errors(self, stage: str) -> None:
        if not self.errors:
            return
        print(f"build: {len(self.errors)} Fehler in Stufe „{stage}“, Abbruch.", file=sys.stderr)
        for p in sorted(self.errors, key=lambda p: (p.file, p.line, p.message)):
            print(f"FEHLER {p}", file=sys.stderr)
        sys.exit(1)


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return Path(os.path.relpath(path.resolve(), ROOT)).as_posix()


# ---------------------------------------------------------------------------------------------------------------------
# YAML mit Zeilennummern


class LDict(dict):
    """dict, das die Zeile jedes Schlüssels kennt (1-basiert)."""

    line = 0
    lines: dict


class LList(list):
    line = 0
    lines: list


class LineLoader(yaml.SafeLoader):
    pass


def _construct_mapping(loader: LineLoader, node: yaml.MappingNode) -> LDict:
    loader.flatten_mapping(node)
    result = LDict()
    result.line = node.start_mark.line + 1
    result.lines = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=True)
        result[key] = loader.construct_object(value_node, deep=True)
        # Blockskalare (| und >) beginnen in der Zeile nach dem Schlüssel.
        block = isinstance(value_node, yaml.ScalarNode) and value_node.style in ("|", ">")
        result.lines[key] = value_node.start_mark.line + 1 + (1 if block else 0)
    return result


def _construct_sequence(loader: LineLoader, node: yaml.SequenceNode) -> LList:
    result = LList(loader.construct_object(child, deep=True) for child in node.value)
    result.line = node.start_mark.line + 1
    result.lines = [child.start_mark.line + 1 for child in node.value]
    return result


LineLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)
LineLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_SEQUENCE_TAG, _construct_sequence)


def line_of(container, key) -> int:
    """Zeile eines Schlüssels oder Index in einem geladenen Container, sonst die Zeile des Containers."""
    if isinstance(container, LDict) and key in container.lines:
        return container.lines[key]
    if isinstance(container, LList) and isinstance(key, int) and key < len(container.lines):
        return container.lines[key]
    return getattr(container, "line", 1) or 1


def locate(doc, path) -> int:
    """Zeile zu einem jsonschema-Pfad (Folge von Schlüsseln und Indizes)."""
    node, line = doc, getattr(doc, "line", 1) or 1
    for part in path:
        line = line_of(node, part)
        try:
            node = node[part]
        except (KeyError, IndexError, TypeError):
            break
    return line


@dataclass
class Source:
    path: Path
    data: object

    @property
    def name(self) -> str:
        return rel(self.path)


def load_yaml(path: Path, report: Report) -> Source | None:
    try:
        with path.open(encoding="utf-8") as f:
            return Source(path, yaml.load(f, Loader=LineLoader))  # noqa: S506 - eigener SafeLoader
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        report.error(rel(path), (mark.line + 1) if mark else 1, f"YAML ungültig: {getattr(exc, 'problem', exc)}")
        return None


def validate_schema(src: Source, schema_name: str, report: Report) -> bool:
    schema = json.loads((SCHEMAS / f"{schema_name}.schema.json").read_text(encoding="utf-8"))
    validator = jsonschema.Draft202012Validator(schema)
    ok = True
    for err in sorted(validator.iter_errors(src.data), key=lambda e: list(map(str, e.absolute_path))):
        # Bei oneOf die konkreteste Unterursache melden.
        best = jsonschema.exceptions.best_match([err]) if err.context else err
        path = list(best.absolute_path)
        where = "/".join(map(str, path)) or "(Wurzel)"
        report.error(src.name, locate(src.data, path), f"Schema {schema_name}: {where}: {best.message}")
        ok = False
    return ok


def plain(text: str) -> str:
    """[[Begriff|Form]] -> Form, [[Begriff]] -> Begriff; Zeilenumbrüche aus Folded-Blöcken glätten."""
    return TERM_RE.sub(lambda mt: (mt.group(2) or mt.group(1)).strip(), text).strip()


def check_terms(text: str, file: str, line: int, m, report: Report) -> None:
    for i, row in enumerate(text.split("\n")):
        for match in TERM_RE.finditer(row):
            term = match.group(1).strip()
            if term not in m.terms:
                report.error(file, line + i, f"Fachbegriff „{term}“ steht nicht im Glossar (src/glossary.yaml)")
        stripped = TERM_RE.sub(lambda mt: mt.group(1), row)
        for word, owner in m.avoid.items():
            if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", stripped):
                report.error(file, line + i, f"„{word}“ ist laut Glossar zu vermeiden; Begriff: „{owner}“")


# Lint-Bausteine, von Etappen- und Komponenten-Plugins geteilt

CAPS_RE = re.compile(r"\b(ALWAYS|NEVER|MUST|IMMER|NIEMALS|NIE)\b")
REASON_RE = re.compile(r"(Warum:|weil|because|damit|denn|sonst|Grund)", re.IGNORECASE)
PRONOUN_RE = re.compile(r"\b(I|me|my|we|our|you|your)\b", re.IGNORECASE)
LINK_RE = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")


def split_frontmatter(text: str):
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---\n", 4)
    if end < 0:
        return None, text
    raw = text[4:end]
    try:
        return yaml.safe_load(raw), text[end + 5:]
    except yaml.YAMLError:
        # Kein gültiges YAML: zeilenweise lesen wie forge/tests/lib/markdown.js; der Lint meldet es gesondert.
        fields = {}
        for line in raw.split("\n"):
            if ":" in line and not line.startswith(" "):
                key, _, value = line.partition(":")
                fields[key.strip()] = value.strip()
        fields["__invalid_yaml__"] = True
        return fields, text[end + 5:]


def lint_identity(path: str, fm: dict, report: Report) -> None:
    name, desc = str(fm.get("name", "")), " ".join(str(fm.get("description", "")).split())
    if not name or len(name) > NAME_MAX:
        report.error(path, 2, f"name „{name}“ fehlt oder ist länger als {NAME_MAX} Zeichen")
    if not re.fullmatch(r"[a-z0-9-]+", name):
        report.error(path, 2, f"name „{name}“: nur Kleinbuchstaben, Ziffern und Bindestriche")
    if re.search(r"claude|anthropic", name, re.IGNORECASE):
        report.error(path, 2, f"name „{name}“ enthält „claude“ oder „anthropic“")
    if not desc or len(desc) > DESCRIPTION_MAX:
        report.error(path, 3, f"description fehlt oder ist länger als {DESCRIPTION_MAX} Zeichen ({len(desc)})")
    if "Use when" not in desc:
        report.error(path, 3, "description enthält kein „Use when …“")
    if PRONOUN_RE.search(desc):
        report.error(path, 3, f"description nicht in dritter Person: „{PRONOUN_RE.search(desc).group(0)}“")
