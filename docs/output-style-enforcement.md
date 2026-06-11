# Output-Stil-Enforcement — Designentscheidungen

## Was war das Problem?

Agents produzieren standardmäßig Fließtext und langatmige Prosa — auch wenn Bullets reichen würden. Das kostet Tokens auf beiden Seiten (Ausgabe + Kontext), erzeugt Overhead bei Agent-zu-Agent-Übergaben, und zwingt den Nutzer bei User-sichtbaren Antworten durch unnötige Prosa.

Drei konkrete Schmerzpunkte:

1. **Buddy (compress / repo-check):** Der Nutzer liest diese Ausgaben direkt. Fließtext mit Begründungen statt knapper Bullets kostet Lesezeit.
2. **Agent-zu-Agent-Übergaben:** Scout-Deliverables, Handoff-Prompts und Rückgaben an den Orchestrator enthalten Rollenwiederholungen und Prosa, die der empfangende Agent bereits aus seinem Profil kennt.
3. **Sub-Agent-Outputs (User-sichtbar):** Review-Agents, Implementierungs-Agents schreiben Berichte mit Einleitungssätzen und Zusammenfassungs-Prosa statt direkt auf den Punkt zu kommen.

---

## Leitprinzip

Dasselbe Designprinzip wie in `silent-shortcut-prevention.md`: **Erzwungene Ausgabe statt Verbote.**

Verbote kann ein Modell ignorieren. Der Ansatz hier zwingt das Modell zu einem **Selbstcheck mit definiertem Ausweg**: Bevor du ausgibst, prüfe X. Wenn X nicht erfüllt ist — STOPP mit Fehlermeldung. Kein dritter Weg.

---

## Drei Modi — warum diese Grenzziehung?

### HUMAN-TERSE (Buddy: compress, repo-check, diskussion)

Buddy ist der einzige Agent der direkt mit dem Nutzer spricht. Dieser Kanal hat die strengsten Lesbarkeitsanforderungen: vollständige Wörter (keine Abkürzungen), nur Bullets, keine Begründungen, keine Einleitungssätze. Der Nutzer soll in 10 Sekunden den Stand erfassen können — nicht einen Roman lesen.

### BULLET-TERSE (alle anderen User-sichtbaren Ausgaben)

Orchestratoren und Sub-Agents die dem Nutzer Status-Updates geben, sollen ebenfalls kompakt sein — aber kein so strenges Format wie Buddy braucht. Stichpunkte und Tabellen statt Fließtext reicht.

### MACHINE-DENSE (Agent-zu-Agent)

Übergaben zwischen Agents muss der Nutzer nicht verstehen. Der empfangende Agent kennt seinen eigenen Kontext aus dem Profil — Rollenwiederholungen, Höflichkeitsformeln und Prosa-Einleitungen sind reiner Overhead. MACHINE-DENSE erlaubt Abkürzungen, Key:Value-Format und maximal komprimierte Payloads — Hauptbedingung: verlustfreie Dekodierbarkeit durch den Empfänger-Agent.

---

## Was konkret geändert wurde

### 1. `references/output-style-canon.md` (neu)

Zentrale Definition der drei Modi mit Selbstchecks und Opt-out-Regeln. Referenz-Punkt für alle Agents und Skills — analog zu `agent-compliance.md`.

### 2. `references/agent-compliance.md` (ergänzt)

Neuer Abschnitt `## Ausgabe-Stil` — propagiert BULLET-TERSE + MACHINE-DENSE automatisch an alle Agents die `agent-compliance.md` als Pflichtdokument laden (= alle).

### 3. `references/subagent-delegation-boilerplate.md` (ergänzt)

MACHINE-DENSE-Pflicht in den Boilerplate-Block — gilt automatisch für jeden Agent-zu-Agent-Handoff der die Boilerplate verwendet (= alle Workflow-Handoffs).

### 4. `skills/buddy-agent/SKILL.md` (ergänzt)

Expliziter `## ⚠️ Ausgabe-Stil-Pflicht`-Block mit Selbstcheck-Liste und STOPP-Mechanismus für compress / repo-check / diskussion. plan-prompt auf MACHINE-DENSE hochgestuft.

### 5. `skills/caveman/SKILL.md` (ergänzt)

HUMAN-TERSE und MACHINE-DENSE als benannte formale Modi — damit Agents und Skills darauf zeigen können.

### 6. `skills/planning-workflow/references/subagent-prompts.md` (ergänzt)

MACHINE-DENSE-Header in alle Handoff-Templates + komprimierte Rollen-Preambles.

---

## Warum diese Formulierungen?

Gleiche Logik wie `silent-shortcut-prevention.md`:

1. **Positiver Handlungsauftrag** (prüfe X bevor du tippst)
2. **STOPP + Fehlermeldung** wenn X nicht erfüllt
3. **Kein dritter Weg** — entweder Stilcheck bestanden oder Fehlermeldung

Das Modell hat keine Entscheidungsfreiheit mehr beim "Ob" — nur noch beim "Wie es den Fehler meldet".

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `references/output-style-canon.md` | Neu — zentrale Modaldefinition |
| `references/agent-compliance.md` | Abschnitt `## Ausgabe-Stil` ergänzt |
| `references/subagent-delegation-boilerplate.md` | MACHINE-DENSE Punkt 8 ergänzt |
| `skills/buddy-agent/SKILL.md` | `## ⚠️ Ausgabe-Stil-Pflicht` ergänzt |
| `skills/caveman/SKILL.md` | HUMAN-TERSE + MACHINE-DENSE als Modi ergänzt |
| `skills/planning-workflow/references/subagent-prompts.md` | MACHINE-DENSE-Header + komprimierte Preambles |
