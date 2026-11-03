#!/usr/bin/env python3
"""Einmalige Migration: plugins/forge (Prosa) -> plugin-compiler/src/forge.

Nach dem Lauf ist src/forge die Quelle der Wahrheit; dieses Skript bleibt nur zur Nachvollziehbarkeit im Repo und
überschreibt src/forge bei erneutem Lauf vollständig (nur mit --force).

Was es tut:
1. Jede Markdown-Datei aus skills/, agents/, shared/ und README.md wird zu einer Quelldatei mit Compiler-Manifest
   (Frontmatter mit kind, role, frontmatter-Feldern der Ausgabe) und wortgleichem Body.
2. Absätze, die wortgleich in mehreren Dateien stehen, wandern nach src/forge/partials/<name>.md; im Body steht
   stattdessen <<= partial('<name>') >>.
3. Beschreibungen interner Skills verlieren den festen Zusatz; der Compiler setzt ihn aus role: intern wieder an.
"""

from __future__ import annotations

import collections
import re
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]  # plugin-compiler/
FORGE = ROOT.parent / "plugins" / "forge"
OUT = ROOT / "src" / "forge"
INTERN_SUFFIX = " Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator."
STARTBEFEHL = {"session-orchestrator"}
MIN_BLOCK = 60

# Sprechende Namen für wortgleiche Blöcke, erkannt am Anfang des Blocks.
PARTIAL_NAMES = [
    ("## Kategorie\nJedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.\n- `widerspruch` — zwei Aussagen in Plan", "kategorie-plan-review"),
    ("## Kategorie\nJedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig. Welche Kategorie", "kategorie-spec-review"),
    ("## Ausgabe\nDeine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`, auch bei null Findings.", "ausgabe-json-findings"),
    ("## Ausgabe\nDeine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`", "ausgabe-json-implementation"),
    ("## W-Einträge\nEinträge der Form `- **W · <Kurztitel>** · <Beleg-Tag>", "w-eintraege-spec"),
    ("## W-Einträge\nEinträge der Form `- **W · <Kurztitel>** · …`", "w-eintraege-plan"),
    ("## Ziel\nDie Spec soll stimmig", "ziel-spec-review"),
    ("## Zurückgestellte Punkte", "zurueckgestellte-punkte"),
    ("## Eingabe\n- `Plan:`", "eingabe-plan-spec-repo"),
    ("Gibt es `Anker:`", "anker-lesen"),
    ("## Eingabe\n- `Paket:`", "eingabe-paket"),
    ("## Kalibrierung", "kalibrierung-plan"),
    ("## Ausgabe\nDeine letzte Aktion: Schreib mit `Write` pro bearbeiteter Stelle", "ausgabe-rework"),
    ("### 🔴 <Stelle>", "fragen-format"),
    ("## Ausgabe\nDeine letzte Aktion: Schreib mit `Write` nur diesen Abschnitt", "ausgabe-scout"),
    ("Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>`", "argumente-mit-session"),
    ("## Beratend", "beratend"),
    ("## Ablage", "ablage-review"),
    ("## Eingabe\n- `Spec:` absoluter Pfad zur `spec.md`\n- `Ergebnis:`", "eingabe-spec"),
    ("Du prüfst eine Spec. Du liest nur die Datei", "spec-nur-datei"),
    ("## Skript-Prüfungen", "skript-pruefungen"),
    ("Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`", "argumente"),
]


def split_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None, text
    fields: dict = {}
    key = None
    for line in m.group(1).split("\n"):
        if line.startswith("  ") and key:
            # Fortsetzungszeile eines gefalteten Werts (key: >): Zeilen wortgleich behalten.
            fields[key]["folded"].append(line[2:])
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        fields[key] = {"folded": []} if value == ">" else value
    return fields, text[m.end():]


def kind_of(rel: str) -> str:
    if rel == "README.md":
        return "readme"
    if rel.startswith("agents/"):
        return "agent"
    if rel.startswith("shared/"):
        return "shared"
    if "/references/" in rel:
        return "reference"
    return "skill"


