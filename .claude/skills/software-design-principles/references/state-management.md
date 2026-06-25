# Zustand in Flow Design (Kap. 14, 15, 17)

Quelle: Stefan Lieser, "Mit Flow Design zu Clean Code"

---

## Zwei grundlegende Arten von Zustand

| Art | Beschreibung | Notation |
|-----|-------------|---------|
| **Innerhalb einer Interaktion** | Zustand, der nur während einer einzigen Interaktion benötigt wird | Optional — kann notiert werden, muss aber nicht |
| **Über Interaktionen hinweg** | Zustand, der zwischen mehreren Interaktionen geteilt wird | Muss explizit notiert werden (Tonne-Symbol ⊞ mit Namen) |

---

## Form 1: Zustand innerhalb einer Funktionseinheit

Standardfall: eine Funktionseinheit hält ihren Zustand selbst als Klassenfeld.

```
○ BerechneZwischensumme [⊞ summe]
```

- `⊞ summe` → Zustand als Feld der Klasse
- Klasse wird als Instanz erzeugt (nicht statisch), damit der Zustand gehalten wird
- Testbar, aber Zustand ist implizit (muss über öffentliche API aufgebaut werden)

**Wann verwenden:** Zustand ist eng an diese Funktionseinheit gekoppelt und wird nur dort gelesen/geschrieben.

---

## Form 2: Zustand aus der Funktionseinheit herausgezogen

Zustand wird als Parameter von außen hereingereicht (`State<T>`-Pattern):

```
(wert, state) ──► BerechneZwischensumme ──(summe)──►
```

- Funktionseinheit ist **zustandslos** — alle Daten kommen per Datenfluss rein
- Zustand liegt beim Aufrufer (Integration)
- Positiver Effekt auf **Testbarkeit**: Zustand kann im Test direkt gesetzt werden
- Mehrere Funktionseinheiten können denselben State-Container teilen

```csharp
// State<T> ist ein Zeiger auf den Zustand
void BerechneZwischensumme(int wert, State<int> state)
{
    state.Set(state.Get() + wert);
}
```

**Wann verwenden:** Wenn Testbarkeit wichtig ist oder mehrere Funktionseinheiten denselben Zustand teilen müssen.

---

## Form 3: Zustand in den Flow gestellt

Aspekttrennung konsequent angewendet: Zustandsverwaltung wird als eigene Funktionseinheiten
in den Datenfluss eingebaut.

```
(wert) ──► LeseZustand ──(summe, wert)──► AddiereWert ──(neuesSumme)──► SchreibeZustand
```

- Integration orchestriert: Lesen → Verarbeiten → Schreiben
- Operation `AddiereWert` ist rein funktional, kennt keinen Zustand
- Maximale Testbarkeit: jede Operation isoliert testbar ohne Zustandsaufbau

**Wann verwenden:** Wenn IOSP strikt eingehalten werden soll und die Rechenlogik isoliert
testbar sein muss.

---

## Zustand über Interaktionen hinweg

Wenn zwei Interaktionen gemeinsamen Zustand teilen, muss das im Entwurf **sichtbar** sein.

```
Dialog: Kundenbearbeitung
  ├── Interaktion: Kunde auswählen   [⊞ id] ← speichert selektierte Kunden-id
  └── Interaktion: Kunde abrechnen   [⊞ id] ← liest dieselbe Kunden-id
```

Notation: beide Funktionseinheiten erhalten dieselbe Tonne mit demselben Namen.

**Implementierungsfrage:** Wo liegt der Zustand?
- In der Domänenlogik (Interaktor-Klasse als Feld) → bei einfachem Fall
- Im Portal (Session, ViewModel) → wenn der Anwender den Zustand "besitzt"

---

## Zustand im Portal (Kap. 17)

Portale können Zustand halten, wenn dieser konzeptionell dem Anwender gehört:

| Szenario | Zustandsort |
|----------|------------|
| Session einer Web-Anwendung | Portal (ViewModel / Session-Store) |
| Zustand über Browser-Tabs hinweg | Externe Ressource (DB, Cookie) |
| Zustand über App-Neustart hinweg | Provider (Datei, DB) |

**Regel:** Zustand, der zur Domäne gehört (fachlicher Zustand), gehört in den Interaktor.
Zustand, der zur Präsentation gehört (z.B. welche Seite ist aufgeklappt), gehört ins Portal.

---

## Verbindung zu IOSP

- Zustand in den Flow gestellt → Integration liest/schreibt Zustand, Operation rechnet
- Operation, die selbst Zustand liest UND delegiert → IOSP-Verstoß
- Zustandsbehaftete Integration ist kein Verstoß, solange sie keine Domänenlogik enthält
