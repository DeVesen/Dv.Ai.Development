"""druckerei uebernehmen: ein bestehendes Plugin wortgleich in die Quellen eines Projekts überführen.

Ergebnis in <projekt>/src/<ordner>/ und <projekt>/src/plugins/<ordner>.yaml:
- jede Markdown-Datei wird eine Quelle mit Deckblatt (kind, role, model_invocation, frontmatter); Frontmatter, die sich nicht
  verlustfrei als Felder darstellen lässt, bleibt als frontmatter_roh wortgleich erhalten,
- Absätze, die wortgleich in mehreren Dateien stehen, wandern in partials/ (Namen nach der Überschrift, sonst block-NN),
- hooks/hooks.json wird zu Daten im Bestellschein (Kurzform node scripts/<x>.js, sonst Rohform),
- alles andere (Code, Tests, Golden-Sets, .gitkeep) liegt unverändert unter assets/.
Der Bestellschein bekommt equivalent_to (Bestand), changelog und lint: bestand. Danach druckt die Druckerei einmal zur Probe:
jede erzeugte Datei muss dem Bestand entsprechen.
"""

from __future__ import annotations

import collections
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
MIN_BLOCK = 60
JINJA_MARKS = ("<%", "%>", "<<=", "<#", "#>")
SHORT_HOOK = re.compile(r'^node "\$\{CLAUDE_PLUGIN_ROOT\}/scripts/([a-z][a-z0-9-]*\.js)"((?: [a-z-]+)*)$')
FOLD_MARKS = (">", ">-", "|", "|-")


JUNK_DIRS = {"__pycache__", "node_modules", ".pytest_cache"}


def junk(rel: Path) -> bool:
    """Erzeugte Dateien gehören nicht in die Quellen: Python-Cache, node_modules, .DS_Store."""
    return bool(JUNK_DIRS & set(rel.parts)) or rel.name in (".DS_Store",) or rel.suffix == ".pyc"


def kind_of(rel: str) -> str | None:
    """Art der Quelle oder None für Assets (Markdown unter tests/ bleibt Asset)."""
    parts = rel.split("/")
    if parts[0] == "tests":
        return None
    if rel == "README.md":
        return "readme"
    if len(parts) == 3 and parts[0] == "skills" and parts[2] == "SKILL.md":
        return "skill"
    if len(parts) == 4 and parts[0] == "skills" and parts[2] == "references":
        return "reference"
    if len(parts) == 2 and parts[0] == "agents":
        return "agent"
    if parts[0] == "shared":
        return "shared"
    if len(parts) == 2 and parts[0] == "commands":
        return "command"
    return "doc"


def parse_frontmatter(text: str):
    """(roh, felder, body): felder ist None, wenn sich die Frontmatter nicht als einfache Felder lesen lässt."""
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None, None, text
    raw, body = m.group(1), text[m.end():]
    fields: dict = {}
    key = None
    for line in raw.split("\n"):
        if key and isinstance(fields.get(key), dict) and (line.startswith("  ") or line == ""):
            fields[key]["folded"].append(line[2:])
            continue
        if not line or line.startswith((" ", "\t", "#")) or ":" not in line:
            return raw, None, body
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if key in fields:
            return raw, None, body
        fields[key] = {"folded": [], "stil": value} if value in FOLD_MARKS else value
    return raw, fields, body


def render_fields(fields: dict) -> str:
    lines = []
    for key, value in fields.items():
        if isinstance(value, dict):
            lines.append(f"{key}: {value['stil']}")
            lines += [f"  {row}" if row else "" for row in value["folded"]]
        else:
            lines.append(f"{key}: {value}")
    return "\n".join(lines)


def manifest_for(kind: str, raw, fields):
    """Deckblatt einer Quelle; Rohform, wenn die Felder die Frontmatter nicht wortgleich wiedergeben."""
    data: dict = {"kind": kind}
    if raw is None:
        return data
    if kind == "skill":
        data["role"] = "werkzeug"
        data["model_invocation"] = "allowed"
    if fields is None:
        data["frontmatter_roh"] = raw
        return data
    clean = {k: (dict(v, folded=list(v["folded"])) if isinstance(v, dict) else v) for k, v in fields.items()}
    if kind == "skill" and clean.get("disable-model-invocation") == "true":
        rest = {k: v for k, v in clean.items() if k != "disable-model-invocation"}
        if render_fields({**rest, "disable-model-invocation": "true"}) == raw:
            data["model_invocation"] = "disabled"
            clean = rest
    if render_fields(clean) != raw or (kind == "skill" and "disable-model-invocation" in clean) \
            or (kind in ("skill", "agent") and not all(isinstance(clean.get(k), str) for k in ("name", "description"))):
        data["frontmatter_roh"] = raw
        return data
    for v in clean.values():
        if isinstance(v, dict) and v["stil"] == ">":
            v.pop("stil")  # Standard des Renderers
    data["frontmatter"] = clean
    return data


