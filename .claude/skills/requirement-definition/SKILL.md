---
name: requirement-definition
description: >
  Wandelt einen rohen Stakeholder-Wunsch in entwicklungsfertige Arbeitspakete: fuehrt durch einen
  Epic → Feature → Story Breakdown mit INVEST-Check, Richard-Lawrence-Splitting und
  Akzeptanzkriterien im F1-Format (test-design-Konvention; Qualitaetskanon:
  acceptance-design/references/pruefkatalog.md). Nutze diesen Skill, sobald jemand eine Anforderung
  erfassen, strukturieren, schneiden oder schaerfen will — auch ohne das Wort "Anforderung". Erzeugt
  persistente, ID-gestempelte Markdown-Dateien unter requests/ und laeuft einen bestaetigungs-
  gesteuerten Refinement-Flow. Bei Unklarheit, ob etwas ein Epic, Feature oder eine Story ist:
  hier starten — der Skill bestimmt das Level.
when_to_use: >
  Trigger (DE): "ich brauche ein Feature fuer …", "ich hab einen Kundenwunsch / eine Anforderung",
  "schneide das in Stories", "wie teile ich diese Story auf", "definier/schaerf die
  Akzeptanzkriterien", "Epic/Feature/Story fuer …", "Anforderung erfassen", "mach daraus
  Arbeitspakete". Trigger (EN): "refine this", "write acceptance criteria", "split this story",
  "break this down into stories". Auch wenn eine bestehende Epic_*/Feature_*/Story_*-Datei zum
  Weiterfuehren uebergeben wird. Abgrenzung: NICHT fuer Implementierung/Planung fertiger Stories
  (→ feature-delivery "plane/implementiere"); der tiefere, standalone AC-Audit ist acceptance-design.
---

# Requirement Definition

Schliesst die Luecke zwischen roher Kundenanforderung und entwicklungsfertigem Arbeitspaket — die
vorgelagerte Stufe vor `feature-delivery`. Fuehrt interaktiv durch **Epic → Feature → Story** und
liefert pro Story eine Akzeptanzliste, die `feature-delivery` direkt uebernehmen kann.

Laeuft **interaktiv im Hauptthread, ohne Sub-Agents** — der Dialog ist das Produkt. (Der
`acceptance-design-agent` wird **nicht** mitten im Gespraech gestartet; er bliebe ein optionaler,
tieferer Audit-Lauf am fertigen Text.)

## Sprachpolitik

- **Skill-Dateien, `description`, Dateinamen, Frontmatter-Keys** → Englisch/ASCII.
- **Artefakt-Inhalt** (`Epic_*`, `Feature_*`, `Story_*`) → **Deutsch** (Business-Doku fuer
  deutschsprachige Stakeholder).
- **Dateiname** = ASCII-Slug (siehe Naming-Regel), **Status-Werte** `offen | final` deutsch.

## Trigger & Einstiegspunkte

Primaerer Ausloeser ist die `description` (Auto-Trigger). Die explizite Form
`/requirement-definition <LEVEL>? "<Text>" | <Pfad.md>` bleibt als bequemes Sugar.

| Einstieg | Wann | Was passiert |
|----------|------|--------------|
| **Epic** | Grober Wunsch, ein Satz | Epic-Datei sofort anlegen → Dialog → bei Reife in Features schneiden |
| **Feature** | Abgegrenzter Funktionsbereich | Feature-Datei aufgreifen/anlegen → Dialog → bei Reife Story-Schnitt |
| **Story** | Kleinstes Arbeitspaket | Story-Datei anlegen → auf DoR-Niveau bringen → AC (F1) definieren & schaerfen |
| **kein Level** | Unklar | Startet als Epic, prueft sofort, ob Feature/Story passender |

**Level-Erkennung** (Rubrik: [`references/level-detection.md`](references/level-detection.md)):
Klingt ein Epic eher nach Feature (oder Feature nach Story), schlaegt der Skill den Wechsel vor —
**kein Downgrade ohne Nutzerbestaetigung.**

## Zustandsmodell — die Dateien sind der Status

Kein Statusblock in der Antwort. Der Zustand liegt vollstaendig in den Dateien — das uebersteht
Kontext-Kompaktierung und Session-Grenzen.

- **Eager-Schreiben:** Ab dem ersten Satz wird die zugehoerige Datei angelegt (`status: offen`) und
  mit jedem Input fortlaufend befuellt — nicht erst am Ende. So geht nie etwas verloren.
