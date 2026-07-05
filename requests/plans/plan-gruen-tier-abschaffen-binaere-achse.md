# Plan: STORY-006 · ⑥ 🟢 abgeschafft — Tier-Achse binär 🔴/🟡

## Metadaten

- Story: STORY-006
- Slug: gruen-tier-abschaffen-binaere-achse
- Art: Harness-Artefakt-Änderung (Markdown-only, kein Code, kein Build-Tool)
- Stack-Klassifikation: `md-only` → 3 Reviewer: risk · guard · readiness

## Überblick

Die dreistufige Tier-Achse (🔴/🟡/🟢) wird binär: nur noch 🔴 + 🟡.
Alle 🟢-Tier-Definitionen, -Zähler, -Fluchttüren und Rückgabe-Kurzformen in den 4 Zieldateien
werden entfernt. §8.3-Positiv-Blöcke (PRESERVE-Liste, Ship-/AC-Map, AC-Map) bleiben
**VOLLSTÄNDIG erhalten** — Negativ-Guard-AC.

---

## Akzeptanz→Test-Mapping (F1)

| AC-ID | Prüfschritt | Erwartetes Ergebnis |
|-------|-------------|---------------------|
| `TierAchse_IstBinaer_RotGelb` | Grep `🟢` in §2-Tabelle (reviewer-gate-canon.md) + Tier-Klassifikation-Tabelle (secondbrain-schema.md) | Nur 🔴 und 🟡 definiert; kein 🟢-Tier-Eintrag |
| `Tripwire_PraeferenzOhneFolge_ErzeugtKeinFinding` | §3-Text in reviewer-gate-canon.md lesen | Kein „→ 🟢"; stattdessen „→ kein Finding" / „nicht aufführen" |
| `MindestMengen_CraftUndAuditor_Gestrichen` | Grep `≥3`, `≥5`, `Mindest` in allen 4 Zieldateien | 0 Treffer (Hinweis: craft ≥3 / auditor ≥5 befinden sich in Agent-Profilen außerhalb Story-Scope → AC gilt als erfüllt für diese 4 Dateien) |
| `SecondbrainTierZaehler_OhneGruen` | Grep `Tier 🟢 offen` in secondbrain-schema.md | 0 Treffer; keine 🟢-Spalte in Runden-Historie-Tabelle |
| `PositivBloecke_§8.3_BleibenErhalten` | §8.3-Block in reviewer-gate-canon.md lesen (Punkt 3 + Punkt 5 des §8-Abschnitts) | PRESERVE-Block-Carve-out und Ship-/AC-Map-Carve-out vollständig erhalten |

---

## Umsetzungs-Topologie

Alle 4 Slices in **Welle W1 parallel** — keine gegenseitigen Abhängigkeiten (jeder Slice bearbeitet
eine andere Datei). Kein Stack-weiter Build/Test-Schritt.

| IMP-Slice | Datei | Welle |
|-----------|-------|-------|
| IMP-CANON | `.claude/skills/feature-delivery/references/reviewer-gate-canon.md` | W1 |
| IMP-SCHEMA | `.claude/skills/feature-delivery/references/secondbrain-schema.md` | W1 |
| IMP-PROMPTS | `.claude/skills/feature-delivery/references/subagent-prompts.md` | W1 |
| IMP-FLOW | `.claude/skills/feature-delivery/flows/implementation-flow.md` | W1 |

---

## IMP-CANON — reviewer-gate-canon.md

### Ziel
- §2-Tabelle: 🟢-Zeile entfernen
- Hoheit-Block: `🔴/🟡/🟢` → `🔴/🟡`
- §3-Tripwire: Outcome „→ 🟢" → „→ kein Finding"
- §4-Design-Prinzipien: Tripwire-Outcome `= 🟢` → `= kein Finding`
- §5-YAGNI: „höchstens 🟢-Notiz" → „nicht melden"
- §7-Ein Durchlauf: „🟢-only" → „nicht gemeldet"
- §8 Ausgabeformat: `🔴/🟡/🟢` → `🔴/🟡` (inkl. Erläuterungszeile)
- §8.3-Positiv-Blöcke: **UNANGETASTET** (Guard-AC)

### Konkrete Änderungen

**Stelle C1 — Hoheit-Block (ca. Zeile 19)**