def agent_type(name: str) -> str:
    for suffix, t in (("-scout", "scout"), ("-verifier", "verifier"), ("-rework", "rework"), ("-re-reviewer", "re-reviewer"),
                      ("-final-reviewer", "final-reviewer"), ("-task-reviewer", "task-reviewer"), ("-implementer", "implementer")):
        if name.endswith(suffix):
            return t
    return "reviewer"


def agent_stage(name: str) -> str:
    for stage in ("spec-review", "plan-review", "implementation-review", "spec", "plan", "implementation"):
        if name.startswith(stage + "-") or name == stage:
            return {"spec": "spec-review", "plan": "plan-review", "implementation": "implementation"}.get(stage, stage)
    return "?"


def partial_name(block: str, used: set) -> str:
    for prefix, name in PARTIAL_NAMES:
        if block.startswith(prefix) and name not in used:
            return name
    return f"block-{len(used) + 1:02d}"


def main() -> int:
    if OUT.exists():
        if "--force" not in sys.argv:
            print(f"{OUT} existiert; Abbruch (mit --force überschreiben).", file=sys.stderr)
            return 1
        shutil.rmtree(OUT)
    files = sorted([p for p in FORGE.rglob("*.md") if p.relative_to(FORGE).parts[0] in ("skills", "agents", "shared")])
    files.append(FORGE / "README.md")
    docs = {}
    for p in files:
        rel = p.relative_to(FORGE).as_posix()
        text = p.read_text(encoding="utf-8")
        fields, body = split_frontmatter(text)
        docs[rel] = {"fields": fields, "body": body, "raw": text}

    # Wortgleiche Absätze über Dateien hinweg finden.
    seen = collections.defaultdict(list)
    for rel, d in docs.items():
        for block in re.split(r"\n\s*\n", d["body"]):
            block = block.strip("\n")
            if len(block) >= MIN_BLOCK:
                seen[block].append(rel)
    shared_blocks = {b: sorted(set(r)) for b, r in seen.items() if len(set(r)) > 1}
    names: dict = {}
    for block in sorted(shared_blocks, key=lambda b: (-len(shared_blocks[b]), b)):
        names[block] = partial_name(block, set(names.values()))

    (OUT / "partials").mkdir(parents=True)
    for block, name in sorted(names.items(), key=lambda kv: kv[1]):
        users = ", ".join(shared_blocks[block])
        (OUT / "partials" / f"{name}.md").write_text(
            f"<# Wortgleich in: {users} -#>\n{block}\n", encoding="utf-8")

    for rel, d in docs.items():
        parts = re.split(r"(\n\s*\n)", d["body"])
        rebuilt = []
        for part in parts:
            core = part.strip("\n")
            if core in names and part.strip():
                lead = part[: len(part) - len(part.lstrip("\n"))]
                trail = part[len(part.rstrip("\n")):]
                rebuilt.append(f"{lead}<<= partial('{names[core]}') >>{trail}")
            else:
                rebuilt.append(part)
        body = "".join(rebuilt)
        kind = kind_of(rel)
        manifest: dict = {"kind": kind, "source": f"plugins/forge/{rel}"}
        if kind == "skill":
            name = d["fields"]["name"]
            desc = d["fields"]["description"]
            role = "werkzeug"
            if isinstance(desc, str) and desc.endswith(INTERN_SUFFIX):
                role, desc = "intern", desc[: -len(INTERN_SUFFIX)]
            elif name in STARTBEFEHL:
                role = "startbefehl"
            manifest["role"] = role
            manifest["model_invocation"] = "disabled" if d["fields"].get("disable-model-invocation") == "true" else "allowed"
            fm = dict(d["fields"])
            fm["description"] = desc
            fm.pop("disable-model-invocation", None)
            manifest["frontmatter"] = fm
        elif kind == "agent":
            manifest["stage"] = agent_stage(d["fields"]["name"])
            manifest["type"] = agent_type(d["fields"]["name"])
            manifest["frontmatter"] = d["fields"]
        elif d["fields"]:
            manifest["frontmatter"] = d["fields"]
        target = OUT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        head = yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True, width=10_000)
        target.write_text(f"---\n{head}---\n{body}", encoding="utf-8")
    print(f"{len(docs)} Dateien nach {OUT.relative_to(ROOT)}; {len(names)} Partials aus "
          f"{sum(len(v) for v in shared_blocks.values())} Vorkommen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