- **Single Source of Truth:** Der Status steht **ausschliesslich** in der jeweiligen Datei.
  Eltern verweisen nur per **ID** auf ihre Kinder (siehe IDs) — sie speichern deren Status **nicht**
  (sonst Desync).
- **Ein einziges Gate — `offen → final`:** Hat der Skill keine offenen Fragen mehr, schlaegt er den
  Uebergang vor (z. B. *„Epic vollstaendig erfasst — auf final setzen und in Features schneiden?"*)
  und wartet auf OK. Erst dann `final` + Anlegen der Kind-Files (`offen`). `offen` = aenderbar,
  `final` = gesperrt.
- **Entsperr-Notausgang:** „Epic xyz wieder oeffnen" → `status: offen`, Inhalt wieder aenderbar.
- **Wiedereinstieg (stateless):** „weiter mit Epic xyz" → Skill liest die Datei, traversiert ueber
  die ID-Referenzen die Kinder und meldet den Status-Baum (z. B. *„Epic final. FEAT-001 offen,
  FEAT-002 final aber dessen STORY-007 offen. Womit weiter?"*). „offene Punkte von Epic xyz" →
  filtert auf `status ≠ final`.

> **Warum eager + Section-Anchors statt Diff-vor-jedem-Schreiben:** Eager-Schreiben macht den Zustand
> crash-sicher und sessionfest. Damit das nie manuell editierte Prosa ueberschreibt, sind regenerier-
> bare Bereiche per Anchor markiert (siehe [Idempotenz](#idempotenz--non-destruktive-updates)); alles
> ausserhalb gehoert dem Nutzer. Das einzige Bestaetigungs-Gate ist `offen → final`.

## Verhalten pro Phase

### Epic-Phase
1. Epic-Datei anlegen (`offen`), Titel/Text aufnehmen.
2. Erkundungsfragen (CRUD? Seite/Popup? Tabelle? Rollen? Schnittstellen? NFRs? …). Jeder Input
   erweitert die Datei.
3. Keine offenen Fragen → Skill schlaegt `final` + Feature-Schnitt vor (Trennung des Gesagten in
   1..N Features).
4. Nach OK: Epic → `final`, Feature-Files (`offen`) angelegt, gegenseitig per ID referenziert.

### Feature-Phase
1. Feature-Datei aufgreifen (vorhandene `Feature_*.md` **non-destruktiv**, siehe Idempotenz) oder neu.
2. Dialog: offene Punkte klaeren, Scope schaerfen, **NFRs** erfassen (Performance/Security/
   Accessibility/i18n, soweit relevant). Jeder Input erweitert die Datei.
3. Genug Kontext fuer Story-Schnitt → Skill schlaegt `final` + Story-Schnitt vor (INVEST-Pruefung +
   [Splitting-Pattern](references/splitting-patterns.md)-Hinweis).
4. Nach OK: Feature → `final`, Story-Files (`offen`) angelegt und referenziert.

### Story-Phase
1. Story-Datei anlegen/aufgreifen (`offen`).
2. Dialog: Story auf **DoR-Niveau** bringen — **blockierende** Unklarheiten klaeren.
   **Nicht-blockierende** → als *Annahme* oder *Offener Punkt* festhalten, **nicht** endlos nachfragen.
3. **INVEST-Check inline** ([`references/invest-check.md`](references/invest-check.md)) — bei
   Verletzung: Klaerung **oder** Splitting (bewusst akzeptierte Verletzung wird dokumentiert).
4. **AC im F1-Format** definieren (3–6 Szenarien, immer **≥ 1 Negativszenario**).
5. **AC schaerfen** — siehe [Akzeptanzkriterien](#akzeptanzkriterien--ein-kanon).
6. **DoR erfuellt** → Skill schlaegt `final` vor und meldet:
   *„Story erfuellt die Definition of Ready — aus meiner Sicht bereit als Planning-Grundlage fuer
   feature-delivery. Offene Punkte bleiben verhandelbar."*
7. Nach OK: Story → `final`.

## Definition of Ready (Abbruchkriterium)

Ersetzt „felsenfest / kein Detail unklar". Eine Story ist **ready**, wenn:

- [ ] User-Story-Format vorhanden (Als [Rolle] moechte ich [Aktion], damit [Nutzen])
- [ ] INVEST erfuellt — **oder** Verletzung bewusst dokumentiert (inkl. Splitting-Entscheidung)
- [ ] Scope klar; **keine *blockierenden* Unklarheiten** (nicht-blockierende → „Annahmen/Offene Punkte")
- [ ] AC: 3–6 F1-Szenarien, **≥ 1 Negativ**, jedes eindeutig gruen/rot pruefbar
- [ ] AC messbar (keine vagen Begriffe ohne Schwellenwert) und aus Nutzerperspektive
- [ ] Abhaengigkeiten benannt

`final` ist die **Einschaetzung gegen die DoR** und eine Einladung zu starten — kein eingefrorener
Vertrag. „Annahmen/Offene Punkte" bleiben sichtbar und duerfen in der Entwicklung weiter verhandelt
werden (INVEST-N). So endet die Schaerfung an einem klaren Punkt statt in Analysis-Paralysis.

> Kein DoD-Verweis — es existiert (noch) keine projektweite Definition of Done. Bewusst weggelassen,
> im Betrieb klaeren.

## Akzeptanzkriterien — ein Kanon

**Kein eigenes `ac-quality.md`** (vermeidet einen konkurrierenden Zweit-Kanon). Qualitaet und Format
kommen aus dem bestehenden `acceptance-design`:

- **Qualitaetskanon:** [`acceptance-design/references/pruefkatalog.md`](../acceptance-design/references/pruefkatalog.md)
  — die 5 Kriterien (Messbares Ergebnis · Atomar · Beobachtbar · AAA-faehig · Loesungswegfrei),
  inline angewandt.
- **Ausgabeformat (F1):** [`acceptance-design/references/io-format.md`](../acceptance-design/references/io-format.md)
  — Testname `<Method>_<Situation>_<Expected>` + Arrange/Act/Assert-Stichpunkte + Status
  (`neu | erweitern | unberuehrt`).

Weil die AC bereits im F1-Format vorliegen, uebernimmt `feature-delivery` sie nahtlos in seine
**§8/F1-Akzeptanzliste**. Der `acceptance-design-agent` ist ein optionaler, tieferer Audit-Lauf —
**kein Pflichtschritt** und nicht mitten im Dialog gestartet.

**AC-Block-Template (Story):**

```
<!-- rd:ac:start -->
`Login_MitGueltigerEmail_RedirectZuDashboard`
- Arrange: registrierter Nutzer mit gueltiger E-Mail
- Act: Login mit korrektem Passwort
- Assert: Redirect auf /dashboard, Session aktiv
Status: neu

`Login_MitFalschemPasswort_Returns401`   (Negativ)
- Arrange: registrierter Nutzer
- Act: Login mit falschem Passwort
- Assert: HTTP 401, keine Session
Status: neu
<!-- rd:ac:end -->
```

## Spillover / Re-Balancing

Beim Promoten wandert zu detaillierter Inhalt eine Ebene nach unten:
- Im Epic bleibt nur Epic-Relevantes; Detail → Feature-Files.
- Im Feature bleibt nur Feature-Relevantes; Detail → Story-Files.

Wird Spillover-Bedarf erst entdeckt, **nachdem** etwas `final` ist, greift zuerst der
Entsperr-Notausgang.

## Dateistruktur & IDs

```
requests/
  epics/     EPIC-NNN_<slug>.md
  features/  FEAT-NNN_<slug>.md
  stories/   STORY-NNN_<slug>.md
```

**ID-Schema:** `EPIC-NNN` / `FEAT-NNN` / `STORY-NNN`, dreistellig nullgepolstert (`EPIC-001`).
Vergabe: Verzeichnis nach `^(EPIC|FEAT|STORY)-(\d+)_` scannen, Max +1 (robust & stateless).
**Cross-References laufen ueber IDs, nie ueber Namen** → Umbenennen bricht nichts; Kollisionen
fuehren zur naechsten freien ID, nie zum stillen Ueberschreiben eines fremden Items.

**Slug-Regel** (`<TYPE>-<NNN>_<slug>.md`): ASCII-lowercase; Umlaute transliteriert
(`ä→ae, ö→oe, ü→ue, ß→ss`); Leerzeichen → `-`; uebrige Sonderzeichen entfernt; auf ~50 Zeichen
gekuerzt. Beispiel: Feature „Benutzeruebersicht & Rollen" → `FEAT-003_benutzeruebersicht-rollen.md`.
**Datei-Inhalt bleibt Deutsch** — nur der Name ist ASCII-Slug.

**Frontmatter jeder generierten Datei:**
```yaml
---
id: STORY-014
parent: FEAT-003          # bei Epics weglassen
type: story               # epic | feature | story
status: offen             # offen | final
slug: select-statt-checkboxen
children: [STORY-014, STORY-015]   # nur Epic/Feature; Verweis per ID
---
```

**Inhalte:**
- **Epic** — Kurzbeschreibung + Motivation · Scope (drin / bewusst nicht drin) · Feature-Liste
  (IDs + je 1–2 Saetze).
- **Feature** — Vollbeschreibung (UI-Hinweise, Regeln, Abhaengigkeiten) · NFRs · Scope-Abgrenzung ·
  Story-Liste (IDs) · Annahmen/Offene Punkte.
- **Story** — User-Story-Format · Vollbeschreibung · INVEST-Bestaetigung (oder dokumentierte
  Verletzung) · AC im F1-Format (3–6, ≥ 1 Negativ; geschaerft nach pruefkatalog) ·
  Annahmen/Offene Punkte.

## Idempotenz — non-destruktive Updates

Re-Run auf eine **existierende** Datei: **Merge statt Clobber.**

1. **Erst lesen & parsen** (Frontmatter + Sektionen) — nie blind ueberschreiben.
2. **Nur Sektionen der aktuellen Phase regenerieren.** Manuell editierte Prosa und
   „Annahmen/Offene Punkte" bleiben erhalten.
3. **Section-Anchors** markieren regenerierbare Bereiche; alles ausserhalb ist „owned by user":
   ```markdown
   <!-- rd:ac:start --> … (regenerierbar) … <!-- rd:ac:end -->
   ```
   Owned-by-skill: Beschreibungs-Sektionen, AC-Block, Stub-Listen. Preserved: alles ohne Anchor.
4. **Stubs werden angereichert, nicht neu erzeugt.** Hat eine Story bereits manuelle AC, schlaegt
   der Skill **Ergaenzungen** vor statt zu ueberschreiben.

## Downstream — Handoff an feature-delivery

Eine `final`-Story ist die Grundlage fuer **Phase 1 (Anforderung klaeren)** von `feature-delivery` —
nicht fuer die Implementierung direkt. Der Handoff ist ein **Copy-Command/Prompt** (Muster wie das
Intake von feature-delivery), **kein automatisches Datei-Einlesen**. Weil die AC bereits im F1-Format
vorliegen, greift `feature-deliverys` §8/F1-Akzeptanzliste sie nahtlos auf.

## Referenzdateien

| Thema | Datei |
|-------|-------|
| Splitting-Pattern (Richard Lawrence, 9 + Meta) | [`references/splitting-patterns.md`](references/splitting-patterns.md) |
| INVEST-Kriterien mit Prueffragen | [`references/invest-check.md`](references/invest-check.md) |
| Level-Erkennung Epic/Feature/Story | [`references/level-detection.md`](references/level-detection.md) |
| AC-Qualitaetskanon (extern, einzige Quelle) | [`acceptance-design/references/pruefkatalog.md`](../acceptance-design/references/pruefkatalog.md) |
| AC-Format F1 (extern) | [`acceptance-design/references/io-format.md`](../acceptance-design/references/io-format.md) |

## Verifikation

1. „User Management" frei eingegeben → startet als Epic, Erkundungsfragen, Datei entsteht sofort (`offen`).
2. „drei Checkboxen als Select" → Story-Level erkannt, Story-Phase, Datei `offen`.
3. Vorhandene `FEAT-003_*.md` uebergeben → Feature-Phase greift Datei non-destruktiv auf.
4. Epic ohne offene Fragen → Skill schlaegt `final` + Feature-Schnitt vor, schreibt nicht ohne OK.
5. „offene Punkte von Epic xyz" → nur Files mit `status ≠ final`.
6. „weiter mit Epic xyz" in neuer Session → Status-Baum allein aus Dateien rekonstruiert.
7. `final`-Datei ist gesperrt; „… wieder oeffnen" setzt zurueck auf `offen`.
8. Story mit nicht-blockierender Unklarheit → landet als „Offener Punkt", Story wird trotzdem ready.
9. INVEST-Verletzung bewusst akzeptiert → dokumentiert, nicht erzwungen gesplittet.
10. Feature „Benutzeruebersicht & Rollen" → Dateiname korrekt transliteriert, keine Umlaute/Sonderzeichen.
11. Re-Run auf Story mit manuell ergaenzten AC → vorhandene AC + „Offene Punkte" bleiben erhalten (kein Clobber).
12. Story-AC liegen im F1-Format vor, ≥ 1 Negativszenario.