Alt:
```
> Deine `🔴/🟡/🟢` sind **Vorschläge**, deine `CLEAN/BLOCKED`-Zeile ist eine
```
Neu:
```
> Deine `🔴/🟡` sind **Vorschläge**, deine `CLEAN/BLOCKED`-Zeile ist eine
```

**Stelle C2 — §2-Tabelle: 🟢-Zeile (ca. Zeile 43)**

Alt — die Zeile:
```
| 🟢 **Minor** | Reine Präferenz/Politur | notieren, blockt nie |
```
Neu: diese Zeile entfernen (Tabelle hat danach nur 2 Datenzeilen: 🔴 + 🟡).

**Stelle C3 — §3-Tripwire: Outcome (ca. Zeile 49)**

Alt:
```
→ das Finding ist **per Definition 🟢**. Nicht auf 🔴/🟡 heben, keinen Rewrite vorschlagen.
```
Neu:
```
→ **kein Finding** — nicht aufführen.
```

**Stelle C4 — §4-Design-Prinzipien: Tripwire-Verweis (ca. Zeile 65)**

Alt:
```
  → **Tripwire (§3)**: ohne benennbare Folge = 🟢.
```
Neu:
```
  → **Tripwire (§3)**: ohne benennbare Folge = **kein Finding** (nicht aufführen).
```

**Stelle C5 — §5-YAGNI: 🟢-Notiz (ca. Zeile 73)**

Alt:
```
→ nie 🔴 (höchstens 🟢-Notiz). Berührt der Diff die Stelle und ist sie jetzt falsch → 🔴 (§2).
```
Neu:
```
→ nie 🔴 — nicht melden. Berührt der Diff die Stelle und ist sie jetzt falsch → 🔴 (§2).
```

**Stelle C6 — §7-Ein Durchlauf: 🟢-only (ca. Zeile 93)**

Alt:
```
Nur neue **nicht-🔴** Beobachtungen bleiben 🟢-only und gehen nie in die Schleife.
```
Neu:
```
Nur neue **nicht-🔴** Beobachtungen werden nicht gemeldet — sie gehen nicht in die Schleife.
```

**Stelle C7 — §8 Ausgabeformat: Tier-Spalten-Beschreibung (ca. Zeilen 105–107)**

Alt (erste Zeile):
```
   **Eine Tier-Achse.** Spalte `Tier-Vorschlag` trägt genau **🔴/🟡/🟢** — kein zweites
```
Neu:
```
   **Eine Tier-Achse.** Spalte `Tier-Vorschlag` trägt genau **🔴/🟡** — kein zweites
```

Danach in derselben Passage die Erläuterungszeile (ca. gleiche Zeilen):

Alt:
```
   Die Linse ist über den
   Dateinamen `finding-{{LINSE}}.md` fixiert — keine eigene Spalte.
```
*(Suche im vollständigen Absatz nach `🔴 blockt · 🟡 begründungspflichtig · 🟢 frei`)*

Alt-Muster:
```
🔴 blockt · 🟡 begründungspflichtig · 🟢 frei — **Vorschlag** des Reviewers, nicht bindend.
```
Neu:
```
🔴 blockt · 🟡 begründungspflichtig — **Vorschlag** des Reviewers, nicht bindend.
```

**Stelle C8 — §8.3 (Punkte 3 + 5 des §8-Abschnitts) — KEIN EDIT (Guard-AC)**

Folgende Punkte müssen nach dem Edit textidentisch wie vor dem Edit sein:
- Punkt 3: `**Lens-mandatierte Positiv-Ausgaben** (PRESERVE-Liste · Ship-/Go-No-Go-Entscheid...)`
- Punkt 5: `Sonst keine Strengths-Prosa, keine Empfehlungen jenseits der Findings + des Positiv-Blocks (§8.3).`

---

## IMP-SCHEMA — secondbrain-schema.md

### Ziel
- Verdikt-Kurzform-Tabelle: 🟢-Zähler aus design-principles entfernen
- secondbrain-index.md-Format: `Tier 🟢 offen`-Zeile entfernen
- Runden-Historie-Tabelle: 🟢-Spalte entfernen
- Digest Roll-up: `🟢 <n>` entfernen
- finding-\<reviewer\>.md Tier-Vorschlag-Beschreibung: 🟢-Referenzen entfernen
- Tier-Klassifikation-Section: 🟢-Zeile aus Tabelle + Einstufungsregel 4 entfernen + Texte anpassen
- pm-verdict-N.md Format: `🟢:<n>` aus Basis-Zeile entfernen
- Aggregat-Regel: `🟡/🟢` → `🟡`

