---
name: grill-me
description: >
  Befragt eine Story- oder Plan-Datei relentless bis alle Entscheidungszweige aufgeloest sind —
  eine Frage auf einmal, jede mit Empfehlung. Trigger: grill mich, befrage diese Story,
  schaerf den Plan, hinterfrage den Plan, welche Fragen hast du zu dieser Story,
  durchleuchte die Story, was ist noch unklar, /grill-me.
  Einsatz A: nach requirement-definition vor feature-delivery — Story-Entscheidungen vorab klaeren.
  Einsatz B: in feature-delivery vor Implementierung — Plan interaktiv schaerfen.
  Argument optional: /grill-me <pfad/zur/story.md> oder /grill-me <pfad/zum/plan.md>.
  Ohne Argument: zuletzt besprochene Story/Plan nehmen.
  Nicht fuer AC-Testbarkeit (→ acceptance-design). Nicht als Ersatz fuer requirement-definition.
when_to_use: >
  Wenn eine Story oder ein Plan offene Entscheidungszweige hat, die vor Planung oder
  Implementierung interaktiv aufgeloest werden sollen. Typische Signale: Story hat vage
  Formulierungen ("irgendwie", "aehnlich wie"), technischer Approach noch nicht entschieden,
  Scope-Grenzen unklar, Edge-Cases nicht bedacht. Nicht bei: reiner Anforderungserfassung
  (→ requirement-definition), AC-Qualitaetsaudit (→ acceptance-design).
---

# grill-me

Interaktives Verhoer einer Story oder eines Plans — eine Frage auf einmal, bis jeder
Entscheidungszweig aufgeloest ist. Ergebnis: alle Designentscheidungen sind getroffen,
bevor `feature-delivery` den Plan schreibt.

---

## Eiserne Regel

**Eine Frage pro Nachricht. Immer. Keine Ausnahmen.**

Mehrere Fragen gleichzeitig ueberwältigen. Eine Frage + eine Empfehlung = ein klarer Entscheid.

---

## Phase 1 — Ziel laden und Entscheidungsbaum aufbauen

1. **Datei einlesen** — Story (`requests/**/*.md`) oder Plan-Datei.
   - Kein Argument: letzte besprochene Story / aktuellen Kontext nehmen.

2. **Codebase-Kontext holen** — MCP-First, blockierend:

   > **Blocking-Regel:** Bevor eine Frage gestellt wird, die durch Lesen von vorhandenem Code
   > beantwortet werden kann, MUSS der Code gelesen werden. Fragen an den Nutzer sind nur für
   > Entscheidungen erlaubt, die nicht aus dem Code ableitbar sind.

   ```
   dev-mcp: find_file, read_class_summary, read_method, find_by_content
   → Bestehende Implementierungen finden bevor nach Ansatz gefragt wird
   ```
   Wenn etwas bereits existiert: nicht fragen, sondern zeigen — „hier ist die bestehende
   Implementierung in `FooService.cs` — sollen wir das erweitern oder neu?"

   **Falsch:** „Ist der Copy-Button bereits gesperrt?"
   **Richtig:** `action-cell-renderer.component.ts` lesen → dann zeigen was der Stand ist.

3. **Entscheidungsbaum intern aufbauen** — nicht zeigen, nur priorisieren:
   - Blocking-Entscheidungen (andere haengen davon ab) → zuerst
   - Irreversible Entscheidungen (schwer rueckgaengig) → vor optionalen
   - Scope-Grenzen → vor technischen Details
   - Edge-Cases → zum Schluss

---

## Phase 2 — Sequenzielles Grilling

Pro Runde:

```
1. Stelle eine praezise Frage
2. Gib sofort eine Empfehlung: deine bevorzugte Option + 1-Satz-Begruendung
3. Warte auf Feedback
4. Update den internen Entscheidungsbaum:
   - Welche Folgefragen wurden durch die Antwort erledigt?
   - Welche neuen Fragen entstanden?
5. Naechste Blocking-Frage
```

**Fragetypen mit Beispielen:**

| Typ | Beispiel |
|-----|---------|
| Scope | „Gehoert das Loeschen von X in diese Story oder in die naechste? Ich empfehle: out of scope — haelt die Story klein und lieferbar." |
| Technischer Ansatz | „Nutzen wir fuer Y das Command-Pattern oder einen direkten Service-Call? Ich empfehle: Command-Pattern — konsistent mit `OrderCommand.cs`." |
| Bestehendes vs. neu | „`CustomerRepository` hat bereits eine `FindByEmail`-Methode. Erweitern oder eigene Query? Ich empfehle: erweitern." |
| Edge-Case | „Was passiert wenn Z null ist — silent ignore oder Validation-Error? Ich empfehle: Validation-Error — explizit ist besser." |
| Abhaengigkeit | „Brauchen wir fuer diesen Flow einen neuen Endpoint oder koennen wir den bestehenden `/api/foo` nutzen? Pruefe zuerst…" |

**Wenn eine Frage durch Codebase-Kontext beantwortet werden kann:**
→ Nicht fragen — lesen und Ergebnis in die Empfehlung einbetten.
→ „Ich habe `BarService.cs` gelesen — dort ist bereits X implementiert. Wir koennen direkt darauf aufbauen. Einverstanden?"

---

## Phase 3 — Abschluss

Wenn alle Entscheidungszweige aufgeloest sind:

**Entscheidungs-Zusammenfassung** als kompakte Liste:

```
Entscheidungen fuer <Story-Name>:
- Scope: X ist in, Y ist out
- Ansatz: Command-Pattern via XCommand
- Edge-Case Z: Validation-Error zurueckgeben
- Bestehender Code: CustomerRepository.FindByEmail erweitern
- …
```

**Naechster Schritt** — immer explizit nennen:
- „Story ist entscheidungsreif → `/feature-delivery plane <story.md>`"
- Oder: „Plan ist schaerfungsreif → `/feature-delivery setze plan X um`"