def slug(text: str) -> str:
    text = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:40] or "block"


def convert_hooks(path: Path):
    """Hooks als Daten für den Bestellschein, oder None, wenn hooks.json Felder hat, die sich nicht abbilden lassen."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if set(data) - {"hooks", "description"}:
        return None
    out: dict = {}
    for event, entries in data.get("hooks", {}).items():
        items = []
        for entry in entries:
            if set(entry) - {"matcher", "hooks"}:
                return None
            commands = []
            for hook in entry.get("hooks", []):
                if hook.get("type") != "command" or "command" not in hook:
                    return None
                m = SHORT_HOOK.match(hook["command"])
                if m and set(hook) == {"type", "command"}:
                    commands.append(m.group(1) + m.group(2))
                else:
                    commands.append({k: v for k, v in hook.items() if k != "type"})
            item = {"matcher": entry["matcher"]} if "matcher" in entry else {}
            item["commands"] = commands
            items.append(item)
        out[event] = items
    return out


def run(root: Path, plugin: Path, force: bool) -> int:
    meta_file = plugin / ".claude-plugin" / "plugin.json"
    if not meta_file.is_file():
        print(f"druckerei: {plugin} ist kein Plugin (.claude-plugin/plugin.json fehlt)", file=sys.stderr)
        return 1
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    folder = plugin.name
    target = root / "src" / folder
    manifest_path = root / "src" / "plugins" / f"{folder}.yaml"
    if (target.exists() or manifest_path.exists()) and not force:
        print(f"druckerei: {target.relative_to(root)} oder {manifest_path.relative_to(root)} existiert; mit --force überschreiben", file=sys.stderr)
        return 1
    shutil.rmtree(target, ignore_errors=True)

    docs: dict = {}
    assets: list = []
    hooks = None
    for f in sorted(p for p in plugin.rglob("*") if p.is_file() and not junk(p.relative_to(plugin))):
        rel = f.relative_to(plugin).as_posix()
        if rel == ".claude-plugin/plugin.json":
            continue
        if rel == "hooks/hooks.json" and (hooks := convert_hooks(f)) is not None:
            continue
        kind = kind_of(rel) if f.suffix == ".md" else None
        if kind is None:
            assets.append(rel)
            continue
        text = f.read_text(encoding="utf-8")
        raw, fields, body = parse_frontmatter(text)
        docs[rel] = {"kind": kind, "raw": raw, "fields": fields, "body": body, "jinja": any(m in text for m in JINJA_MARKS)}

    # Wortgleiche Absätze über Dateien hinweg
    seen = collections.defaultdict(set)
    for rel, d in docs.items():
        if d["jinja"]:
            continue
        for block in re.split(r"\n\s*\n", d["body"]):
            block = block.strip("\n")
            if len(block) >= MIN_BLOCK:
                seen[block].add(rel)
    shared = {b: sorted(r) for b, r in seen.items() if len(r) > 1}
    names: dict = {}
    for block in sorted(shared, key=lambda b: (-len(shared[b]), b)):
        heading = re.match(r"^#{1,6} (.+)$", block.split("\n")[0])
        base = slug(heading.group(1)) if heading else "block"
        name, n = base, 2
        while name in names.values():
            name, n = f"{base}-{n}", n + 1
        names[block] = name

    (target / "partials").mkdir(parents=True, exist_ok=True)
    for block, name in names.items():
        # Der Kommentar steht am Ende: ein Kommentar davor mit -#> schnitte die Einrückung der ersten Zeile ab (Codeblöcke).
        (target / "partials" / f"{name}.md").write_text(f"{block}\n<# Wortgleich in: {', '.join(shared[block])} #>", encoding="utf-8")
    for rel, d in docs.items():
        body = d["body"]
        if d["jinja"]:
            body = "<% raw %>" + body + "<% endraw %>"
        else:
            parts = re.split(r"(\n\s*\n)", body)
            out = []
            for part in parts:
                core = part.strip("\n")
                if core in names and part.strip():
                    lead = part[: len(part) - len(part.lstrip("\n"))]
                    trail = part[len(part.rstrip("\n")):]
                    out.append(f"{lead}<<= partial('{names[core]}') >>{trail}")
                else:
                    out.append(part)
            body = "".join(out)
        manifest = manifest_for(d["kind"], d["raw"], d["fields"])
        manifest = {"kind": manifest.pop("kind"), "source": f"übernommen aus {plugin.name}/{rel}", **manifest}
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        head = yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True, width=10_000)
        dest.write_text(f"---\n{head}---\n{body}", encoding="utf-8")
    if not names:
        (target / "partials").rmdir()
    for rel in assets:
        dest = target / "assets" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(plugin / rel, dest)

    data: dict = {"name": meta["name"], "dir": folder, "version": meta.get("version", "0.1.0"), "description": meta.get("description", "")}
    extra = {k: v for k, v in meta.items() if k not in ("name", "version", "description", "author")}
    author = meta.get("author")
    if isinstance(author, dict) and set(author) == {"name"}:
        data["author"] = author["name"]
    elif author is not None:
        extra = {"author": author, **extra}
    data.update({"source": f"src/{folder}", "equivalent_to": os.path.relpath(plugin, root), "changelog": f"src/{folder}/CHANGES.yaml",
                 "lint": "bestand"})
    if extra:
        data["plugin_json"] = extra
    if assets:
        data["assets"] = [{"from": f"src/{folder}/assets", "to": "."}]
    if hooks:
        data["hooks"] = hooks
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(f"# Bestellschein von {meta['name']}, übernommen aus {os.path.relpath(plugin, root)}.\n"
                             "# lint: bestand meldet Stil-Altlasten als Warnung; nach dem Aufräumen auf streng stellen.\n"
                             + yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=10_000), encoding="utf-8")
    (target / "CHANGES.yaml").write_text(
        f"# Änderungsprotokoll: Abweichungen des gedruckten {meta['name']} vom Bestand {os.path.relpath(plugin, root)}.\n"
        f"basis: {meta['name']} {meta.get('version', '')} (übernommen)\nchanges: []\n", encoding="utf-8")

    raw_count = sum(1 for d in docs.values() if d["raw"] is not None and manifest_for(d["kind"], d["raw"], d["fields"]).get("frontmatter_roh"))
    print(f"Übernommen: {meta['name']} → {target.relative_to(root)}")
    print(f"  {len(docs)} Quellen, {len(names)} Partials aus {sum(len(v) for v in shared.values())} Vorkommen, {len(assets)} Assets, "
          f"Hooks {'als Daten' if hooks else 'unverändert als Asset' if (plugin / 'hooks/hooks.json').exists() else 'keine'}, "
          f"{raw_count} Frontmatter in Rohform, {sum(1 for d in docs.values() if d['jinja'])} Dateien ohne Bausteine (Jinja-Zeichen im Text)")
    env = {**os.environ, "DRUCKEREI_PROJEKT": str(root), "PYTHONDONTWRITEBYTECODE": "1"}
    with tempfile.TemporaryDirectory(prefix="druckerei-") as tmp:
        env["DRUCKEREI_AUSGABE"] = str(Path(tmp) / "dist")
        result = subprocess.run([sys.executable, str(HERE / "build.py")], cwd=root, env=env, capture_output=True, text=True)
    out = result.stdout + result.stderr
    errors = [l for l in out.splitlines() if l.startswith("FEHLER ")]
    warnings = [l for l in out.splitlines() if l.startswith("WARNUNG ") and f"/{folder}/" in l or l.startswith(f"WARNUNG {folder}/")]
    if result.returncode == 0:
        print(f"Probedruck: ok, jede Datei entspricht dem Bestand. {len(warnings)} Warnungen (Altlasten, lint: bestand).")
        return 0
    print("Probedruck: nicht wortgleich oder ungültig. Diese Stellen brauchen Handarbeit:")
    print("\n".join(f"  {l}" for l in (errors or out.strip().splitlines()[-15:])))
    return 1
