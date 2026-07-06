# DI Finding — Normalo
**Story:** STORY-001 `profil-ssot-duenne-payloads`
**Reviewer-Rolle:** Normalo (Pragmatische Abnahme — Nutzerperspektive)
**Datum:** 2026-07-05

---

## Gesamtbewertung

Das Deliverable löst das erklärte Problem: Payloads sind auf Pointer + variable Rundendaten reduziert, der Ablauf lebt im Profil. Token-Ersparnis und SSOT-Ziel sind aus der Beschreibung nachvollziehbar erfüllt.

**Aus Nutzerperspektive (Harness-Pflegender):** Das funktioniert für den Standardfall — ich rufe einen Agent auf, der Payload zeigt mir Profil-Pointer und meine Rundendaten, der Rest liegt im Profil. Das ist wartbar. Drei Punkte machen mich als Alltagsnutzer jedoch noch unsicher.

---

## Top-3 Handlungsempfehlungen

### 1. Pointer-Validierung — Was passiert, wenn das Profil nicht lädt?

Die schlanken Payloads sind vollständig vom Profil abhängig. Wird das Profil nicht geladen (falscher Pfad, Agent-Discovery-Fehler, Tippfehler im Pointer), hat der Agent nullKontext über seinen Ablauf. Der Payload gibt keinen Hinweis darauf, wie das erkannt oder recovered wird.

**Empfehlung:** Im Profil oder im Boilerplate einen Pflicht-Check einfügen: Agent bestätigt am Start explizit, dass er sein Profil geladen hat (z. B. durch Referenz auf einen definierten Abschnitt). Alternativ: Minimal-Fallback im Payload als Kommentar `# Profil muss geladen sein — sonst STOP`.

### 2. Variable Rundendaten — Platzhalter-Konvention nicht dokumentiert

Die Formulierung „variable Rundendaten als Platzhalter" ist im Kontext klar, aber für jemanden der das Harness neu einrichtet oder einen neuen Block hinzufügt, ist unklar: Welche Felder sind zwingend? Welches Format haben die Platzhalter? Sind es `<story-id>`, `{story_id}` oder Freitext?

**Empfehlung:** Einen Kommentarblock oder eine Kurzreferenz im `subagent-prompts.md`-Header einfügen, der das Platzhalter-Schema ein für alle Mal definiert (z. B. `<!-- Platzhalter: <VARIABLE> — fett markiert, vor jedem Agent-Dispatch zu befüllen -->`). Einmaliger Aufwand, dauerhafter Klarheitsvorteil.

### 3. Datei-Handoff im Scribe-Profil — scribe-<slice>.md-Format unklar

Die neue `## Datei-Handoff`-Sektion schreibt vor, dass eine `scribe-<slice>.md` erzeugt und nur ein Pointer an den PL zurückgegeben wird. Aus der Beschreibung geht nicht hervor, was in diese Datei hineinkommt (Mindestinhalt, Pflichtfelder, Format). Ein Scribe der zum ersten Mal mit diesem Profil arbeitet, muss raten.

**Empfehlung:** Minimaltemplate oder Inline-Beispiel in `## Datei-Handoff` einfügen — drei Zeilen reichen: Slice-ID, Status (green/red), und Pointer auf geänderte Dateien. Das macht den Handoff reproduzierbar und prüfbar.

---

## Urteil

**BESTANDEN**

Alle ACs sind laut Pre-Verification erfüllt, der Kern-Nutzen (SSOT, Token-Reduktion) ist erreicht. Die drei Findings sind Alltagstauglichkeits-Lücken, keine Korrektheitsfehler — sie blockieren den Einsatz nicht, erhöhen aber das Risiko bei Edge Cases und bei Harness-Erweiterungen durch neue Mitarbeiter.

Findings: 3 (alle 🟡 — kein Blocker)