### Konkrete Änderungen

**Stelle S1 — Verdikt-Kurzform-Tabelle: design-principles (ca. Zeile 83)**

Alt:
```
| design-principles | `finding-design-principles.md · 🔴:<n> 🟡:<n> 🟢:<n>` |
```
Neu:
```
| design-principles | `finding-design-principles.md · 🔴:<n> 🟡:<n>` |
```

**Stelle S2 — secondbrain-index.md Format: Tier-Zähler-Block (ca. Zeilen 227–229)**

Alt (3 Zeilen im Code-Block):
```
- Tier 🔴 offen: <n>   — blockt Inner-Exit; ein offenes 🔴 → nächste Runde Pflicht
- Tier 🟡 offen: <n>   — begründungspflichtig (Erbsenzählerei-Wave nur mit Begründung je Finding im pm-verdict-N.md)
- Tier 🟢 offen: <n>   — frei durchwinkbar
```
Neu (2 Zeilen): `Tier 🟢 offen`-Zeile entfernen.

**Stelle S3 — Runden-Historie-Tabelle: 🟢-Spalte (ca. Zeilen 232–237)**

Alt:
```
| Iteration | Runde | Reviewer | Fixable | 🔴 | 🟡 | 🟢 | Digest | Status |
|-----------|-------|----------|---------|----|----|----|--------|--------|
| 1 | 1 | 7 | 3 | 2 | 1 | 0 | …/digest.md | fix-loop |
| 1 | 2 | 7 | 0 | 0 | 1 | 2 | …/digest.md | Erbsenzählerei-Exit |
| 2 | 5 | 7 | 1 | 1 | 0 | 0 | …/digest.md | Hard-Stop (Cap, 🔴 offen → User-Eskalation, NICHT implemented) |
```
Neu: 🟢-Spalte (Header + alle Datenzellen) entfernen — Tabelle hat danach 8 statt 9 Spalten.

**Stelle S4 — Digest Roll-up Format (ca. Zeile 178)**

Alt:
```
- Autoritative Tiers: 🔴 <n> · 🟡 <n> · 🟢 <n>   ← identisch mit den Index-Zählern
```
Neu:
```
- Autoritative Tiers: 🔴 <n> · 🟡 <n>   ← identisch mit den Index-Zählern
```

**Stelle S5 — Digest-Abschnitt: Finding-Zeilen-Beschreibung (ca. Zeile 197)**

Alt:
```
Jede Finding-Zeile trägt das **autoritative** Tier-Symbol (🔴/🟡/🟢) als erstes Zeichen.
```
Neu:
```
Jede Finding-Zeile trägt das **autoritative** Tier-Symbol (🔴/🟡) als erstes Zeichen.
```

**Stelle S6 — finding-\<reviewer\>.md Tier-Vorschlag-Spalte (ca. Zeile 120)**

Alt (im Tabellen-Zeilen-Beschreibungsblock):
```
| **Tier-Vorschlag** | Genau **🔴/🟡/🟢** — eine Achse, kein zweites Severity-Vokabular (`[KRITISCH]/[WESENTLICH]/[FORMAL]`, `BLOCKING/RISK` u. ä. entfallen). 🔴 blockt · 🟡 begründungspflichtig · 🟢 frei — **Vorschlag** des Reviewers, nicht bindend. ...
```
Neu — zwei Stellen in dieser Zeile:
- `🔴/🟡/🟢` → `🔴/🟡`
- `🔴 blockt · 🟡 begründungspflichtig · 🟢 frei —` → `🔴 blockt · 🟡 begründungspflichtig —`

**Stelle S7 — Tier-Klassifikation-Tabelle: 🟢-Zeile entfernen (ca. Zeile 257)**

Alt (3 Zeilen):
```
| 🔴 | Blockierend... | Blockt den Inner-Exit. ... |
| 🟡 | Begründungspflichtig... | Darf nur mit schriftlicher Begründung... |
| 🟢 | Frei — kosmetisch, kein Verhaltens-/Vertragseinfluss | Frei durchwinkbar, keine Begründung nötig. |
```
Neu: 🟢-Zeile entfernen.

