"""Komponenten-Plugins: Skills, Agents, geteilte Dateien, Regeln, Etappen und Hooks aus src/<plugin>/.

Anders als die Etappen-Plugins des Prototyps bleibt die Prosa hier wortgleich zum Bestand; das Schema liegt darüber:
- jede Datei trägt ein Compiler-Manifest (kind, role, stage, type, frontmatter der Ausgabe),
- wortgleich doppelte Absätze stehen einmal in partials/ und werden mit <<= partial('name') >> eingesetzt,
- Regeldateien entstehen aus rules/*.yaml (Regel mit ID, Begründung, Durchsetzung),
- die Etappen der Session-Kette stehen in etappen.yaml und werden gegen den Code abgeglichen,
- hooks/hooks.json entsteht aus dem Plugin-Manifest, Code kommt als Asset.
"""

from __future__ import annotations

import hashlib
import json
import posixpath
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import jinja2
import yaml

from common import (EXECUTABLE, HEADER, ROOT, SKILL_MAX_LINES, LineLoader, Report, Source, line_of, load_yaml, plain, rel,
                    validate_schema, lint_identity, split_frontmatter, CAPS_RE, REASON_RE, LINK_RE)

PARTIAL_RE = re.compile(r"<<=\s*partial\('([^']+)'\)\s*>>")
RAW_SCRIPT_RE = re.compile(r"\$\{CLAUDE_PLUGIN_ROOT\}/([\w./-]+)")


def mention_re(prefix: str) -> re.Pattern:
    """Verweise `<präfix>:<name>` auf Skills und Agents; das Präfix ist der Plugin-Name (verweis_praefix im Bestellschein)."""
    return re.compile(rf"{re.escape(prefix)}:([a-z][a-z0-9-]*[a-z0-9])(?![a-z0-9*-])")


def strict(cp) -> bool:
    """lint: streng (Standard) macht Stilfragen zu Fehlern; lint: bestand (übernommene Plugins) zu Warnungen."""
    return cp.manifest.data.get("lint", "streng") == "streng"
SCRIPT_RE = re.compile(r"(?:<PLUGIN>/|\$\{CLAUDE_PLUGIN_ROOT\}/|\{\{PLUGIN\}\}/|`)(scripts/[\w./-]+\.(?:js|mjs|cjs|sh|py|ps1))(?![\w.])")
SHARED_RE = re.compile(r"(?:<PLUGIN>/|\$\{CLAUDE_PLUGIN_ROOT\}/|\{\{PLUGIN\}\}/|`)(shared/[\w./-]+\.md)")
REF_RE = re.compile(r"`((?:references|templates)/[\w./-]+\.\w+)`")


HEADER_TOKEN = "GENERIERT-nicht-editieren"


def header_line(source: str) -> str:
    # Ein einziges Wort ohne Leerzeichen: forge begrenzt mehrere Skills per Test auf unter 500 Wörter
    # (session-orchestrator hat 494), eine Kopfzeile aus mehreren Wörtern würde das Budget sprengen.
    return f"<!--{HEADER_TOKEN}:{source.removeprefix('plugin-compiler/')}-->\n"


@dataclass
class Component:
    src: Source            # Manifest (Frontmatter der Quelldatei)
    body: str              # Body-Template der Quelldatei
    body_line: int         # Zeile der Quelldatei, in der der Body beginnt
    out: str               # Pfad im Plugin
    text: str = ""         # gerenderter Body


@dataclass
class ComponentPlugin:
    manifest: Source
    root: Path
    components: list = field(default_factory=list)
    partials: dict = field(default_factory=dict)       # name -> (Path, text)
    rule_docs: list = field(default_factory=list)      # Source
    etappen: Source | None = None
    assets: dict = field(default_factory=dict)         # Pfad im Plugin -> Quelldatei
    files: dict = field(default_factory=dict)          # Pfad im Plugin -> Inhalt (str oder bytes)
    used_partials: set = field(default_factory=set)
    changelog: Source | None = None
    counts: tuple = (0, 0)
    differing: set = field(default_factory=set)
    graph: dict = field(default_factory=dict)          # Komponente -> erwähnte Komponenten

    @property
    def name(self) -> str:
        return self.manifest.data["name"]

    @property
    def dir(self) -> str:
        return self.manifest.data["dir"]


# ---------------------------------------------------------------------------------------------------------------------
# Laden


def load_component(path: Path, root: Path, report: Report) -> Component | None:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?\n)---\n", text, re.S)
    if not m:
        report.error(rel(path), 1, "Compiler-Manifest (--- … ---) fehlt")
        return None
    try:
        data = yaml.load(m.group(1), Loader=LineLoader)  # noqa: S506
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        report.error(rel(path), (mark.line + 2) if mark else 1, f"Manifest ungültig: {getattr(exc, 'problem', exc)}")
        return None
    shift_lines(data, 1)  # das Manifest beginnt in Zeile 2 der Datei
    body_line = m.group(0).count("\n") + 1
    return Component(Source(path, data), text[m.end():], body_line, path.relative_to(root).as_posix())


