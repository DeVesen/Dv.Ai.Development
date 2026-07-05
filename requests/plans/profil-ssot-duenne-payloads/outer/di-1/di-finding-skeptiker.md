# DI-Finding: Skeptiker — STORY-001 `profil-ssot-duenne-payloads`

**Datum:** 2026-07-05
**Rolle:** Skeptiker (Lückenjäger)
**Methode:** Kontext-Analyse — kein Tool-Call

---

## Top-3 Lücken (priorisiert)

### #1 — AC-5 / Scribe-4-5 Scope-Cut-Tension (WARNING)

**Was:** AC-5 verlangt die OnPush-Regel "aus Payload entfernt" — ohne Qualifikation, ohne Ausnahme.
Der Scope-Cut deklariert den Scribe-4-5-Block in `subagent-prompts.md` explizit als "unberührt".

**Lücke:** Wenn der Scribe-4-5-Payload VOR dem Change einen Angular-Hard-Rules/OnPush-Abschnitt enthielt
(symmetrisch zu Scribe-1-3), wurde dieser dort nicht entfernt. AC-5 wäre dann nur für Scribe-1-3
erfüllt, nicht vollständig.

**Gegenargument aus Kontext:** Der Scope-Cut für Scribe-4-5 wird begründet mit "Rückgabe-Format-Asymmetrie
mit Scribe-4-5-Payload" — nicht mit einem OnPush-Problem. Das legt nahe, die OnPush-Regel war
möglicherweise nur in Scribe-1-3 vorhanden. Die Guard-Bestätigung stützt diese Lesart.

**Risiko:** WARNING — plausible Teilerfüllung, aber kein Beweis einer Verletzung ohne Datei-Lesen.
Der Guard hat AC-5 bestätigt; Regression unwahrscheinlich, aber nicht ausgeschlossen.

---

### #2 — AC-2 Reviewer-Profil-Vollständigkeit (WARNING)

**Was:** AC-2 verlangt, dass Reviewer-Blöcke "Ablauf nur per Pointer" tragen. Die 7 Reviewer-Blöcke
wurden auf je 5-Zeilen-Pointer + Kanon-Pointer reduziert.

**Lücke:** Ein Pointer funktioniert nur, wenn das referenzierte Agent-Profil den vollständigen
Ablauf enthält. Das Deliverable belegt, was aus den Payloads ENTFERNT wurde — es belegt nicht,
dass die 7 Reviewer-Profile vor dem Strip bereits alle notwendigen Ablaufschritte enthielten.

Wurde eine Reviewer-spezifische Ablaufregel im Payload entfernt ohne sie vorher im Profil zu
verankern, ist der Ablauf zur Laufzeit still gebrochen. Kein Test würde das statisch auffangen.

**Abgrenzung:** Dieser Finding liegt innerhalb des AC-2-Rahmens (Pointer-Korrektheit ist
implizite AC-2-Voraussetzung). Er ist kein "denkbar-aber-nicht-gefordertes Szenario".

**Risiko:** WARNING — sieben Reviewer-Profile müssten einzeln gegen die entfernten Payload-Inhalte
abgeglichen werden. Guard hat AC-2 bestätigt; Restrisiko: Guard hat Pointer-Existenz geprüft,
nicht Profil-Vollständigkeit.

---

### #3 — AC-6 Block-Identität unspezifiziert (INFO)

**Was:** AC-6 schützt "8 unangetastete Blöcke". Das Deliverable bestätigt "KEINE Änderungen
(bestätigt per git diff)" — benennt aber keinen einzigen der 8 Blöcke namentlich.

**Lücke:** Git diff bestätigt Abwesenheit von Änderungen in Zeilen, nicht Korrektheit der
Auswahl. Wenn der Guard die "8" nur gezählt (nicht identifiziert) hat, ist folgendes ungeprüft:
- Wurden exakt die richtigen 8 Blöcke als "unangetastet" eingestuft?
- Falls ein Block versehentlich restrukturiert wurde (ohne inhaltliche Änderung, z.B.
  Whitespace), würde er als "unverändert" gelten, wäre aber dennoch berührt.

**Zusatzbeobachtung:** Die Deliverable-Arithmetik (plan-agent + PL + PM + Scribe-1-3 + 7 Reviewer
= 11 geänderte Blöcke; Scribe-4-5 = 1 Scope-Cut; 8 unangetastet = 8) ergibt 20 Blöcke gesamt
in `subagent-prompts.md`. Diese Zahl ist plausibel, aber nicht verifizierbar. Wenn die reale
Blockzahl abweicht, stimmt die "8" nicht.

**Risiko:** INFO — kein AC-Verstoß nachweisbar; Verifikationslücke im Guard-Prozess, nicht
im Deliverable selbst.

---

## Verdikt

**BESTANDEN**

Alle 3 Findings liegen im WARNING/INFO-Bereich. Kein Finding belegt eine nachgewiesene AC-Verletzung.

- Finding #1 ist durch die Guard-Bestätigung und den Scope-Cut-Kontext abgemildert.
- Finding #2 ist strukturell real, aber durch die Guard-Bestätigung abgedeckt — Restrisiko liegt
  im Gap zwischen "Pointer existiert" und "Profil ist vollständig".
- Finding #3 ist ein Prozess-Hygiene-Finding ohne Delivery-Impact.

**Empfehlung (nicht blockernd):** Für zukünftige SSOT-Diäten: Unangetastete Blöcke bei AC-6
explizit benennen (Blockliste in Story-Randbedingungen), und Reviewer-Profile gegen entfernte
Payload-Inhalte diff-vergleichen, bevor Strips bestätigt werden.