**Stelle S8 — Einstufungsregeln: Regel 4 (ca. Zeile 269)**

Alt:
```
4. **Kosmetisch → 🟢.** Namens-/Kommentar-Nuancen, reine Präferenz ohne Verhaltensbezug.
```
Neu: diese Zeile entfernen.

**Stelle S9 — PM-Hochstufung Text (ca. Zeilen 271–273)**

Alt:
```
**PM-Hochstufung (sichere Richtung):** Die PL-Tiers sind autoritativ, aber der PM darf ein Finding
**verschärfen**, nie abschwächen: ein 🟢, das er für begründungspflichtig hält → als 🟡 behandeln
(Begründung) oder fixen; ein 🟡/🟢, das er für blockierend hält → `fix`. So wird eine PL-Unter-Einstufung
```
Neu:
```
**PM-Hochstufung (sichere Richtung):** Die PL-Tiers sind autoritativ, aber der PM darf ein Finding
**verschärfen**, nie abschwächen: ein 🟡, das er für blockierend hält → `fix`. So wird eine PL-Unter-Einstufung
```
*(🟢-Hochstufungs-Zweig entfällt; Kernaussage bleibt: Hochstufen erlaubt, Abschwächen verboten)*

**Stelle S10 — Aggregat-Regel: `🟡/🟢` → `🟡` (ca. Zeilen 278–280)**

Alt:
```
`Tier 🔴 offen == 0` ⇒ Inner-Exit möglich, entweder als `clean` (auch 🟡/🟢 == 0) oder als **Erbsenzählerei-Exit** (🟡/🟢 offen, jedes offene 🟡 im `pm-verdict-N.md` begründet).
```
Neu:
```
`Tier 🔴 offen == 0` ⇒ Inner-Exit möglich, entweder als `clean` (auch 🟡 == 0) oder als **Erbsenzählerei-Exit** (🟡 offen, jedes offene 🟡 im `pm-verdict-N.md` begründet).
```

**Stelle S11 — pm-verdict-N.md Format: Basis-Zeile (ca. Zeile 311)**

Alt:
```
- Basis: Index-Tier-Zähler 🔴:<n> 🟡:<n> 🟢:<n> (aus secondbrain-index.md gelesen)
```
Neu:
```
- Basis: Index-Tier-Zähler 🔴:<n> 🟡:<n> (aus secondbrain-index.md gelesen)
```

---

## IMP-PROMPTS — subagent-prompts.md

### Ziel
- Einstufungs-Kanon-Header: `🔴/🟡/🟢-Einstufung` → `🔴/🟡-Einstufung`
- PM-Supervisor-Prompt: `Tier-Zähler Tier 🔴/🟡/🟢 offen` → `🔴/🟡 offen`
- Review-Digest-Template + Abschlussformat: nach verbleibenden 🟢-Referenzen prüfen und entfernen

### Konkrete Änderungen

**Stelle P1 — Einstufungs-Kanon Header (ca. Zeile 17)**

Alt:
```
Beleg-Pflicht, 🔴/🟡/🟢-Einstufung nach Konsequenz, Präferenz-Tripwire, Ausgabe-Format.
```
Neu:
```
Beleg-Pflicht, 🔴/🟡-Einstufung nach Konsequenz, Präferenz-Tripwire, Ausgabe-Format.
```

**Stelle P2 — PM-Supervisor-Prompt: Index-Pointer (ca. Zeile 141)**

Alt:
```
Index-Pointer:[requests/plans/<feature>/secondbrain-index.md]  (inkl. Tier-Zähler Tier 🔴/🟡/🟢 offen)
```
Neu:
```
Index-Pointer:[requests/plans/<feature>/secondbrain-index.md]  (inkl. Tier-Zähler Tier 🔴/🟡 offen)
```

**Stelle P3 — Review-Digest-Template: Scan**

Im Review-Digest-Template (ca. Zeilen 459–488) alle 🟢-Vorkommen prüfen:
- Falls `- 🟢 Punkt ...` in einer Section vorkommt: diese Zeile entfernen
- Falls `🔴/🟡/🟢` als Triplet vorkommt: auf `🔴/🟡` kürzen

**Stelle P4 — Abschlussformat: Scan**