def shift_lines(node, offset: int) -> None:
    if hasattr(node, "lines"):
        node.line += offset
        if isinstance(node.lines, dict):
            node.lines = {k: v + offset for k, v in node.lines.items()}
        else:
            node.lines = [v + offset for v in node.lines]
    children = node.values() if isinstance(node, dict) else node if isinstance(node, list) else []
    for child in children:
        shift_lines(child, offset)


def load_plugin(manifest: Source, report: Report) -> ComponentPlugin:
    root = (ROOT / manifest.data["source"]).resolve()
    cp = ComponentPlugin(manifest, root)
    for path in sorted(root.rglob("*.md")):
        relp = path.relative_to(root).as_posix()
        if relp.startswith("assets/"):
            continue  # Code, Tests und Golden-Sets: Assets, keine Prosa-Quellen
        if relp.startswith("partials/"):
            cp.partials[path.stem] = (path, path.read_text(encoding="utf-8"))
        elif (c := load_component(path, root, report)):
            cp.components.append(c)
    cp.rule_docs = [s for p in sorted((root / "rules").glob("*.yaml")) if (s := load_yaml(p, report))]
    if (root / "etappen.yaml").exists():
        cp.etappen = load_yaml(root / "etappen.yaml", report)
    for i, asset in enumerate(manifest.data.get("assets", [])):
        base = (ROOT / asset["from"]).resolve()
        if not base.is_dir():
            report.error(manifest.name, line_of(manifest.data["assets"], i), f"Asset-Quelle {asset['from']} fehlt")
            continue
        for f in sorted(p for p in base.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"):
            relp = f.relative_to(base).as_posix()
            cp.assets[relp if asset["to"] == "." else f"{asset['to']}/{relp}"] = f
    return cp


# ---------------------------------------------------------------------------------------------------------------------
# Prüfen


def body_line_of(c: Component, needle: str) -> tuple[str, int]:
    """Ort eines Textes: Zeile im Body der Quelldatei oder, wenn er aus einem Partial stammt, im Partial."""
    for i, row in enumerate(c.body.split("\n")):
        if needle in row:
            return c.src.name, c.body_line + i
    return c.src.name, c.body_line


def jinja_env() -> jinja2.Environment:
    # Eigene Begrenzer: Der forge-Text enthält {{PLUGIN}} wörtlich (session-chain-brief.js ersetzt es zur Laufzeit).
    return jinja2.Environment(block_start_string="<%", block_end_string="%>", variable_start_string="<<=",
                              variable_end_string=">>", comment_start_string="<#", comment_end_string="#>",
                              undefined=jinja2.StrictUndefined, keep_trailing_newline=True, autoescape=False)


def fm_of(c: Component) -> dict:
    """Frontmatter-Felder einer Quelle, auch aus der Rohform (frontmatter_roh) zeilenweise gelesen."""
    data = c.src.data if isinstance(c.src.data, dict) else {}
    if "frontmatter_roh" in data:
        fields = {}
        for line in str(data["frontmatter_roh"]).split("\n"):
            if ":" in line and not line.startswith((" ", "\t", "#")):
                key, _, value = line.partition(":")
                fields[key.strip()] = value.strip()
        return fields
    return data.get("frontmatter", {}) or {}


def check_plugin(cp: ComponentPlugin, rules: dict, terms_avoid: dict, report: Report) -> None:
    d = cp.manifest.data
    schemas = {"skill": "component-skill", "agent": "component-agent"}
    for c in cp.components:
        kind = c.src.data.get("kind") if isinstance(c.src.data, dict) else None
        validate_schema(c.src, schemas.get(kind, "component-doc"), report)
    for s in cp.rule_docs:
        validate_schema(s, "rules-doc", report)
    if cp.etappen:
        validate_schema(cp.etappen, "etappen", report)
    report.stop_if_errors(f"Schema ({cp.name})")

    # Ablageort und Namen
    names: dict = {}
    for c in cp.components:
        kind, fm = c.src.data["kind"], fm_of(c)
        expected = {"skill": f"skills/{fm.get('name')}/SKILL.md", "agent": f"agents/{fm.get('name')}.md", "readme": "README.md"}.get(kind)
        if expected and c.out != expected:
            report.error(c.src.name, line_of(fm, "name"), f"{kind} „{fm.get('name')}“ muss unter {expected} liegen, nicht {c.out}")
        if kind == "reference" and not re.fullmatch(r"skills/[a-z0-9-]+/references/[\w.-]+\.md", c.out):
            report.error(c.src.name, 1, "Referenz muss unter skills/<skill>/references/ liegen (eine Ebene)")
        if kind == "shared" and not c.out.startswith("shared/"):
            report.error(c.src.name, 1, "geteilte Datei muss unter shared/ liegen")
        if kind in ("skill", "agent"):
            if fm["name"] in names:
                report.error(c.src.name, line_of(fm, "name"), f"Name „{fm['name']}“ doppelt (auch {names[fm['name']].src.name}); <plugin>:<name> wäre mehrdeutig")
            names[fm["name"]] = c

    # Regeln: IDs eindeutig über Kern, Plugins und Regeldateien; Durchsetzung zeigt auf vorhandenen Code
    docs_out = {c.out for c in cp.components}
    generated = docs_out | {s.data["doc"] for s in cp.rule_docs} | {".claude-plugin/plugin.json"} | ({"hooks/hooks.json"} if d.get("hooks") else set())
    for path in sorted(set(cp.assets) & generated):
        report.error(cp.manifest.name, line_of(d, "assets"), f"Asset {path} kollidiert mit einer erzeugten Datei; eine von beiden muss weg")
    for s in cp.rule_docs:
        if s.data["doc"] in docs_out:
            report.error(s.name, line_of(s.data, "doc"), f"{s.data['doc']} entsteht schon aus einer Markdown-Quelle")
        docs_out.add(s.data["doc"])
        for si, sec in enumerate(s.data["sections"]):
            for ri, r in enumerate(sec.get("rules", [])):
                if r["id"] in rules:
                    report.error(s.name, line_of(sec["rules"], ri), f"Regel „{r['id']}“ doppelt (zuerst in {rules[r['id']][1].name}:{rules[r['id']][4]})")
                else:
                    rules[r["id"]] = (r, s, sec["rules"], ri, line_of(sec["rules"], ri))
                if "enforced_by" in r and r["enforced_by"] not in cp.assets:
                    report.error(s.name, line_of(r, "enforced_by"), f"{r['id']}: enforced_by {r['enforced_by']} gibt es nicht")
                if r["enforce"] != "text" and "enforced_by" not in r:
                    report.error(s.name, line_of(r, "enforce"), f"{r['id']}: enforce: {r['enforce']} braucht enforced_by")
                if r["why"].startswith("TODO("):
                    report.warn(s.name, line_of(r, "why"), f"{r['id']}: Begründung offen")
            if (sec["style"] == "table") != ("table" in sec):
                report.error(s.name, line_of(s.data["sections"], si), f"Abschnitt „{sec['heading']}“: style und Inhalt passen nicht")

    # Hooks: jedes Skript existiert
    for event, entries in d.get("hooks", {}).items():
        for ei, entry in enumerate(entries):
            for ci, cmd in enumerate(entry["commands"]):
                targets = [f"scripts/{cmd.split()[0]}"] if isinstance(cmd, str) else RAW_SCRIPT_RE.findall(cmd["command"])
                for script in targets:
                    if script not in cp.assets:
                        report.error(cp.manifest.name, line_of(entry["commands"], ci), f"Hook {event}: {script} gibt es nicht")

    report.stop_if_errors(f"Regeln und Hooks ({cp.name})")

    # Partials: vorhanden; Bodies rendern
    env = jinja_env()
    env.globals["partial"] = lambda name: render_partial(cp, env, name)
    for c in cp.components:
        # Text in <% raw %> … <% endraw %> ist wortgleicher Inhalt, etwa eine Anleitung, die die Baustein-Syntax erklärt.
        scan = re.sub(r"<% raw %>.*?<% endraw %>", lambda m: "\n" * m.group(0).count("\n"), c.body, flags=re.S)
        for i, row in enumerate(scan.split("\n")):
            for name in PARTIAL_RE.findall(row):
                if name not in cp.partials:
                    report.error(c.src.name, c.body_line + i, f"Partial „{name}“ nicht gefunden (partials/{name}.md)")
                cp.used_partials.add(name)
    report.stop_if_errors(f"Partials ({cp.name})")
    for c in cp.components:
        try:
            c.text = env.from_string(c.body).render()
        except jinja2.TemplateError as exc:
            report.error(c.src.name, c.body_line + (getattr(exc, "lineno", 1) or 1) - 1, f"Template: {exc}")
    for name, (path, _) in sorted(cp.partials.items()):
        if name not in cp.used_partials:
            report.warn(rel(path), 1, f"Partial „{name}“ wird nicht verwendet")
    report.stop_if_errors(f"Rendern ({cp.name})")

    # Verweise im Text: <präfix>:<name>, scripts/…, shared/…, references/…
    # Ein Verweis auf etwas, das es nicht gibt, ist immer ein Fehler, auch bei lint: bestand:
    # Er lässt den Agent raten, was gemeint war.
    prefix = d.get("verweis_praefix", d["name"])
    mentions = mention_re(prefix)
    skill_names = {c.out.split("/")[1] for c in cp.components if c.out.startswith("skills/")}
    for c in cp.components:
        me = fm_of(c).get("name") or c.out
        if c.src.data["kind"] == "reference":
            me = c.out.split("/")[1]  # Verweise einer Referenz gehören zu ihrem Skill
        cp.graph.setdefault(me, set())
        rows = c.text.split("\n")
        for i, row in enumerate(rows):
            for mention in mentions.findall(row):
                if mention not in names:
                    f, ln = body_line_of(c, f"{prefix}:{mention}")
                    report.error(f, ln, f"Verweis {prefix}:{mention}: weder Skill noch Agent")
                elif mention != me:
                    cp.graph[me].add(mention)
            own = "/".join(c.out.split("/")[:2]) if c.out.startswith("skills/") else None
            for script in SCRIPT_RE.findall(row):
                if script not in cp.assets and not (own and f"{own}/{script}" in cp.assets):
                    f, ln = body_line_of(c, script)
                    report.error(f, ln, f"Verweis auf {script}: Skript gibt es nicht")
            for shared in SHARED_RE.findall(row):
                if shared not in docs_out:
                    f, ln = body_line_of(c, shared)
                    report.error(f, ln, f"Verweis auf {shared}: Datei entsteht nicht")
            if c.out.startswith("skills/") and c.src.data["kind"] in ("skill", "reference"):
                skill_dir = "/".join(c.out.split("/")[:2])
                for ref in REF_RE.findall(row):
                    if f"{skill_dir}/{ref}" in docs_out or f"{skill_dir}/{ref}" in cp.assets:
                        continue
                    # „`anderer-skill` → `references/x.md`“: der Absatz nennt den Skill, dem die Datei gehört
                    named = {n for n in re.findall(r"`([a-z][a-z0-9-]*)`", paragraph_of(rows, i)) if n in skill_names}
                    if any(f"skills/{n}/{ref}" in docs_out or f"skills/{n}/{ref}" in cp.assets for n in named):
                        continue
                    f, ln = body_line_of(c, ref)
                    report.error(f, ln, f"Verweis auf {ref}: gibt es in {skill_dir} nicht"
                                 + (f" und auch nicht in {', '.join(sorted(named))}" if named else ""))
        for word, owner in terms_avoid.items():
            for i, row in enumerate(c.text.split("\n")):
                if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", row):
                    f, ln = body_line_of(c, word)
                    report.warn(f, ln, f"„{word}“ ist laut Glossar zu vermeiden (Begriff „{owner}“); wortgleich aus dem Bestand übernommen")

    if cp.etappen:
        check_etappen_generic(cp, names, report)
        if d.get("etappen_abgleich") == "session-chain":
            check_etappen(cp, names, report)
    report.stop_if_errors(f"Verweise ({cp.name})")


def js_entries(text: str, const: str) -> str:
    start = text.index(f"const {const} = {{")
    depth, i = 0, text.index("{", start)
    for j in range(i, len(text)):
        depth += {"{": 1, "}": -1}.get(text[j], 0)
        if depth == 0:
            return text[i:j + 1]
    raise ValueError(const)


def check_etappen_generic(cp: ComponentPlugin, names: dict, report: Report) -> None:
    """Für jedes Plugin mit etappen.yaml: Skills existieren, Folge-Etappen und Haltepunkte sind bekannt, wer startet, ist ein Skill."""
    src, data = cp.etappen, cp.etappen.data
    ids = [e["id"] for e in data["etappen"]]
    halts = {h["id"] for h in data.get("haltepunkte", [])}
    if data["gestartet_von"] not in names:
        report.error(src.name, line_of(data, "gestartet_von"), f"gestartet_von: Skill {data['gestartet_von']} gibt es nicht")
    for i, e in enumerate(data["etappen"]):
        if e["skill"] and e["skill"] not in names:
            report.error(src.name, line_of(e, "skill"), f"Skill {e['skill']} gibt es nicht")
        nxt = e["weiter"]
        if "start" in nxt and nxt["start"] not in ids:
            report.error(src.name, line_of(e, "weiter"), f"{e['id']}.weiter: Etappe {nxt['start']} gibt es nicht")
        if "halt" in nxt and nxt["halt"] not in halts:
            report.error(src.name, line_of(e, "weiter"), f"{e['id']}.weiter: Haltepunkt {nxt['halt']} gibt es nicht")
        cp.graph.setdefault(data["gestartet_von"], set()).add(f"Etappe {e['id']}")
        if e["skill"]:
            cp.graph.setdefault(f"Etappe {e['id']}", set()).add(e["skill"])
    for h in data.get("haltepunkte", []):
        for target in h["wahl"].values():
            if target not in ids:
                report.error(src.name, line_of(h, "wahl"), f"Haltepunkt {h['id']}: Etappe {target} gibt es nicht")


def check_etappen(cp: ComponentPlugin, names: dict, report: Report) -> None:
    """Zusatz für Plugins mit Session-Kette (etappen_abgleich: session-chain): gleicht etappen.yaml mit deren Code ab."""
    src, data = cp.etappen, cp.etappen.data
    store = cp.assets["scripts/lib/session-chain-store.js"].read_text(encoding="utf-8")
    brief = cp.assets["scripts/lib/session-chain-brief.js"].read_text(encoding="utf-8")
    decide = cp.assets["scripts/lib/session-chain-decide.js"].read_text(encoding="utf-8")
    text_js = cp.assets["scripts/lib/session-chain-text.js"].read_text(encoding="utf-8")
    order = re.findall(r"'([\w-]+)'", re.search(r"const ETAPPEN = \[(.*?)\];", store).group(1))
    ids = [e["id"] for e in data["etappen"]]
    if ids != order:
        report.error(src.name, line_of(data, "etappen"), f"Reihenfolge {ids} weicht von session-chain-store.js ab: {order}")
    briefs = js_entries(brief, "ETAPPEN_BRIEFS")
    nexts = js_entries(decide, "NEXT")
    prefix = re.escape(cp.manifest.data.get("verweis_praefix", cp.name))
    go_skill = re.search(rf"/{prefix}:([a-z-]+)", text_js[text_js.index("function goCall"):]).group(1)
    for i, e in enumerate(data["etappen"]):
        line = line_of(data["etappen"], i)
        key = e["id"] if re.fullmatch(r"\w+", e["id"]) else f"'{e['id']}'"
        m = re.search(rf"\n  {re.escape(key)}: \{{\n    modell: '(\w+)', titel: '([^']+)', pflicht: \[([^\]]*)\],\n    command: ([^\n]*)", briefs)
        if not m:
            report.error(src.name, line, f"Etappe {e['id']} fehlt in session-chain-brief.js")
            continue
        modell, titel, pflicht, command = m.group(1), m.group(2), re.findall(r"'([\w-]+)'", m.group(3)), m.group(4)
        found = re.search(rf"/{prefix}:([a-z-]+)", command)
        skill = go_skill if "goCall" in command else (found.group(1) if found else None)
        for fld, code_value in (("modell", modell), ("titel", titel), ("pflicht", pflicht), ("skill", skill)):
            if e[fld] != code_value:
                report.error(src.name, line_of(e, fld), f"{e['id']}.{fld} = {e[fld]!r}, session-chain-brief.js sagt {code_value!r}")
        n = re.search(rf"\n  {re.escape(key)}: (\{{[^}}]*\}})", nexts)
        code_next = n.group(1).replace("'", "") if n else None
        yaml_next = "{ " + ", ".join(f"{k}: {str(v).lower() if isinstance(v, bool) else v}" for k, v in e["weiter"].items()) + " }"
        if code_next != yaml_next:
            report.error(src.name, line_of(e, "weiter"), f"{e['id']}.weiter = {yaml_next}, session-chain-decide.js sagt {code_next}")


# ---------------------------------------------------------------------------------------------------------------------
# Rendern


def render_partial(cp: ComponentPlugin, env: jinja2.Environment, name: str) -> str:
    _, text = cp.partials[name]
    return env.from_string(text).render().removesuffix("\n")


def render_frontmatter(c: Component, cp: "ComponentPlugin | None" = None) -> str:
    data = c.src.data
    if "frontmatter_roh" in data:
        # Übernommene Frontmatter, die sich nicht als einfache Felder darstellen ließ: wortgleich ausgeben.
        return "---\n" + data["frontmatter_roh"].rstrip("\n") + "\n---\n"
    fm = dict(data.get("frontmatter", {}))
    if not fm and data["kind"] not in ("skill", "agent"):
        return ""
    quote = strict(cp) if cp else True
    if data["kind"] == "skill":
        suffix = cp.manifest.data.get("intern_zusatz") if cp else None
        if data["role"] == "intern" and suffix:
            fm["description"] = fm["description"] + " " + suffix
        if data["model_invocation"] == "disabled":
            fm["disable-model-invocation"] = "true"
    lines = ["---"]
    for key, value in fm.items():
        if isinstance(value, dict):
            lines.append(f"{key}: {value.get('stil', '>')}")
            lines += [f"  {row}" if row else "" for row in value["folded"]]
        else:
            lines.append(f"{key}: {yaml_scalar(key, value) if quote else value}")
    return "\n".join(lines) + "\n---\n"


def yaml_scalar(key: str, value: str) -> str:
    """Wert unverändert, wenn er als YAML genau sich selbst ergibt; sonst in einfachen Anführungszeichen (Befund 5).
    Claude Code liest die Frontmatter als YAML; `argument-hint: [a|b] [c]` oder `Triggers: "…"` in einer description sind sonst ungültig."""
    try:
        if value in ("true", "false") or yaml.safe_load(f"{key}: {value}") == {key: value}:
            return value
    except yaml.YAMLError:
        pass
    return "'" + value.replace("'", "''") + "'"


def render_rule_doc(s: Source, env: jinja2.Environment) -> str:
    return env.get_template("rules-doc.md.j2").render(doc=s.data)


def render_plugin(cp: ComponentPlugin, templates: jinja2.Environment) -> dict:
    d = cp.manifest.data
    files: dict = {}
    manifest = {"name": d["name"], "version": d["version"], "description": d["description"]}
    if "author" in d:
        manifest["author"] = {"name": d["author"]}
    manifest.update(d.get("plugin_json", {}))  # weitere Felder wortgleich (homepage, license, keywords …)
    files[".claude-plugin/plugin.json"] = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    for c in cp.components:
        fm = render_frontmatter(c, cp)
        files[c.out] = fm + header_line(c.src.name) + c.text
    for s in cp.rule_docs:
        files[s.data["doc"]] = header_line(s.name) + render_rule_doc(s, templates)
    if d.get("hooks"):
        hooks = {"description": f"{HEADER} Quelle: {ROOT.name}/{cp.manifest.name} (hooks).", "hooks": {}}
        for event, entries in d["hooks"].items():
            out = []
            for entry in entries:
                item = {}
                if "matcher" in entry:
                    item["matcher"] = entry["matcher"]
                item["hooks"] = [hook_entry(cmd) for cmd in entry["commands"]]
                out.append(item)
            hooks["hooks"][event] = out
        files["hooks/hooks.json"] = json.dumps(hooks, ensure_ascii=False, indent=2) + "\n"
    for path, src in cp.assets.items():
        if path in files:
            continue  # erzeugte Dateien gehen vor; check_plugin meldet die Kollision
        files[path] = src.read_bytes()
        if src.stat().st_mode & 0o111:
            EXECUTABLE.add(f"{cp.dir}/{path}")
    cp.files = files
    return {f"{cp.dir}/{p}": v for p, v in files.items()}


def hook_entry(cmd) -> dict:
    """Kurzform `skript.js arg` (node aus scripts/) oder Rohform {command: …, weitere Felder wie timeout} wortgleich."""
    if isinstance(cmd, str):
        return {"type": "command", "command": command_line(cmd)}
    return {"type": "command", **cmd}


def command_line(cmd: str) -> str:
    script, *args = cmd.split()
    return " ".join([f'node "${{CLAUDE_PLUGIN_ROOT}}/scripts/{script}"', *args])


# ---------------------------------------------------------------------------------------------------------------------
# Linten und Äquivalenz


def identity(cp: ComponentPlugin, where: str, fm: dict, report: Report) -> None:
    """Name und description prüfen; im Lint-Modus bestand sind Verstöße Warnungen, damit eine Übernahme wortgleich bleiben kann."""
    if strict(cp):
        lint_identity(where, fm, report)
        return
    probe = Report()
    lint_identity(where, fm, probe)
    for p in probe.errors:
        report.warn(p.file, p.line, f"{p.message} (lint: bestand)")


def lint_plugin(cp: ComponentPlugin, report: Report) -> None:
    bad = report.error if strict(cp) else report.warn
    for path, content in sorted(cp.files.items()):
        if isinstance(content, bytes) or path in cp_asset_paths(cp):
            continue
        where = f"{cp.dir}/{path}"
        lines = content.split("\n")
        if path.endswith(".md"):
            fm, _ = split_frontmatter(content)
            head = lines[(content[:content.find("\n---\n", 4) + 5].count("\n")) if fm is not None else 0]
            if not head.startswith(f"<!--{HEADER_TOKEN}:"):
                report.error(where, 1, "Kopfzeile „GENERIERT - nicht editieren“ fehlt direkt nach dem Frontmatter")
            fenced = fence_mask(lines)
            for i, row in enumerate(lines, 1):
                caps = CAPS_RE.search(row)
                if caps and not REASON_RE.search(row):
                    report.warn(where, i, f"„{caps.group(1)}“ in Großbuchstaben ohne Begründung in derselben Zeile")
                if fenced[i - 1]:
                    continue  # Vorlagen und Beispiele in Codeblöcken; ihre Links gelten am Zielort (z. B. Memory)
                base = path.rsplit("/", 1)[0] if "/" in path else ""
                for target in LINK_RE.findall(row):
                    if "://" in target or target.startswith(("mailto:", "#")):
                        continue
                    resolved = posixpath.normpath(posixpath.join(base, target))
                    if resolved == ".." or resolved.startswith("../") or target.startswith(("/", "~")):
                        report.error(where, i, f"Verweis auf {target} zeigt aus dem Plugin heraus; dort prüft die Druckerei nichts")
                        continue
                    is_dir = any(f.startswith(resolved.rstrip("/") + "/") for f in cp.files)
                    if resolved not in cp.files and not is_dir:
                        report.error(where, i, f"Verweis auf {target}: {resolved} wird nicht erzeugt")
                    elif "/references/" in path and target.endswith(".md") and not resolved.endswith("/SKILL.md"):
                        bad(where, i, f"Referenz verweist weiter auf {target}; erlaubt ist nur eine Ebene")
        if path.endswith("SKILL.md"):
            if len(lines) >= SKILL_MAX_LINES:
                bad(where, len(lines), f"SKILL.md hat {len(lines)} Zeilen, erlaubt sind unter {SKILL_MAX_LINES}")
            fm, _ = split_frontmatter(content)
            if (fm or {}).pop("__invalid_yaml__", False):
                (report.error if strict(cp) else report.warn)(where, 2, "Frontmatter ist kein gültiges YAML; Claude Code liest sie womöglich nicht")
            identity(cp, where, fm or {}, report)
        if path.startswith("agents/"):
            fm, _ = split_frontmatter(content)
            (fm or {}).pop("__invalid_yaml__", None)
            identity(cp, where, fm or {}, report)
            if "tools" not in (fm or {}) and "review" in path and "Edit" not in str((fm or {}).get("disallowedTools", "")):
                report.warn(where, 2, "Reviewer ohne tools-Zeile erbt alle Werkzeuge, auch Edit und Bash")
            tools = {t.strip() for t in str((fm or {}).get("tools", "")).split(",")}
            if tools & {"Edit", "MultiEdit", "Bash"} and "review" in path and not path.endswith("-rework.md"):
                report.warn(where, 4, f"Reviewer mit schreibfähigem Werkzeug {sorted(tools & {'Edit', 'MultiEdit', 'Bash'})}; nicht read-only")
    report.stop_if_errors(f"Lint ({cp.name})")


def fence_mask(lines: list) -> list:
    """True für jede Zeile in einem Codeblock (``` oder ~~~), einschließlich der Zaunzeilen."""
    mask, fence = [], None
    for row in lines:
        mark = re.match(r"\s*(`{3,}|~{3,})", row)
        if fence is None and mark:
            fence = mark.group(1)[0] * len(mark.group(1))
            mask.append(True)
        elif fence is not None:
            mask.append(True)
            if mark and mark.group(1).startswith(fence):
                fence = None
        else:
            mask.append(False)
    return mask


def paragraph_of(rows: list, i: int) -> str:
    """Der Absatz um Zeile i: angrenzende Zeilen bis zur nächsten Leerzeile."""
    start, end = i, i
    while start > 0 and rows[start - 1].strip():
        start -= 1
    while end + 1 < len(rows) and rows[end + 1].strip():
        end += 1
    return "\n".join(rows[start:end + 1])


def cp_asset_paths(cp: ComponentPlugin) -> set:
    return set(cp.assets)


HEADER_RE = re.compile(r"^<!--GENERIERT-nicht-editieren:[^\s]*-->\n", re.M)


def normalized(path: str, content, ignore: list = ()) -> bytes:
    if isinstance(content, bytes):
        return content
    keys = [i.split("#", 1)[1] for i in ignore if i.split("#", 1)[0] == path]
    if keys:
        data = json.loads(content)
        for k in keys:
            data.pop(k, None)
        content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if path.endswith(".md"):
        content = HEADER_RE.sub("", content, count=1)
    if path == "hooks/hooks.json":
        data = json.loads(content)
        data.pop("description", None)
        content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    return content.encode("utf-8")


def load_changelog(cp: ComponentPlugin, report: Report) -> dict:
    """Datei im Plugin -> Liste (Befund, Zeile) aus dem Änderungsprotokoll."""
    rel_path = cp.manifest.data.get("changelog")
    if not rel_path:
        return {}
    src = load_yaml(ROOT / rel_path, report)
    if not src or not validate_schema(src, "changelog", report):
        report.stop_if_errors(f"Änderungsprotokoll ({cp.name})")
    cp.changelog = src
    allowed: dict = {}
    for i, change in enumerate(src.data["changes"]):
        for j, f in enumerate(change["dateien"]):
            allowed.setdefault(f, []).append((change["befund"], src.name, line_of(change["dateien"], j)))
    return allowed


def check_equivalence(cp: ComponentPlugin, report: Report) -> tuple[int, int]:
    """Vergleicht die Ausgabe mit dem Bestand (equivalent_to). Kopfzeile und description in hooks.json zählen nicht.
    Eine Abweichung ist nur erlaubt, wenn die Datei im Änderungsprotokoll steht; eine gelistete Datei muss auch abweichen."""
    ref = cp.manifest.data.get("equivalent_to")
    if not ref:
        return 0, 0
    allowed = load_changelog(cp, report)
    base = (ROOT / ref).resolve()
    existing = {p.relative_to(base).as_posix(): p for p in base.rglob("*")
                if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc" and p.name != ".DS_Store"}
    ignore = cp.manifest.data.get("equivalence_ignore", [])
    differing: set = set()

    def deviation(path: str, line: int, message: str) -> None:
        differing.add(path)
        if path not in allowed:
            report.error(f"{cp.dir}/{path}", line, f"Abgleich: {message}; nicht im Änderungsprotokoll")

    for path in sorted(set(existing) - set(cp.files)):
        deviation(path, 1, f"fehlt in der Ausgabe, steht aber in {ref}")
    for path in sorted(set(cp.files) - set(existing)):
        deviation(path, 1, f"neu in der Ausgabe, fehlt in {ref}")
    same = 0
    for path in sorted(set(cp.files) & set(existing)):
        mine, theirs = normalized(path, cp.files[path], ignore), existing[path].read_bytes()
        if path == "hooks/hooks.json" or any(i.startswith(path + "#") for i in ignore):
            theirs = normalized(path, theirs.decode("utf-8"), ignore)
        if mine == theirs:
            same += 1
            continue
        a, b = mine.decode("utf-8", "replace").split("\n"), theirs.decode("utf-8", "replace").split("\n")
        n = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
        got = a[n] if n < len(a) else "<Dateiende>"
        want = b[n] if n < len(b) else "<Dateiende>"
        deviation(path, n + 1, f"weicht ab. erzeugt {got[:80]!r}, Bestand {want[:80]!r}")
    for path, entries in sorted(allowed.items()):
        if path not in differing:
            befund, file, line = entries[0]
            report.error(file, line, f"Befund {befund}: {path} steht im Änderungsprotokoll, weicht aber nicht vom Bestand ab")
    check_fingerprints(cp, differing & set(allowed), ignore, report)
    cp.differing = differing
    report.stop_if_errors(f"Abgleich mit dem Bestand ({cp.name})")
    return same, len(differing)


STAND_PREFIX = "# --- Abgenommener Stand"  # Erkennung am Anfang: ältere Protokolle tragen einen anderen Wortlaut dahinter
STAND_MARK = STAND_PREFIX + " je geänderter Datei (sha256, erzeugt mit druckerei abnehmen) ---"
ACCEPT = "--accept" in sys.argv


def fingerprint(path: str, content, ignore) -> str:
    return hashlib.sha256(normalized(path, content, ignore)).hexdigest()[:16]


def check_fingerprints(cp: ComponentPlugin, paths: set, ignore, report: Report) -> None:
    """Jede geänderte Datei muss dem abgenommenen Stand entsprechen. Sonst fiele eine zweite, ungewollte Änderung in einer Datei,
    die schon im Protokoll steht, nicht auf. `--accept` übernimmt den aktuellen Stand bewusst ins Protokoll."""
    if not cp.changelog:
        return
    stand = cp.changelog.data.get("stand") or {}
    current = {p: fingerprint(p, cp.files[p], ignore) for p in sorted(paths) if p in cp.files}
    if ACCEPT:
        text = cp.changelog.path.read_text(encoding="utf-8")
        text = text.split(STAND_PREFIX)[0].rstrip("\n") + "\n\n" + STAND_MARK + "\nstand:\n"
        text += "".join(f"  {p}: {h}\n" for p, h in current.items())
        cp.changelog.path.write_text(text, encoding="utf-8")
        return
    for p, h in current.items():
        if stand.get(p) != h:
            report.error(f"{cp.dir}/{p}", 1, f"Abgleich: weicht vom abgenommenen Stand im Änderungsprotokoll ab ({stand.get(p) or 'kein Stand'} → {h}); "
                                              "Änderung prüfen, dann druckerei abnehmen")
    for p in sorted(set(stand) - set(current)):
        report.error(cp.changelog.name, 1, f"stand: {p} ist nicht mehr geändert; druckerei abnehmen")


def graph_report(cp: ComponentPlugin) -> str:
    """Abhängigkeiten von der Leit-Session bis zum Sub-Agent als Mermaid-Diagramm und Tabelle."""
    kinds = {}
    for c in cp.components:
        fm = fm_of(c)
        if c.src.data["kind"] in ("skill", "agent"):
            kinds[fm["name"]] = (c.src.data["kind"], c.src.data.get("role") or c.src.data.get("type"), c.src.data.get("stage", ""))
    lines = [f"<!-- {HEADER} Erzeugt von der Plugin-Druckerei aus {cp.manifest.data['source']}. -->", "", f"# {cp.name}: Aufrufgraph", "",
             f"Kanten entstehen aus den Verweisen `{cp.manifest.data.get('verweis_praefix', cp.name)}:<name>` im Text und aus `etappen.yaml`. "
             "Der Build bricht ab, wenn ein Verweis auf keinen Skill oder Agent zeigt.", "", "```mermaid", "flowchart LR"]
    def node(n):
        k = kinds.get(n)
        ident = re.sub(r"[^A-Za-z0-9]", "_", n)
        if k is None:
            return f'{ident}(["{n}"])'
        return f'{ident}["{n}<br/><small>{k[0]} · {k[1]}</small>"]' if k[0] == "skill" else f'{ident}[["{n}<br/><small>agent · {k[1]}</small>"]]'
    for src in sorted(cp.graph):
        for dst in sorted(cp.graph[src]):
            if src in kinds or src.startswith("Etappe"):
                lines.append(f"  {node(src)} --> {node(dst)}")
    lines += ["```", "", "| Komponente | Art | Rolle/Typ | verweist auf |", "|---|---|---|---|"]
    for name in sorted(kinds):
        k = kinds[name]
        calls = ", ".join(f"`{x}`" for x in sorted(cp.graph.get(name, []), key=lambda x: (not x.startswith("Etappe"), x))) or "–"
        lines.append(f"| `{name}` | {k[0]} | {k[1]} | {calls} |")
    called = {x for v in cp.graph.values() for x in v}
    orphans = sorted(n for n in kinds if n not in called and kinds[n][1] not in ("startbefehl", "werkzeug"))
    lines += ["", f"Nicht aufgerufen (weder Startbefehl noch Werkzeug): {', '.join(f'`{o}`' for o in orphans) or 'keine'}.", ""]
    return "\n".join(lines)
