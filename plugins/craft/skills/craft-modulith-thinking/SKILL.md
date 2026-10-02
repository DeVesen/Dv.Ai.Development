---
name: craft-modulith-thinking
description: >
  Use when a system needs structuring in business terms before any framework decision —
  the whole as a company with departments, before deciding how each department is built
  in code. Also for explaining Modulith, Bounded Context or microservice-extraction to
  non-technical stakeholders, scoping what could later become its own service, or placing
  a cross-department interface that belongs neither to a department nor to the transport
  (REST, tRPC, SignalR). Theory-only, technology-agnostic — framework bridges live in
  `craft-dotnet-modulith-bridge` and `craft-angular-modulith-bridge`.
  Triggers: @craft-modulith-thinking, Unternehmen und Abteilungen, Fachabteilung, Fachgruppe,
  Akte, Zimmer, Modulith denken, Abteilung auslagern, "wie strukturieren wir das
  grundsätzlich", Context Mapping.
  Background: baut auf `craft-architecture-styles` (Deployment-Achse) und
  `craft-design-principles` (DDD) auf. Opt-out: ohne craft-modulith-thinking.
---

# Modulith-Denken

Bevor über Framework oder Programmiersprache gesprochen wird: wie schneide ich ein System
dem Grundsatz nach? Dieser Skill beschreibt das **rein in Unternehmenssprache** — bewusst
ohne Code, ohne Projektnamen, ohne Technologie. Er ist die Brücke zwischen „wie denke ich
darüber nach" und den zwei technischen Nachschlagewerken `craft-architecture-styles` und
`craft-design-principles`, die dasselbe in Fachbegriffen ausbuchstabieren.

**Diese Familie beantwortet zwei getrennte Fragen.** Dieser Skill, `craft-architecture-styles`
und die zwei Framework-Brücken (`craft-dotnet-modulith-bridge`, `craft-angular-modulith-bridge`)
beantworten die **Struktur-Frage**: wie ist geschnitten — Abteilungen, Zimmer, Deploy-Einheiten.
`craft-design-principles` beantwortet die **Code-Frage**: was passiert *innerhalb* einer
Einheit — Methode, Klasse, Komponente. Eine Abteilung kann strukturell perfekt geschnitten
sein und trotzdem innen aus verschachtelten `if`-Ketten bestehen; beide Fragen sind
unabhängig zu beantworten.

---

## Das Bild: Unternehmen und Fachabteilungen

> Ich denke grundsätzlich in einem Unternehmen mit Fachabteilungen.

Das **Unternehmen** ist die Deploy-Einheit — ein Haus, ein Eingang, ein Betrieb.

Jede **Fachabteilung** — Einkauf, Lager, Rechnungswesen, Marketing — hat:
- ihre eigene Fachsprache (dasselbe Wort kann in zwei Abteilungen Verschiedenes bedeuten,
  und das ist korrekt so)
- ihre eigene Aktenablage (keine Abteilung greift in die Ablage einer anderen)
- ihre eigene Arbeitsweise (eigene Logik, eigene Entscheidungen)
- genau eine offizielle Anlaufstelle nach außen — keine Abteilung wird direkt in ihren
  Interna angesprochen

**Wann nicht:** Bei einer einzelnen kleinen Anwendung ohne erkennbare, eigenständige
Fachbereiche ist das Unternehmen faktisch eine einzige Abteilung — das Bild lohnt sich erst,
sobald mehrere Bereiche mit eigener Sprache und eigenen Daten erkennbar sind.

---

## Konzern und Tochterunternehmen

Nicht jedes große Ganze ist automatisch ein Unternehmen mit Abteilungen. Zwei Systeme, die
bereits getrennt laufen — eigene Datenbank, eigener Prozess, kein Rückkanal — sind keine
Abteilungen eines gemeinsamen Unternehmens, sondern **zwei eigenständige Unternehmen unter
einem gemeinsamen Konzerndach**. Die Frage ist nicht „könnte man sie trennen", sondern „sind
sie es bereits" — und wenn ja, gilt das Abteilungsbild jeweils *innerhalb* jeder Firma, nie
über beide hinweg.

**Die eine Ausnahme:** Tauschen zwei getrennte Firmen Daten aus — und sei es nur per Datei,
ohne jede Laufzeitverbindung —, kennen sie sich trotzdem an genau dieser Stelle. Das
Austauschformat ist eine **Published Language**: ändert die eine Firma ihr Format, bricht
die andere, ohne dass zur Laufzeit ein Fehler auftritt — der Bruch zeigt sich erst beim
nächsten Austausch. Diese eine Schnittstelle verdient Versionierungssorgfalt; sie macht die
beiden Firmen aber nicht zu Abteilungen eines Unternehmens.

---

## Die Verbindungsstelle über den Abteilungen

Abteilungen sprechen nicht direkt in die Aktenablage der anderen — sie brauchen eine
Verbindungsstelle. Die gehört **zu keiner** Abteilung, sondern sitzt darüber und kennt die
Anlaufstelle jeder Abteilung.

Zwei unabhängige Dinge sind dabei zu trennen:

1. **Wie die Verbindungsstelle intern koordiniert** — entweder eine zentrale Stelle fragt
   aktiv bei den Abteilungen an, oder jede Abteilung reagiert selbständig auf das, was
   anderswo passiert ist, ohne dass jemand zentral steuert. Das ist eine bewusste
   Entscheidung, kein Automatismus — ein zentraler Koordinator, der mit der Zeit selbst
   Fachwissen ansammelt statt nur zu verbinden, wird zur heimlichen sechsten Abteilung ohne
   eigene Sprache. Details zur zweiten Variante: `craft-architecture-styles` →
   `references/data-flow.md`, Abschnitt „Event-Driven Integration".
2. **Wie sie nach außen zur Welt spricht** — Telefon, E-Mail, Kundenportal — ist reines
   Transportmittel. Es gehört nicht zur Abteilung und nicht zwingend zur Verbindungsstelle
   selbst, sondern ist die Tür, durch die beide nach draußen sichtbar werden.

---

## Wenn eine Abteilung auszieht

Entscheidet das Unternehmen, dass eine Abteilung eigenständig werden soll — eigenes
Gebäude, eigene Skalierung —, kann sie ausziehen, **ohne umzuziehen**: Ihre Aktenablage war
schon immer ihre eigene, ihre Anlaufstelle schon immer die einzige Tür nach draußen.

Das stimmt aber nur, wenn diese Trennung vorher schon echt war — nicht nur eine
Ordnerbeschriftung. Die konkreten Regeln dafür (eigenes Schema, keine Durchgriffe, geprüfte
statt dokumentierte Grenze) stehen in `craft-architecture-styles` → `references/deployment.md`,
Abschnitt „Modularer Monolith".

---

## Innerhalb der Abteilung: die Fachgruppe

Eine Abteilung bearbeitet nicht „irgendwas", sondern klar abgegrenzte **Vorgänge** — bei
„Einkauf" z. B. Bestellvorgänge, bei „Rechnungswesen" Zahlungsvorgänge. Ein Vorgang ist die
**Akte**: eine Sammlung zusammengehöriger Unterlagen, immer als Ganzes behandelt, nach außen
genau ein Ansprechpartner — der **Aktenverantwortliche**. Niemand greift an ihm vorbei direkt
in die Akte; wer etwas will, wendet sich an ihn, und der sorgt dafür, dass die Akte danach
noch stimmig ist (Bestellsumme passt zu den Positionen, ein stornierter Auftrag hat keine
offene Lieferung mehr).

Innerhalb der Akte:
- **Belege ohne eigene Bedeutung außerhalb der Akte** — eine Bestellposition existiert nicht
  für sich, nur als Teil genau dieser Bestellung.
- **Reine Angaben** — ein Betrag, eine Adresse. Zwei Akten können denselben Betrag „42 €"
  enthalten, ohne dass das irgendwas verbindet — kopierbar, ohne die Bedeutung zu verlieren.
- **Logbucheinträge** — „Bestellung Nr. 123 wurde storniert am ...". Feststehende Tatsachen
  in der Vergangenheit, die die Abteilung nach außen weitergeben kann, ohne dass jemand in
  die Akte selbst schauen muss.

Wie die Fachgruppe intern arbeitet (Vorzimmer/Sachbearbeiter/Registratur, wann diese Tiefe
sich lohnt) und wie viele Zimmer eine Abteilung braucht:
[references/fachgruppe-rollen.md](references/fachgruppe-rollen.md).

---

## Zimmer innerhalb der Abteilung

Eine Abteilung kann als ein einziger, offener Arbeitsbereich bestehen — oder intern in
**Zimmer mit eigener Tür** unterteilt sein: abgeschlossene Bereiche, in die man nur durch die
Tür hineinkommt, nie durch die Wand. Nur ein Zimmer hat eine Tür nach draußen — das der
Anlaufstelle. Die übrigen Zimmer (wo der Sachbearbeiter sitzt, wo die Registratur ist, wo das
Vorzimmer arbeitet) sind nur von innerhalb der Abteilung erreichbar.

Wie viele Zimmer sich lohnen, ist dieselbe gestufte Frage wie bei den Fachgruppen — siehe
[references/fachgruppe-rollen.md](references/fachgruppe-rollen.md).

Wie ein Zimmer technisch aussieht — ein eigenes kompilierbares Stück Code mit eigener
Referenzgrenze — übersetzt erst die jeweilige Framework-Brücke (`craft-dotnet-modulith-bridge`,
`craft-angular-modulith-bridge`). Dieser Skill kennt nur das Bild, nicht die Technik dahinter.

---

## Referenzen

| Thema | Datei |
|-------|-------|
| Die drei Rollen einer Fachgruppe, gestufte Zimmertiefe | [references/fachgruppe-rollen.md](references/fachgruppe-rollen.md) |
| Vollständige Rückübersetzung Unternehmensbild ↔ Fachbegriff | [references/translation-table.md](references/translation-table.md) |

Technische Übersetzung: `craft-dotnet-modulith-bridge` (.NET), `craft-angular-modulith-bridge` (Angular).

---

## Opt-out

`ohne craft-modulith-thinking` → Skill nicht laden.