Im Abschlussformat (ca. Zeilen 492–528) alle 🟢-Vorkommen prüfen und entfernen. Wenn keine vorhanden: kein Edit.

---

## IMP-FLOW — implementation-flow.md

### Ziel
- 3-Tier-Tabelle (§ Erbsenzählerei-Klassifikation): 🟢-Zeile entfernen
- Gewaltenteilung-Text: `🔴/🟡/🟢 offen` → `🔴/🟡 offen`
- PM-Urteil: `clean` = `🟡/🟢 == 0` → `🟡 == 0`; `erbsenzaehlerei-exit` `🟡/🟢` → `🟡`
- 3.9 Abbruchbedingung: alle `🟡/🟢`-Kombinationen bereinigen
- Digest-Format-Referenz: `🔴/🟡/🟢`-Triplet → `🔴/🟡`
- secondbrain-index-Referenz: `Tier 🟢 offen` entfernen falls vorhanden

### Konkrete Änderungen

**Stelle F1 — 3-Tier-Tabelle Erbsenzählerei-Klassifikation (ca. Zeilen 388–391)**

Alt (3 Zeilen):
```
| 🔴 | Blockierend — Correctness-Bug, fehlender AC-Test, Contract-Drift, Regression, **Security-`critical`** | Blockt den Exit. **Ein offenes 🔴 → nächste Runde Pflicht.** |
| 🟡 | Begründungspflichtig — behebbar, Wave vertretbar | Wave nur mit **schriftlicher Begründung je Finding** im `outer/pm-verdict-N.md`. |
| 🟢 | Frei — kosmetisch | Frei durchwinkbar. |
```
Neu: 🟢-Zeile entfernen.

**Stelle F2 — Gewaltenteilung (ca. Zeile 394)**

Alt:
```
... und schreibt die offenen Zähler `Tier 🔴/🟡/🟢 offen` in den Index.
```
Neu:
```
... und schreibt die offenen Zähler `Tier 🔴/🟡 offen` in den Index.
```

**Stelle F3 — PM-Urteil: clean-Definition (ca. Zeile 431)**

Alt:
```
- `clean` — `Tier 🔴/🟡/🟢 offen` alle 0, Gates gruen, ACs adressiert → Inner-Loop schließbar.
```
Neu:
```
- `clean` — `Tier 🔴/🟡 offen` alle 0, Gates gruen, ACs adressiert → Inner-Loop schließbar.
```

**Stelle F4 — PM-Urteil: erbsenzaehlerei-exit (ca. Zeile 432)**

Alt:
```
- `erbsenzaehlerei-exit` — `Tier 🔴 offen == 0`, aber ≥1 🟡/🟢 offen; Restfindings keiner Runde wert → Inner-Loop schließbar. **Pflicht:** je offenes 🟡 eine schriftliche Begründung im `outer/pm-verdict-N.md`.
```
Neu:
```
- `erbsenzaehlerei-exit` — `Tier 🔴 offen == 0`, aber ≥1 🟡 offen; Restfindings keiner Runde wert → Inner-Loop schließbar. **Pflicht:** je offenes 🟡 eine schriftliche Begründung im `outer/pm-verdict-N.md`.
```

**Stelle F5 — 3.9 Abbruchbedingung Sauber-Exit (ca. Zeile 452)**

Alt:
```
clean / erbsenzaehlerei-exit → TIER-GUARD (reine Zähler-Arithmetik):
      `Tier 🔴 offen == 0`?  ja  → Inner-Close autorisiert → PM wird TERMINAL-PM
                             nein (🔴 > 0) → Exit ZURÜCKGEWIESEN → current_round++ → neue Runde (deterministisch, kein Urteil)
      erbsenzaehlerei-exit zusätzlich: sind im pm-verdict-N.md je offenes 🟡 Begründungen? nein → wie `fix` behandeln
```
*(keine 🟢-Referenz in diesem Block → kein Edit nötig, bereits korrekt formuliert)*

**Stelle F6 — 3.9.1 Sauber-Exit Langform (ca. Zeile 452 im Markdown-Fließtext außerhalb Code)**

Alt:
```
clean / erbsenzaehlerei-exit → MECHANISCHER TIER-GUARD (Schritt 5a), dann ggf. Terminal-Span (Schritt 5b).
```
*(kein 🟢 → kein Edit)*

