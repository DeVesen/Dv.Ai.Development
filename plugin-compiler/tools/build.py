#!/usr/bin/env python3
"""Plugin-Compiler (Prototyp).

Erzeugt aus plugin-compiler/src (YAML-Manifeste plus Prosa-Partials) die Claude-Code-Plugins nach plugin-compiler/dist.
Abhängigkeiten: pyyaml, jinja2, jsonschema.

Stufen: laden -> prüfen -> auflösen -> rendern -> linten -> schreiben. Jede Stufe sammelt ihre Fehler und bricht
danach mit Exit-Code 1 ab; jede Meldung nennt Datei und Zeile.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

import jinja2
import jsonschema
import yaml

ROOT = Path(__file__).resolve().parent.parent  # plugin-compiler/
SRC = ROOT / "src"
DIST = ROOT / "dist"
SCHEMAS = ROOT / "tools" / "schemas"
MARKETPLACE = "dv-plugin-compiler-demo"
OWNER = "DeVesen"
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
    return path.relative_to(ROOT).as_posix()


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


# ---------------------------------------------------------------------------------------------------------------------
# 1. Laden


@dataclass
class Model:
    glossary: Source | None = None
    artifacts_src: Source | None = None
    rule_files: list[Source] = field(default_factory=list)
    phase_files: list[Source] = field(default_factory=list)
    plugin_files: list[Source] = field(default_factory=list)
    partials: dict = field(default_factory=dict)  # name -> (Path, text)
    templates: set = field(default_factory=set)
    # nach der Prüfung befüllt
    terms: dict = field(default_factory=dict)
    avoid: dict = field(default_factory=dict)  # Wort -> Begriff
    artifacts: dict = field(default_factory=dict)
    rules: dict = field(default_factory=dict)  # id -> (rule, Source, container, index)
    phases: dict = field(default_factory=dict)  # id -> Source
    plugins: dict = field(default_factory=dict)  # name -> Source
    order: list = field(default_factory=list)


def load(report: Report) -> Model:
    m = Model()
    m.glossary = load_yaml(SRC / "glossary.yaml", report)
    m.artifacts_src = load_yaml(SRC / "artifacts.yaml", report)
    m.rule_files = [s for p in sorted((SRC / "rules").glob("*.yaml")) if (s := load_yaml(p, report))]
    m.phase_files = [s for p in sorted((SRC / "phases").glob("*.yaml")) if (s := load_yaml(p, report))]
    m.plugin_files = [s for p in sorted((SRC / "plugins").glob("*.yaml")) if (s := load_yaml(p, report))]
    for p in sorted((SRC / "partials").glob("*.md")):
        m.partials[p.stem] = (p, p.read_text(encoding="utf-8"))
    m.templates = {p.relative_to(SRC / "templates").as_posix() for p in (SRC / "templates").rglob("*.j2")}
    return m


# ---------------------------------------------------------------------------------------------------------------------
# 2. Prüfen


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


def iter_texts(node, file: str, line: int = 1):
    """Alle Strings eines geladenen Dokuments mit Datei und Zeile."""
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(value, str):
                yield key, value, file, line_of(node, key)
            else:
                yield from iter_texts(value, file, line_of(node, key))
    elif isinstance(node, list):
        for i, value in enumerate(node):
            if isinstance(value, str):
                yield i, value, file, line_of(node, i)
            else:
                yield from iter_texts(value, file, line_of(node, i))


PROSE_KEYS_SKIPPED = {"id", "source", "from", "file", "location", "description", "argument_hint", "agent", "subject",
                      "model", "name", "version", "after", "inputs", "outputs", "primary_input", "artifact", "rules",
                      "partials", "applies_to", "phases", "commands", "planning_skills", "tools", "severity", "term",
                      "avoid", "inherit"}


def check_terms(text: str, file: str, line: int, m: Model, report: Report) -> None:
    for i, row in enumerate(text.split("\n")):
        for match in TERM_RE.finditer(row):
            term = match.group(1).strip()
            if term not in m.terms:
                report.error(file, line + i, f"Fachbegriff „{term}“ steht nicht im Glossar (src/glossary.yaml)")
        stripped = TERM_RE.sub(lambda mt: mt.group(1), row)
        for word, owner in m.avoid.items():
            if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", stripped):
                report.error(file, line + i, f"„{word}“ ist laut Glossar zu vermeiden; Begriff: „{owner}“")


def check(m: Model, report: Report) -> None:
    # Schema pro Datei
    sources = []
    if m.glossary:
        sources.append((m.glossary, "glossary"))
    if m.artifacts_src:
        sources.append((m.artifacts_src, "artifacts"))
    sources += [(s, "rules") for s in m.rule_files]
    sources += [(s, "phase") for s in m.phase_files]
    sources += [(s, "plugin") for s in m.plugin_files]
    valid = [src for src, schema in sources if validate_schema(src, schema, report)]
    report.stop_if_errors("Schema")
    del valid

    def unique(kind: str, key: str, src: Source, container, idx, store: dict, value) -> None:
        if key in store:
            prev_src = store[key][1]
            report.error(src.name, line_of(container, idx),
                         f"{kind} „{key}“ doppelt (zuerst in {prev_src.name}:{store[key][4]})")
        else:
            store[key] = (value, src, container, idx, line_of(container, idx))

    # Glossar
    terms_store: dict = {}
    for i, t in enumerate(m.glossary.data["terms"]):
        unique("Begriff", t["term"], m.glossary, m.glossary.data["terms"], i, terms_store, t)
        for word in t.get("avoid", []):
            m.avoid[word] = t["term"]
    m.terms = {k: v[0] for k, v in terms_store.items()}

    # Artefakte
    art_store: dict = {}
    for i, a in enumerate(m.artifacts_src.data["artifacts"]):
        unique("Artefakt", a["id"], m.artifacts_src, m.artifacts_src.data["artifacts"], i, art_store, a)
        if a["term"] not in m.terms:
            report.error(m.artifacts_src.name, line_of(a, "term"), f"Begriff „{a['term']}“ des Artefakts fehlt im Glossar")
    m.artifacts = {k: v[0] for k, v in art_store.items()}

    # Regeln (Kern und Plugin), IDs eindeutig über alles
    for src in m.rule_files:
        for i, r in enumerate(src.data["rules"]):
            unique("Regel", r["id"], src, src.data["rules"], i, m.rules, r)
    for src in m.plugin_files:
        for i, r in enumerate(src.data.get("rules", [])):
            unique("Regel", r["id"], src, src.data["rules"], i, m.rules, r)

    # jede Regel hat „why“ (Schema verlangt es); offene Begründungen als Warnung zählen
    for rid, (r, src, container, idx, _) in m.rules.items():
        if r["why"].lstrip().startswith("TODO("):
            report.warn(src.name, line_of(r, "why"), f"{rid}: Begründung offen ({r['why'][:60]}…)")

    # Etappen
    for src in m.phase_files:
        pid = src.data["id"]
        if pid != src.path.stem:
            report.error(src.name, line_of(src.data, "id"), f"id „{pid}“ passt nicht zum Dateinamen")
        if pid in m.phases:
            report.error(src.name, line_of(src.data, "id"), f"Etappe „{pid}“ doppelt (zuerst in {m.phases[pid].name})")
        m.phases[pid] = src

    # Plugins
    for src in m.plugin_files:
        name = src.data["name"]
        if name in m.plugins:
            report.error(src.name, line_of(src.data, "name"), f"Plugin „{name}“ doppelt")
        m.plugins[name] = src
    report.stop_if_errors("IDs")

    # Referenzen
    for pid, src in m.phases.items():
        d, f = src.data, src.name
        for i, a in enumerate(d["after"]):
            if a not in m.phases:
                report.error(f, line_of(d["after"], i), f"after: Etappe „{a}“ nicht gefunden")
        for key in ("inputs", "outputs"):
            for i, a in enumerate(d[key]):
                if a not in m.artifacts:
                    report.error(f, line_of(d[key], i), f"{key}: Artefakt „{a}“ nicht gefunden (src/artifacts.yaml)")
        if "primary_input" in d and d["primary_input"] not in d["inputs"]:
            report.error(f, line_of(d, "primary_input"), f"primary_input „{d['primary_input']}“ steht nicht in inputs")
        if d["inputs"] and "primary_input" not in d:
            report.error(f, line_of(d, "inputs"), "Etappe mit Eingang braucht primary_input (erstes Argument)")
        # Gate und Artefakt
        if d["gate"]["artifact"] not in d["outputs"]:
            report.error(f, line_of(d["gate"], "artifact"), f"Gate-Artefakt „{d['gate']['artifact']}“ steht nicht in outputs")
        for i, rid in enumerate(d["rules"]):
            if rid not in m.rules:
                report.error(f, line_of(d["rules"], i), f"Regel {rid} nicht gefunden")
            elif m.rules[rid][1] in m.plugin_files:
                report.error(f, line_of(d["rules"], i), f"Regel {rid} ist plugin-spezifisch; sie gehört in applies_to des Plugins")
        if len(set(d["rules"])) != len(d["rules"]):
            report.error(f, line_of(d, "rules"), "Regel doppelt in rules")
        for i, p in enumerate(d.get("partials", [])):
            if p not in m.partials:
                report.error(f, line_of(d["partials"], i), f"Partial „{p}“ nicht gefunden (src/partials/{p}.md)")
        for i, step in enumerate(d["required"]):
            for rid in RULE_REF_RE.findall(step):
                if rid not in d["rules"] and not any(
                        rid in [r["id"] for r in pl.data.get("rules", []) if pid in r["applies_to"]] for pl in m.plugin_files):
                    report.error(f, line_of(d["required"], i), f"Verweis [{rid}] im Ablauf, aber {rid} gilt nicht für diese Etappe")
        hook_rules = [rid for rid in d["rules"] if rid in m.rules and m.rules[rid][0]["enforce"] == "hook"]
        if hook_rules and not d["inputs"]:
            report.error(f, line_of(d, "rules"), f"{', '.join(hook_rules)} (enforce: hook) braucht Eingangs-Artefakte; die Etappe hat keine")
        rv = d.get("review")
        if rv:
            if rv["subject"] not in m.phases:
                report.error(f, line_of(rv, "subject"), f"review.subject: Etappe „{rv['subject']}“ nicht gefunden")
            if rv["agent"] != f"{rv['subject']}-review":
                report.error(f, line_of(rv, "agent"), f"review.agent muss „{rv['subject']}-review“ heißen (agents/<etappe>-review.md)")
            cats = rv["categories"]
            if "inherit" in cats:
                parent = m.phases.get(cats["inherit"])
                if not parent or "review" not in parent.data:
                    report.error(f, line_of(cats, "inherit"), f"categories.inherit: Etappe „{cats['inherit']}“ hat keinen Review")
                elif "inherit" in parent.data["review"]["categories"]:
                    report.error(f, line_of(cats, "inherit"), "categories.inherit darf nur eine Ebene tief erben")
    for name, src in m.plugins.items():
        d, f = src.data, src.name
        if name != src.path.stem:
            report.error(f, line_of(d, "name"), f"name „{name}“ passt nicht zum Dateinamen")
        for i, pid in enumerate(d["emit"]["phases"]):
            if pid not in m.phases:
                report.error(f, line_of(d["emit"]["phases"], i), f"emit.phases: Etappe „{pid}“ nicht gefunden")
        for i, cmd in enumerate(d["emit"]["commands"]):
            if f"commands/{cmd}.md.j2" not in m.templates:
                report.error(f, line_of(d["emit"]["commands"], i), f"emit.commands: Template src/templates/commands/{cmd}.md.j2 fehlt")
        for i, r in enumerate(d.get("rules", [])):
            for j, pid in enumerate(r["applies_to"]):
                if pid not in d["emit"]["phases"]:
                    report.error(f, line_of(r["applies_to"], j), f"{r['id']}: applies_to „{pid}“ wird von {name} nicht emittiert")
            if r["enforce"] == "hook":
                report.error(f, line_of(r, "enforce"), f"{r['id']}: enforce: hook ist im Prototyp nur für Kernregeln umgesetzt")
    report.stop_if_errors("Referenzen")

    # Reihenfolge ohne Zyklen (after), Artefaktfluss
    state: dict = {}
    order: list = []

    def visit(pid: str, stack: list) -> None:
        if state.get(pid) == "done":
            return
        if state.get(pid) == "active":
            cycle = stack[stack.index(pid):] + [pid]
            src = m.phases[pid]
            report.error(src.name, line_of(src.data, "after"), f"Zyklus in der Reihenfolge: {' -> '.join(cycle)}")
            return
        state[pid] = "active"
        for a in sorted(m.phases[pid].data["after"]):
            visit(a, stack + [pid])
        state[pid] = "done"
        order.append(pid)

    for pid in sorted(m.phases):
        visit(pid, [])
    report.stop_if_errors("Reihenfolge")
    m.order = order

    def ancestors(pid: str) -> set:
        out: set = set()
        todo = list(m.phases[pid].data["after"])
        while todo:
            a = todo.pop()
            if a not in out:
                out.add(a)
                todo += m.phases[a].data["after"]
        return out

    for pid, src in m.phases.items():
        produced = {o for a in ancestors(pid) for o in m.phases[a].data["outputs"]}
        for i, a in enumerate(src.data["inputs"]):
            if a not in produced:
                report.error(src.name, line_of(src.data["inputs"], i), f"Eingang „{a}“ erzeugt keine Vorgänger-Etappe")
    for name, src in m.plugins.items():
        emitted = set(src.data["emit"]["phases"])
        for i, pid in enumerate(src.data["emit"]["phases"]):
            if pid in m.phases:
                missing = sorted(ancestors(pid) - emitted)
                if missing:
                    report.error(src.name, line_of(src.data["emit"]["phases"], i),
                                 f"Etappe „{pid}“ braucht Vorgänger, die nicht emittiert werden: {', '.join(missing)}")
    report.stop_if_errors("Artefaktfluss")

    # Fachbegriffe im Glossar, vermiedene Wörter
    for src in m.rule_files + m.phase_files + m.plugin_files:
        for key, text, file, line in iter_texts(src.data, src.name):
            if key in PROSE_KEYS_SKIPPED:
                continue
            check_terms(text, file, line, m, report)
    for name, (path, text) in m.partials.items():
        check_terms(text, rel(path), 1, m, report)
    used = set()
    for src in m.rule_files + m.phase_files + m.plugin_files:
        for _, text, _, _ in iter_texts(src.data, src.name):
            used.update(t.strip() for t, _ in TERM_RE.findall(text))
    for _, text in m.partials.values():
        used.update(t.strip() for t, _ in TERM_RE.findall(text))
    used.update(a["term"] for a in m.artifacts.values())
    for term, (t, src, container, idx, line) in terms_store.items():
        if term not in used:
            report.warn(src.name, line, f"Begriff „{term}“ wird nirgends als [[{term}]] verwendet")
    report.stop_if_errors("Glossar")


# ---------------------------------------------------------------------------------------------------------------------
# 3. Auflösen


def plain(text: str) -> str:
    """[[Begriff|Form]] -> Form, [[Begriff]] -> Begriff; Zeilenumbrüche aus Folded-Blöcken glätten."""
    return TERM_RE.sub(lambda mt: (mt.group(2) or mt.group(1)).strip(), text).strip()


def resolve_rule(r: dict, plugin_rule: bool) -> dict:
    return {"id": r["id"], "title": r["title"], "text": plain(r["text"]), "why": plain(r["why"]),
            "enforce": r["enforce"], "source": r["source"], "plugin": plugin_rule}


def resolve_categories(phase: dict, m: Model) -> list:
    cats = phase["review"]["categories"]
    if "inherit" in cats:
        merged = dict(m.phases[cats["inherit"]].data["review"]["categories"])
        merged.update(cats.get("set", {}))
    else:
        merged = dict(cats)
    items = [(name, {"severity": c["severity"], "meaning": plain(c["meaning"]), "icon": ICON[c["severity"]]})
             for name, c in merged.items()]
    return sorted(items, key=lambda kv: (SEVERITY_ORDER[kv[1]["severity"]], kv[0]))


def planning_skills_step(profile: dict) -> str:
    skills = profile["planning_skills"]
    if not skills:
        return f"Das Profil `{profile['name']}` nennt keine Planungs-Skills; es gelten keine, und du fragst nicht."
    names = ", ".join(f"`{s}`" for s in skills)
    return (f"Das Profil `{profile['name']}` nennt {names}. Lade sie über das Skill-Werkzeug, nachdem die Dateiliste "
            "feststeht; ihre Kernregeln kommen je Regel als eine Zeile mit dem Skill-Namen unter `## Global Constraints`. "
            "Ist ein Skill nicht installiert, steht er dort als „nicht verfügbar“. "
            "TODO(forge/skills/plan-writing/references/context-reading.md): forge kennt zusätzlich `<skill> @<pfad>`.")


def resolve(m: Model, env: jinja2.Environment) -> list:
    plugins = []
    for name in sorted(m.plugins):
        pdata = m.plugins[name].data
        plugin_rules = {r["id"]: r for r in pdata.get("rules", [])}
        emitted = [pid for pid in m.order if pid in pdata["emit"]["phases"]]
        plugin = {"name": name, "version": pdata["version"], "description": plain(pdata["description"]),
                  "profile": {"name": pdata["profile"]["name"], "planning_skills": list(pdata["profile"]["planning_skills"])},
                  "commands": list(pdata["emit"]["commands"]), "phases": []}
        for pid in emitted:
            d = m.phases[pid].data
            core = [resolve_rule(m.rules[rid][0], False) for rid in d["rules"]]
            extra = [resolve_rule(r, True) for r in plugin_rules.values() if pid in r["applies_to"]]
            rules = core + extra
            ctx_vars = {"agent": f"{name}:{d['review']['agent']}" if d.get("review") else "",
                        "report": m.artifacts[d["outputs"][0]]["file"], "title": d["title"],
                        "planning_skills_step": planning_skills_step(pdata["profile"])}

            def render(text: str) -> str:
                return plain(env.from_string(text).render(**ctx_vars))

            phase = {
                "id": pid, "title": d["title"], "description": " ".join(d["description"].split()),
                "argument_hint": d["argument_hint"], "role": render(d["role"]),
                "inputs": [m.artifacts[a] for a in d["inputs"]],
                "primary_input": m.artifacts[d["primary_input"]] if "primary_input" in d else None,
                "outputs": [m.artifacts[a] for a in d["outputs"]],
                "gate": {"artifact": m.artifacts[d["gate"]["artifact"]], "criteria": plain(d["gate"]["criteria"])},
                "rules": rules,
                "required": [RULE_REF_RE.sub(r"(→ \1)", render(s)) for s in d["required"]],
                "format": render(d["format"]) if "format" in d else "",
                "examples": [{"title": e["title"], "source": e["source"], "body": plain(e["body"])} for e in d.get("examples", [])],
                "partial_names": list(d.get("partials", [])),
                "review": None,
            }
            hook_rules = [r for r in core if r["enforce"] == "hook"]
            phase["hook"] = bool(hook_rules)
            phase["hook_rules"] = [r["id"] for r in hook_rules]
            phase["hook_rule_objs"] = [dict(r, why_sh=r["why"].replace('"', "'").replace("`", "'").replace("$", ""))
                                       for r in hook_rules]
            if phase["primary_input"]:
                phase["required_siblings"] = [a for a in phase["inputs"] if a["id"] != phase["primary_input"]["id"]]
            if d.get("review"):
                rv = d["review"]
                phase["review"] = {
                    "agent": rv["agent"], "subject": rv["subject"], "model": rv["model"], "tools": list(rv["tools"]),
                    "input_lines": [plain(x) for x in rv["input_lines"]],
                    "checks": [{"from": c["from"], "text": plain(c["text"])} for c in rv["checks"]],
                    "not_mine": plain(rv["not_mine"]),
                    "categories": resolve_categories(d, m),
                }
                # Regeln, die der Reviewer selbst befolgt (nicht die Orchestrierung).
                phase["agent_rules"] = [r for r in core if r["id"] in {"R-014", "R-030", "R-031", "R-032", "R-033", "R-034"}]
                phase["plugin_checks"] = extra
            plugin["phases"].append(phase)
        plugin["rule_count_core"] = len({r["id"] for p in plugin["phases"] for r in p["rules"] if not r["plugin"]})
        plugin["rule_count_plugin"] = len(plugin_rules)
        plugins.append(plugin)
    return plugins


# ---------------------------------------------------------------------------------------------------------------------
# 4. Rendern


def frontmatter(data: dict) -> str:
    return yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=10_000)


def render_partial(name: str, m: Model, env: jinja2.Environment, ctx: dict) -> str:
    _, text = m.partials[name]
    return plain(env.from_string(text).render(**ctx))


def render_all(plugins: list, m: Model, env: jinja2.Environment) -> dict:
    files: dict = {}  # Pfad relativ zu dist -> Inhalt
    for plugin in plugins:
        base = plugin["name"]
        files[f"{base}/.claude-plugin/plugin.json"] = json.dumps(
            {"name": plugin["name"], "version": plugin["version"], "description": plugin["description"],
             "author": {"name": OWNER}}, ensure_ascii=False, indent=2) + "\n"
        hook_entries = []
        for phase in plugin["phases"]:
            pctx = {"phase": phase, "plugin": plugin, "header": HEADER}
            locations = ("`AC-<Zahl>`, `Task <n>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`"
                         if phase["review"] and phase["review"]["subject"] == "plan" else
                         "`AC-<Zahl>`, der fett gesetzte Name einer Soll-Vorgabe oder die exakte Abschnittsüberschrift ohne `#`")
            partial_ctx = {"categories": phase["review"]["categories"] if phase["review"] else [], "locations": locations}
            phase["partials"] = [render_partial(n, m, env, partial_ctx) for n in phase["partial_names"]]
            fm = {"name": phase["id"], "description": phase["description"], "argument-hint": phase["argument_hint"],
                  "disable-model-invocation": True}
            files[f"{base}/skills/{phase['id']}/SKILL.md"] = env.get_template("skill.md.j2").render(
                frontmatter=frontmatter(fm), **pctx)
            if phase["examples"]:
                files[f"{base}/skills/{phase['id']}/references/beispiele.md"] = env.get_template("references.md.j2").render(**pctx)
            if phase["review"]:
                rv = phase["review"]
                subject = m.phases[rv["subject"]].data["title"]
                agent_fm = {
                    "name": rv["agent"],
                    "description": (f"Reviews a {rv['subject']}.md in a fresh context with read-only tools and answers with "
                                    f"the verdict APPROVE or NEEDS_CHANGES plus a severity-rated finding list. Use when the "
                                    f"{phase['title']} stage of {plugin['name']} needs an independent review of the {subject.lower()}."),
                    "tools": ", ".join(rv["tools"]),
                    "model": rv["model"],
                }
                verdict = render_partial("review-verdict", m, env, partial_ctx)
                files[f"{base}/agents/{rv['agent']}.md"] = env.get_template("agent.md.j2").render(
                    frontmatter=frontmatter(agent_fm), verdict=verdict, plugin_checks=phase["plugin_checks"],
                    subject_text={"spec": "eine Spec", "plan": "einen Umsetzungsplan gegen seine Spec und den Code"}.get(rv["subject"], rv["subject"]),
                    **pctx)
            if phase["hook"]:
                files[f"{base}/scripts/gate-{phase['id']}.sh"] = env.get_template("gate-hook.sh.j2").render(**pctx)
                hook_entries.append({"type": "command", "command": f"sh \"${{CLAUDE_PLUGIN_ROOT}}/scripts/gate-{phase['id']}.sh\""})
        if hook_entries:
            files[f"{base}/hooks/hooks.json"] = json.dumps(
                {"description": f"{HEADER} Gates aus plugin-compiler/src (Regeln mit enforce: hook).",
                 "hooks": {"UserPromptSubmit": [{"hooks": hook_entries}]}}, ensure_ascii=False, indent=2) + "\n"
        for cmd in plugin["commands"]:
            cmd_fm = {"description": f"Zeigt den Ablauf von {plugin['name']}: Etappen, Befehle, Artefakte und Gates."}
            files[f"{base}/commands/{cmd}.md"] = env.get_template(f"commands/{cmd}.md.j2").render(
                frontmatter=frontmatter(cmd_fm), plugin=plugin, phases=plugin["phases"], header=HEADER)
        files[f"{base}/README.md"] = env.get_template("readme.md.j2").render(
            plugin=plugin, phases=plugin["phases"], header=HEADER, marketplace=MARKETPLACE,
            rule_count_core=plugin["rule_count_core"], rule_count_plugin=plugin["rule_count_plugin"])
    files[".claude-plugin/marketplace.json"] = json.dumps({
        "name": MARKETPLACE,
        "owner": {"name": OWNER},
        "metadata": {"description": f"{HEADER} Prototyp aus plugin-compiler/src: forge und angular aus einer Quelle der Wahrheit."},
        "plugins": [{"name": p["name"], "source": f"./{p['name']}", "description": p["description"], "version": p["version"]}
                    for p in plugins],
    }, ensure_ascii=False, indent=2) + "\n"
    # Mehrfache Leerzeilen glätten, damit die Ausgabe stabil und lesbar bleibt.
    return {path: (re.sub(r"\n{3,}", "\n\n", text) if path.endswith(".md") else text) for path, text in files.items()}


# ---------------------------------------------------------------------------------------------------------------------
# 5. Linten


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
    return yaml.safe_load(text[4:end]), text[end + 5:]


def lint_identity(path: str, fm: dict, report: Report) -> None:
    name, desc = str(fm.get("name", "")), str(fm.get("description", ""))
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
    if desc.startswith("Use "):
        report.error(path, 3, "description beginnt mit „Use …“; erst eine Aussage in dritter Person, dann „Use when …“")
    if PRONOUN_RE.search(desc):
        report.error(path, 3, f"description nicht in dritter Person: „{PRONOUN_RE.search(desc).group(0)}“")
    first = desc.split()[0] if desc.split() else ""
    if first and not first.endswith("s"):
        report.error(path, 3, f"description: erstes Verb „{first}“ ist nicht dritte Person Singular")


def lint(files: dict, plugins: list, m: Model, report: Report) -> None:
    for path, text in sorted(files.items()):
        lines = text.split("\n")
        if path.endswith(".json"):
            if path.endswith("plugin.json"):
                continue  # plugin.json hat kein freies Feld für die Kopfzeile, siehe TEST.md
            if HEADER not in text:
                report.error(path, 1, "Kopfzeile „GENERIERT - nicht editieren“ fehlt")
            continue
        if HEADER not in "\n".join(lines[:12]):
            report.error(path, 1, "Kopfzeile „GENERIERT - nicht editieren“ fehlt in den ersten Zeilen")
        for i, row in enumerate(lines, 1):
            caps = CAPS_RE.search(row)
            if caps and not REASON_RE.search(row):
                report.error(path, i, f"„{caps.group(1)}“ in Großbuchstaben ohne Begründung in derselben Zeile")
            if not path.endswith(".sh"):
                for word, owner in m.avoid.items():
                    if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", row):
                        report.error(path, i, f"„{word}“ ist laut Glossar zu vermeiden; Begriff: „{owner}“")
            if not path.endswith(".sh") and TERM_RE.search(row):
                report.error(path, i, "Begriffs-Markup [[…]] nicht aufgelöst")
        if path.endswith("SKILL.md"):
            if len(lines) >= SKILL_MAX_LINES:
                report.error(path, len(lines), f"SKILL.md hat {len(lines)} Zeilen, erlaubt sind unter {SKILL_MAX_LINES}")
            fm, _ = split_frontmatter(text)
            if fm is None:
                report.error(path, 1, "Frontmatter fehlt")
                continue
            lint_identity(path, fm, report)
            if fm.get("disable-model-invocation") is not True:
                report.error(path, 1, "disable-model-invocation: true fehlt")
            skill_dir = path.rsplit("/", 1)[0]
            for i, row in enumerate(lines, 1):
                for target in LINK_RE.findall(row):
                    if "://" in target:
                        continue
                    if f"{skill_dir}/{target}" not in files:
                        report.error(path, i, f"Verweis auf {target}, die Datei wird nicht erzeugt")
                    if target.count("/") > 1:
                        report.error(path, i, f"Verweis {target} ist tiefer als eine Ebene")
        if "/references/" in path:
            for i, row in enumerate(lines, 1):
                for target in LINK_RE.findall(row):
                    if "://" not in target and target.endswith(".md"):
                        report.error(path, i, f"Referenz verweist weiter auf {target}; erlaubt ist nur eine Ebene")
        if "/agents/" in path:
            fm, _ = split_frontmatter(text)
            lint_identity(path, fm or {}, report)
            tools = {t.strip() for t in str((fm or {}).get("tools", "")).split(",")}
            if not tools <= {"Read", "Grep", "Glob"}:
                report.error(path, 4, f"Reviewer mit schreibenden Werkzeugen: {sorted(tools - {'Read', 'Grep', 'Glob'})}")
    # Beispiele nur in references/, nicht im Skill-Body
    for plugin in plugins:
        for phase in plugin["phases"]:
            body = files[f"{plugin['name']}/skills/{phase['id']}/SKILL.md"]
            for ex in phase["examples"]:
                probe = next((ln for ln in ex["body"].split("\n") if len(ln.strip()) > 20), ex["body"][:40])
                if probe.strip() and probe.strip() in body:
                    report.error(f"{plugin['name']}/skills/{phase['id']}/SKILL.md", 1,
                                 f"Beispiel „{ex['title']}“ steht im Skill-Body; Beispiele gehören nach references/")
    report.stop_if_errors("Lint")


# ---------------------------------------------------------------------------------------------------------------------
# 6. Schreiben


def write(files: dict) -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    for path, text in sorted(files.items()):
        target = DIST / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8", newline="\n")
        if path.endswith(".sh"):
            target.chmod(0o755)


def main() -> int:
    report = Report()
    m = load(report)
    report.stop_if_errors("Laden")
    check(m, report)
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(SRC / "templates"), undefined=jinja2.StrictUndefined,
                             keep_trailing_newline=True, trim_blocks=True, lstrip_blocks=True, autoescape=False)
    plugins = resolve(m, env)
    files = render_all(plugins, m, env)
    lint(files, plugins, m, report)
    write(files)
    for w in sorted(report.warnings, key=lambda p: (p.file, p.line)):
        print(f"WARNUNG {w}")
    shared = {r["id"] for p in plugins for ph in p["phases"] for r in ph["rules"] if not r["plugin"]}
    print(f"build: {len(files)} Dateien nach {rel(DIST)}/ geschrieben; {len(plugins)} Plugins, "
          f"{len(shared)} geteilte Regeln, {sum(p['rule_count_plugin'] for p in plugins)} plugin-spezifische, "
          f"{len(report.warnings)} Warnungen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
