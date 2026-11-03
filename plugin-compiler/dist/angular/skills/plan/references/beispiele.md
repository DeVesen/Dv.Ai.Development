<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/plan.yaml (examples) -->

# Beispiele: Plan

## Absicherungstest für ein AC ohne Code-Änderung

Quelle: forge/skills/plan-writing/references/plan-format.md

```markdown
- [ ] **Schritt 1: Absicherungstest schreiben oder bestehenden nennen**
  <vollständiger Testcode oder Testname>
- [ ] **Schritt 2: Absicherungstest laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS `<testname>`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Commit** (entfällt, wenn nur ein bestehender Test lief)
```
## Rote Flaggen beim Planen

Quelle: forge/skills/plan-writing/SKILL.md (Rote Flaggen)

| Gedanke | Stattdessen |
|---|---|
| „Ein kurzer Plan ohne Code reicht.“ | Der Umsetzer hat null Kontext. Jeder Code-Schritt enthält vollständigen Code. |
| „Der alte Plan zum Thema hilft.“ | Andere Specs und Pläne liest du nie; sie lenken einen Neuanlauf. |
| „Wie Task 3, nur anders.“ | Code wiederholen; Tasks werden womöglich außer der Reihe gelesen. |
| „Tests kommen am Ende.“ | Jeder Task beginnt mit einem fehlschlagenden Test. |
| „Zeilennummern reichen.“ | `Modify` braucht einen stabilen Anker. |
