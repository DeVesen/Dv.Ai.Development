#!/usr/bin/env python3
"""Einmalige Migration: shared/orchestrator-rules.md und shared/dialog-rules.md -> src/forge/rules/*.yaml.

Jeder Listenpunkt wird eine Regel mit ID, Text, Begründung (sonst TODO) und Durchsetzung; Tabellen „Rote Flaggen“
bleiben Tabellen. Das Template src/templates/rules-doc.md.j2 erzeugt daraus wieder den wortgleichen Text.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
FORGE = ROOT.parent / "plugins" / "forge"
OUT = ROOT / "src" / "forge" / "rules"

DOCS = [("shared/orchestrator-rules.md", "orchestrator", 301), ("shared/dialog-rules.md", "dialog", 401)]

# Durchsetzung, wo die Quelle sie selbst nennt (Text der Regel oder Skript, das den Wert liest).
ENFORCED = {
    "Maximum Followup-Runden: 8": ("script", "scripts/lib/orchestrator-rules.js"),
    "Eine Followup-Runde ist eine Iteration": ("script", "scripts/orchestrator-state.js"),
    "Die Runden enden früher bei Stillstand": ("script", "scripts/orchestrator-state.js"),
    "`spec-review-orchestrator` committet nur die Spec": ("script", "scripts/spec-commit.js"),
    "Den Abschlussbericht gibst du genau einmal": ("hook", "scripts/guard-orchestrator.js"),
}

# Begründungen, die in der Quelle wörtlich stehen.
WHY = {
    "Eine Anweisung der Projekt-`CLAUDE.md`": "Der Lauf arbeitet im aktuellen Checkout; die Session-Kette legt Worktree und Branch fest (Abschnitt Git-Verbote).",
    "Den Abschlussbericht gibst du genau einmal": "Ein Hook verlangt die Überschriften wörtlich.",
    "**Empfehlung übernehmen:**": "Eine Frage stellst du nur mit konkretem Nutzen (Ton, Regel 3 Mehrwert).",
    "**Nur mit Beleg:**": "Eine Vermutung bleibt eine Frage, auch wenn sie naheliegt.",
}


def lookup(table: dict, text: str):
    return next((v for k, v in table.items() if text.startswith(k)), None)


def parse(text: str, prefix: str, first_id: int, src: str) -> dict:
    lines = text.rstrip("\n").split("\n")
    assert lines[0].startswith("# "), src
    doc: dict = {"doc": src, "title": lines[0][2:], "intro": [], "sections": []}
    next_id = first_id
    section = None
    i = 1
    while i < len(lines):
        line = lines[i]
        if line.startswith("## "):
            section = {"heading": line[3:], "lead": [], "style": None, "rules": [], "table": None}
            doc["sections"].append(section)
        elif section is None:
            doc["intro"].append(line)
        elif line.startswith("| "):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            cells = [[c.strip() for c in r.strip().strip("|").split(" | ")] for r in rows]
            section["style"] = "table"
            section["table"] = {"columns": cells[0], "separator": rows[1], "rows": cells[2:]}
            continue
        elif re.match(r"^(- |\d+\. )", line):
            numbered = bool(re.match(r"^\d+\. ", line))
            body = re.sub(r"^(- |\d+\. )", "", line)
            cont = []
            while i + 1 < len(lines) and lines[i + 1].startswith("   "):
                i += 1
                cont.append(lines[i][3:])
            full = "\n".join([body] + cont)
            enforce, by = lookup(ENFORCED, full) or ("text", None)
            why = lookup(WHY, full) or f"TODO(forge/{src}): Die Quelle nennt keinen Grund."
            rule = {"id": f"R-{next_id}", "text": full, "why": why, "enforce": enforce}
            if by:
                rule["enforced_by"] = by
            rule["source"] = f"forge/{src} ({section['heading']})"
            next_id += 1
            section["style"] = "numbered" if numbered else "bullets"
            section["rules"].append(rule)
        elif line.strip() and not section["rules"]:
            section["lead"].append(line)
        elif line.strip():
            raise SystemExit(f"{src}:{i + 1}: unerwartete Zeile nach der Liste: {line!r}")
        i += 1
    # Leerzeilen am Rand der Einleitung sind Struktur, kein Inhalt.
    while doc["intro"] and not doc["intro"][0].strip():
        doc["intro"].pop(0)
    while doc["intro"] and not doc["intro"][-1].strip():
        doc["intro"].pop()
    doc["intro"] = "\n".join(doc["intro"])
    for s in doc["sections"]:
        s["lead"] = "\n".join(s["lead"])
        if not s["lead"]:
            del s["lead"]
        if s["table"] is None:
            del s["table"]
        if not s["rules"]:
            del s["rules"]
    return doc


def main() -> int:
    if any(OUT.glob('*.yaml')) and '--force' not in sys.argv:
        print(f"{OUT} enthält schon Regeldaten mit bestätigten Begründungen; Abbruch (mit --force überschreiben).", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for rel, name, first in DOCS:
        doc = parse((FORGE / rel).read_text(encoding="utf-8"), name, first, rel)
        target = OUT / f"{name}.yaml"
        target.write_text("# Aus plugins/forge/" + rel + " migriert; Quelle der Wahrheit für diese Datei.\n"
                          + yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=10_000), encoding="utf-8")
        (ROOT / "src" / "forge" / rel).unlink(missing_ok=True)
        print(f"{rel} -> {target.relative_to(ROOT)} ({sum(len(s.get('rules', [])) for s in doc['sections'])} Regeln)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