**Stelle F7 — Früher-Abbruch-Beschreibung (ca. Zeile 371)**

Alt:
```
**Frueherer Abbruch:** PM urteilt `clean` **oder** `erbsenzaehlerei-exit` (nach bestandenem Tier-Guard, `Tier 🔴 offen == 0`) → Inner-Loop sofort schließen → Terminal-PM.
```
*(kein 🟢 → kein Edit)*

**Stelle F8 — 3.4 PM-Urteil Langform (ca. Zeile 431)**

Alt (bei `erbsenzaehlerei-exit`-Beschreibung, im Detail):
Suche nach `🟡/🟢 offen` oder ähnlichen Kombinationen in diesem Abschnitt → alle auf `🟡` kürzen.

**Stelle F9 — Tier-Guard Sektion (ca. Zeilen 248–252 in implementation-flow.md)**

Alt:
```
        clean / erbsenzaehlerei-exit → TIER-GUARD (reine Zähler-Arithmetik):
              `Tier 🔴 offen == 0`?  ja  → Inner-Close autorisiert → PM wird TERMINAL-PM
                                     nein (🔴 > 0) → Exit ZURÜCKGEWIESEN → current_round++ → neue Runde (deterministisch, kein Urteil)
              erbsenzaehlerei-exit zusätzlich: outer/pm-verdict-N.md prüfen — je offenes 🟡 eine Begründung?
                              fehlt eine  → nicht konform → wie fix behandeln.
              🔴 offen == 0 (und 🟡-Begründungen vollständig) → Inner-Close AUTORISIERT → Schritt 5b.
```
*(kein 🟢 → kein Edit)*

**Stelle F10 — Digest-Format-Referenz in Rollen-Tabelle (ca. Zeile 236)**

Alt:
```
   (kein Report-Body im PL-Return; autoritative Tiers 🔴/🟡/🟢 vergeben; secondbrain-index.md aktualisieren: current_round=M, Cap M/5, Zähler + Tier-Zähler)
```
Neu:
```
   (kein Report-Body im PL-Return; autoritative Tiers 🔴/🟡 vergeben; secondbrain-index.md aktualisieren: current_round=M, Cap M/5, Zähler + Tier-Zähler)
```

**Stelle F11 — Rollen-Tabelle Spalte „Tier-Guard" (ca. Zeile 115)**

Alt:
```
| **Session-Treiber** | Treiber: Hard Gate, Rundenzähler, Max-5-Cap, **mechanischer Tier-Guard** (weist Exit bei offenem 🔴 zurück), Closure, Story-Status | — (die aufrufende Session, kein Agent-Profil) | ...
```
*(kein 🟢 → kein Edit)*

**Stelle F12 — Vollständiger Scan vor Commit**

Nach den gezielten Edits: Vollständiger Grep nach `🟢` über alle 4 Zieldateien. Jedes verbleibende Vorkommen prüfen:
- Ist es ein §8.3-Positiv-Block-Zeichen? → LASSEN (Guard-AC)
- Ist es eine Tier-Definition / Zähler / Rückgabe-Kurzform? → ENTFERNEN

---

## Scope-Abgrenzung

**NICHT berühren:**
- §8.3-Positiv-Blöcke in reviewer-gate-canon.md (Punkte 3 + 5 im §8-Abschnitt)
  — mandatierte Deliverables, kein Kollateralschaden
- Agent-Profile-Dateien (außerhalb Story-Scope):
  `.claude/agents/implement-review-craft-agent.md` (craft ≥3) und
  `.claude/agents/implement-review-auditor-agent.md` (auditor ≥5)
  → Empfehlung: als Follow-up adressieren (dort liegende Mindest-Mengen
  werden durch Entfall von 🟢 funktional wirkungslos, aber der Text bleibt noch stehen)
- Alle anderen Dateien außerhalb der 4 `touches`
- Die erbsenzaehlerei-exit-Mechanik an sich: bleibt erhalten — nur 🟢 verschwindet,
  🟡-Wave-Logik mit Begründungspflicht bleibt vollständig intakt
- Security-`critical`-Carve-out (§1a): bleibt unverändert

**Kein Build / kein Test-Tool:** md-only. Prüfung per Grep + Text-Check (s. Akzeptanz→Test-Mapping).
