---
name: feature-delivery
description: >
  Orchestrator-Skill fuer vollstaendige Feature-Umsetzung (.NET + Angular): plane, plan, plane nur,
  plane only, nur planen, erstelle einen Plan, setze X um, implementiere X, implementiere nur X, liefere X, umsetzen, feature-delivery,
  fix, setze plan X um, fuehre plan X aus, implementiere plan X, implementiere lean impl, schlank planen, lean planen,
  kompakt planen, Solo-Planung. Akzeptiert ausschliesslich Stories (type: story, status: ready)
  — Epics und Features werden verweigert, fehlendes Story-Format erfordert Bestaetigung.
  Fuenf Einstiege: Plan-only (plane/plan/plane nur/plane only/nur planen/erstelle Plan → immer lean/solo, kein Scout, kein Review-Loop, kein Auto-Implement, STOPP, setzt Story auf planned),
  Implementieren-voll (implementiere/implement/setze um/liefere/umsetzen/feature-delivery/fix → setzt einen EXISTIERENDEN Plan um mit allen Schleifen: Scribes → Build/Test → Inner-Loop → Outer-Delivery-Inspection; plant NICHT mehr selbst, verlangt status=planned; Story → reviewed),
  Implementieren-nur (implementiere nur → schlanker Scribe-Einzeldurchlauf + Build/Test bis gruen max. 5 Fix-Versuche, KEINE Reviewer/PL/PM/SecondBrain/Delivery-Inspection; gruen → implemented, sonst → blocked),
  From-existing-plan (setze plan X um/fuehre plan X aus → ueberspringt Planung, volle Loops → reviewed),
  Already-Planned (Story status=planned → Plan automatisch laden, direkt Implementierung).
  implementiere auf status=ready ohne Plan → STOPP + Hinweis erst plane ausfuehren (kein Auto-Planning).
  Zwei beratende Review-on-Demand-Trigger (kein Status-Flip, kein Auto-Fix, kein Auto-Implement):
  code-inspection (6 implement-review-*-Agents ueber den uncommitteten Diff, kein Feature noetig, reiner Befund)
  und delivery-inspection FEATURE-X (Anforderungserfuellung, Feature-Bezug PFLICHT+explizit, laedt Feature→Stories→ACs;
  ohne Feature-Argument STOPP). Default-Scope beider: git diff HEAD + untracked, branch-unabhaengig;
  Merge-Base-Alternative bei committetem Feature. Ausgabe: Requests/reviews/<feature>-<inspection>-<n>.md + Chat-Kurzfassung.
  Planung ist immer Lean/solo: Orchestrator plant solo, keine Scouts, kein Review-Loop.
  Lean-Synonyme (schlank planen/lean planen/kompakt planen/Solo-Planung) sind bedeutungsgleich.
  Opt-out: ohne feature-delivery.
when_to_use: >
  Wenn der Nutzer eine Story planen, umsetzen oder liefern will — .NET und Angular Stack.
  Voraussetzung: Story-Datei mit type: story und status: ready (aus requirement-definition).
  Epic oder Feature uebergeben → REFUSE. Kein Story-Format → STOP + Bestaetigung.
  Story status=planned → Already-Planned-Path: verlinkten Plan laden, direkt Implementierung.
  Plan-only-Einstieg: plane/plan/plane nur/plane only/nur planen/erstelle einen Plan → immer lean/solo (kein Scout, kein Topic-Planer, kein Plan-Review-Loop), kein Auto-Implement, Story auf planned setzen, STOPP. plane nur/plane only sind bedeutungsgleiche Aliase.
  Implementieren-voll-Einstieg: implementiere/implement/setze um/liefere/umsetzen/feature-delivery/fix → setzt einen existierenden Plan um (verlangt status=planned; plant NICHT selbst), volle Loops (Scribes → Build/Test → Inner-Loop → Outer-Delivery-Inspection), Story auf reviewed. Auf status=ready ohne Plan → STOPP + Hinweis erst plane.
  Implementieren-nur-Einstieg: implementiere nur → schlanker Scribe-Einzeldurchlauf + Build/Test bis gruen (max. 5 Fix-Versuche), keine Reviewer/PL/PM/SecondBrain/Delivery-Inspection; gruen → Story auf implemented, sonst → blocked.
  From-existing-plan-Einstieg: setze plan X um/implementiere plan X/fuehre plan X aus →
  ueberspringt Planungs-Flow, direkt in Implementations-Flow (volle Loops), Story auf reviewed.
  Review-on-Demand (beratend, kein Status-Flip, kein Fix): code-inspection → 6 implement-review-*-Agents ueber den uncommitteten Diff (git diff HEAD + untracked), kein Feature noetig;
  delivery-inspection FEATURE-X → Anforderungserfuellung, Feature-Bezug Pflicht (ohne Feature STOPP), laedt Feature→Stories→ACs; Merge-Base-Alternative bei committetem Feature;
  Ausgabe Requests/reviews/<feature>-<inspection>-<n>.md + Chat-Kurzfassung. Detail: flows/review-flow.md.
  Planung: immer Lean/solo — Orchestrator plant solo, schnell. Lean-Synonyme (schlank planen/lean planen/kompakt planen/Solo-Planung) sind bedeutungsgleich.
  Lean-Impl-Mode: implementiere lean impl → Impl-Review auf 3 Reviewer (risk · craft · readiness) oder 1 impl-quality-review-agent (collapsed, alle Lenses intern, 1 Approval). Scribes, Gates, Test-First bleiben voll.
  Nicht bei: reiner Erklaerung ohne Umsetzungsintent, ohne feature-delivery.
  Worktree-Routing (ersetzt den frueheren Branch-Guard, FEAT-001): schreibende Implement-Einstiege
  (implementiere/implementiere nur/from-existing-plan) routen NACH dem Story-Gate anhand parent+slug in
  einen eigenen git-Worktree je Feature (feat-<nnn>-<slug>, <nnn>=stabile Parent-FEAT-Nummer) unter
  <project-root>/worktrees/ — Reuse falls feat-<nnn>-* existiert, sonst git -C <repo-dir> worktree add …;
  alle Produkt-Code-Ops via Absolutpfade (CODE_ROOT), Session-cwd bleibt, kein master-STOPP.
  plane und Review-Trigger (code-inspection/delivery-inspection) routen NICHT. Story ohne parent → STOPP.
  Story-Entscheidungen noch unklar vor dem Plan? → /grill-me <story.md> vorschalten.
  Parallele Stories: NIEMALS isolation: worktree verwenden — alle Agents arbeiten direkt auf dem
  aktuellen Branch. Voraussetzung: requirement-definition hat touches-Annotation und Parallelgruppen
  geprueft (keine Ueberschneidung). Stories mit ueberschneidenden touches serialisieren.
---

# feature-delivery

Orchestrator-Skill fuer vollstaendige Feature-Umsetzung in Kundenprojekten (.NET + Angular).
Deckt den gesamten Bogen: Anforderung → Plan → Umsetzung → Qualitaetssicherung → Ergebnis.

---

## Zwei-Schleifen-Architektur

```
┌─ OUTER LOOP (Stakeholder-Schleife) ──────────────────────────────────┐
│                                                                        │
│  Schritt 1: Anforderung klaeren                                        │
│             Iteration 1:  originaler Request                           │
│             Iteration 2+: originaler Request + PO-Delta                │
│                           (neue ACs, weggefallene ACs, Scope-Shift)   │
│                                                                        │
│  Schritt 2: Planen  (immer lean/solo)                                 │
│             Iteration 1:  Vollplan                                     │
│             Iteration 2+: Delta-Plan (nur geaenderte/neue Topics)      │
│                           Unveraenderter Plan-Teil wird geerbt         │
│                                                                        │
│  Schritt 3: Tests setzen (neu/geaenderte ACs → neue Tests)            │
│  Schritt 4: Umsetzen                                                   │
│                                                                        │
│  ┌─ INNER LOOP (Code-Qualitaets-Schleife, max. 5 Runden) ───────┐    │
│  │  SESSION faechert je Runde: (Fix-Planer →) Scribes,           │    │
│  │      dann Gates (MCP), dann Reviewer — sammelt alle Pointer    │    │
│  │  Digest-Leaf: liest finding-*.md → digest.md (Pointer)         │    │
│  │      + autoritative Tiers 🔴/🟡/🟢 → Tier-Zaehler in Index     │    │
│  │  PM-Leaf: liest Index+Digest → clean / erbsenzaehlerei-exit / │    │
│  │      fix(Was+Wie) / escalate                                  │    │
│  │  Session-Tier-Guard: 🔴 offen > 0 → Exit zurueckgewiesen      │    │
│  │  → fix?        → naechste Runde (Session dispatcht Fix-Planer) │    │
│  │  → Inner-Close?→ raus aus Inner Loop, Session leitet 5c ein    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  5c: SESSION faechert die 6 Delivery-Inspection-Reviewer,             │
│      sammelt di-finding-Pointer → Outer-Verdikt-PM (frisches Leaf)     │
│      liest di-finding-*.md → di-digest → Outer-Verdikt                 │
│  → OK?       → Schritt 7 Closure                                      │
│  → Req-Gap?  → outer/delta-N.md → zurueck zu Schritt 1 (frischer PM)  │
│                                                                        │
│  Schritt 7: Closure                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Inner Loop** = Impl-Fix-Loop (max. 5 Runden): technische Korrektheit, Code-Qualitaet, Tests gruen.  
**Outer Loop** = Stakeholder-Schleife: Anforderungserfuellung aus Besteller-Perspektive. Kein Runden-Cap.

**Unterschied der Rueckwege:**
- Inner Loop (Maengel in *Wie* umgesetzt) → Fix-Planer → Fix-Scribes → Inner Loop erneut
- Outer Loop (Maengel in *Was* geliefert, neuer Scope) → Delta-Protokoll → Schritt 1

### Inner-Exit-Urteilslogik: 3-Tier + Outer-Verdikt + Tier-Guard (STORY-034, korrigiert)

Der Uebergang Inner→Outer ist die kritischste Entscheidung des Flows — sie faellt nachvollziehbar, gegen Silent-Shortcut abgesichert und mit Audit-Trail:

- **3-Tier-Erbsenzählerei** (autoritativ vom Digest-Leaf vergeben): 🔴 blockt den Inner-Exit (ein offenes 🔴 → naechste Runde Pflicht) · 🟡 nur mit **schriftlicher Begruendung je Finding** im `outer/pm-verdict-N.md` durchwinkbar · 🟢 frei. **Security-`critical` ist aus jedem Kanal immer 🔴 — nie als Erbsenzählerei einstufbar.**
- **PM-Urteil**: `clean` (nichts offen) · `erbsenzaehlerei-exit` (nur 🟡/🟢 offen, 🟡 begruendet) · `fix` · `escalate`.
- **Mechanischer Tier-Guard** (Session): liest `Tier 🔴 offen` aus dem Index; ein Inner-Close bei offenem 🔴 wird **deterministisch zurueckgewiesen** — reine Zaehler-Arithmetik, nicht durch ein PM-Fehlurteil aushebelbar.
- **Outer-Verdikt** (nach dem Inner-Close): Die **Session** faechert die 6 Delivery-Inspection-Reviewer und sammelt deren Pointer ein (nur die Session empfaengt Sub-Agent-Completions — Harness-Grundwahrheit); danach faellt ein **frisches Outer-Verdikt-PM-Leaf** aus den `di-finding-*.md` den Outer-Verdikt. Der Tier-Guard laeuft dabei **vor** dem DI-Fan-out (Session-Sequenz). **Harte Grenze**: die Folge-Outer-Iteration bekommt frische Leaves durchweg.

### Rollenbild Impl-Fix-Loop — Session faechert, Leaves lesen (STORY-033, korrigiert)

> **Harness-Grundwahrheit (die dieses Rollenbild traegt):** In diesem Harness laufen **alle
> `Agent`-Calls asynchron**; die Completion eines gespawnten Kindes laeuft **immer zur Session**, nie
> zum spawnenden Sub-Agent. Ein Sub-Agent, der selbst faechert und auf seine Kinder wartet, **parkt**
> und bekommt nie deren Ergebnis. **Folge: nur die Session darf fan-out + einsammeln.** Der urspruengliche
> STORY-033/034-Split liess einen „PL"-Sub-Agent Scribes/Reviewer dispatchen und einen „Terminal-PM" die
> DI-Reviewer — beides auf der falschen Annahme „synchrones Vordergrund-Dispatch, Trap strukturell
> geloest" gebaut. Diese Annahme existiert in diesem Harness nicht; der Split ist entsprechend korrigiert.

Der Inner Loop laeuft **nicht** in einer durchgehend lebenden Orchestrator-Instanz (das erzeugte
Kontext-Compact durch unbegrenztes Fenster-Wachstum, FEAT-001). Die Session bleibt duenn (nur Pointer +
Verdikte), das schwere Lesen/Verdichten laeuft in **throwaway Leaf-Agents**. Kontinuitaet rein
**datei-basiert** ueber das SecondBrain ([references/secondbrain-schema.md](references/secondbrain-schema.md)):

| Element | Lebensdauer | Aufgabe |
|---------|-------------|---------|
| **Session-Treiber** (die aufrufende Session) | persistent — einzige lebende Instanz | **Der einzige Fan-out-/Collect-Knoten.** Faechert je Runde (Fix-Planer →) Scribes, faehrt die Quality Gates via MCP, faechert die Reviewer — und sammelt alle Pointer ein (nur hier landen Sub-Agent-Completions). Haelt **nur** Pointer + Verdikt-Kurzform + Tier-Zaehler. Liest `current_round` + `Tier 🔴 offen` aus `secondbrain-index.md`, erzwingt den Max-5-Cap **und den mechanischen Tier-Guard**. Spawnt je Runde frische Leaves. |
| **Digest-Leaf** `implement-round-executor` | throwaway — frisch je Runde; **dispatcht nichts** | Liest die von der Session gesammelten `finding-*.md` (+ Gate-/Security-Evidenz), baut `digest.md` **+ vergibt autoritative Tiers 🔴/🟡/🟢** und schreibt die Tier-Zaehler in den Index. Gibt **nur Pointer** zurueck. Kein Code, kein Dispatch, kein Urteil. Haelt die finding-Bodies aus dem Session-Fenster. |
| **PM-Leaf** `implement-supervisor` | throwaway — frisch je Runde; **dispatcht nichts** | Urteilsebene: liest Index+Digest → **ein** Inner-Urteil `clean` / `erbsenzaehlerei-exit` / `fix` (Was+Wie) / `escalate`. Schreibt **nur** `outer/pm-verdict-N.md` (+ bei Requirement-Gap `outer/delta-N.md`). Der **Outer-Verdikt-PM** ist ein **frisches** Leaf, das die Session nach dem DI-Fan-out startet — es liest die `di-finding-*.md`, baut den di-digest und faellt den Outer-Verdikt. |

**Kadenz:** frisches Digest-Leaf **und** frisches PM-Leaf je Runde via Agent-Tool — **kein SendMessage
ueber Runden hinweg**, keine ueber den Inner-Close hinweg fortgesetzte Instanz. Kein Fenster waechst mehr
unbegrenzt; kein Reviewer-Report und kein Digest-Body liegt je im Session-Fenster (nur Pointer +
Verdikt). Der Fix-Planer bleibt erhalten, unter dem PM-Urteil — die **Session** dispatcht ihn zu Beginn
der naechsten Runde, bevor Fix-Scribes laufen.

**Outer-Verdikt-Sequenz (Session-gesteuert):** Tier-Guard (Session) → DI-Fan-out (Session faechert die 6
DI-Reviewer, sammelt Pointer) → Outer-Verdikt-PM (frisches Leaf liest `di-finding-*.md` → di-digest →
Outer-Verdikt). Weil die Session strikt sequenziert, liegt der Guard nachweislich **vor** dem
DI-Fan-out — ganz ohne Same-Instance-Span. Danach harte Grenze. Details + 3-Tier + Tier-Guard: s.
Abschnitt oben und [flows/implementation-flow.md](flows/implementation-flow.md).

Details: [flows/implementation-flow.md](flows/implementation-flow.md), [flows/planning-flow.md](flows/planning-flow.md)

---

## ⚠️ Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Orchestrator überspringt Subagent-Phasen im Implementations-Flow.** Gilt ohne Ausnahme — Plan Mode, Agent Mode. *(Planung läuft lean/solo — der `plan-agent` plant ohne Subagent-Phasen; das ist regelkonform, kein Shortcut.)*

- Impl-Flow: die **Session** faechert die Scribes (implement-scribe-agent / implement-scribe-opus-agent) — kein Produkt-Code durch Session, Digest-Leaf oder PM-Leaf
- Impl-Review: Reviewer parallel von der **Session** dispatcht — keine Rollensimulation im Session-Thread, kein Fan-out durch ein Leaf
- Impl-Fix-Loop: frisches Digest-Leaf UND frisches PM-Leaf je Runde via Agent-Tool — **kein SendMessage ueber Runden hinweg**, keine lang lebende Orchestrator-Instanz, kein Leaf, das selbst faechert

**Ausnahme: Micro-Change-Modus** (s.u.) — Session-Treiber editiert direkt, kein Scribe, kein Plan-File, 1 Reviewer (risk). Nur wenn Fastpath explizit aktiviert und angekuendigt.

**Ausnahme: `implementiere nur` (Lean Single-Pass, s. Einstiege)** — der Session-Treiber dispatcht Scribes **direkt** fuer einen Einzeldurchlauf (kein PL, kein PM, keine Runden) und faehrt Build/Test bis gruen (max. 5 Fix-Versuche); **keine** Reviewer, **kein** SecondBrain, **keine** Delivery-Inspection. Scribes bleiben Pflicht — die Test-First-Scribe-Qualitaet (§8) gilt unveraendert; nur die Review-Ebene entfaellt. Nur wenn der Nutzer `implementiere nur` explizit triggert.

**Verboten (haeufigster Fehler):** Agent schaetzt Scope als "klein und klar" ein und arbeitet direkt ohne Sub-Agents — ohne den Micro-Change-Modus korrekt aktiviert zu haben.

**Transparenz-Pflicht:** Vor jeder Delegation im Chat ankuendigen:
`"Starte jetzt [Agent-Typ] fuer [Scope/Phase]…"`

Wenn Ankuendigung nicht moeglich, weil Phase selbst ausgefuehrt wird → **STOPP:**
`"⚠️ feature-delivery nicht konform: [Phase] ohne Subagent-Delegation. Neu starten."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Story-Gate (vor jedem Einstieg — keine Ausnahme)

feature-delivery akzeptiert **ausschliesslich Stories** als Eingabe-Anforderung.
Pruefreihenfolge beim Start:

### Schritt 1 — Input-Typ pruefen

Liegt eine Datei vor, Frontmatter lesen (`type`-Feld). Liegt kein Frontmatter vor, Beschreibungstext
auf Epic-/Feature-Signale pruefen (z. B. „mehrere Stories", „Funktionsbereich", „Saeulen A–D").

| Befund | Reaktion |
|--------|----------|
| `type: epic` oder `type: feature` | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Die übergebene Anforderung ist ein [Epic/Feature], kein Story-Arbeitspaket. feature-delivery setzt eine ausgearbeitete Story (`type: story`, `status: ready`) voraus. Bitte erst /requirement-definition ausführen und die Story bis `ready` schärfen."* Keine Weiterarbeit. |
| Kein `type`-Feld, kein Story-Format erkennbar | **STOP + Bestätigung erforderlich:** *„⚠️ Die Anforderung liegt nicht im Story-Format vor (kein `type: story` im Frontmatter erkennbar). Ohne ausgearbeitete Story fehlt die Spezifikationsbasis — das erhöht das Risiko von Fehlinterpretationen und Nacharbeiten erheblich. Trotzdem fortfahren? [Ja / Nein — zuerst /requirement-definition ausführen]"* Wartet auf explizites Ja. |
| `type: story` | weiter mit Schritt 2 |

### Schritt 2 — Status + Trigger pruefen

Der gewaehlte Trigger entscheidet mit. **Plan-Trigger** = `plane`/`plan`/`plane nur`/`plane only`/`nur planen`/`erstelle einen Plan`. **Implement-Trigger (voll)** = `implementiere`/`implement`/`setze um`/`liefere`/`umsetzen`/`feature-delivery`/`fix`. **Implement-Trigger (nur)** = `implementiere nur` (Lean Single-Pass). **From-existing-plan-Trigger** = `setze plan X um`/`implementiere plan X`/`fuehre plan X aus` (bringt Plan-Pfad explizit mit).

| `status` | Trigger | Reaktion |
|----------|---------|----------|
| `planned` + `plan`-Referenz | Implement-Trigger (voll oder nur) | **Already-Planned-Path:** Plan-Datei aus der `plan`-Referenz laden → direkt in Implementations-Flow (Planungs-Flow komplett ueberspringen). **Das Verb entscheidet die Tiefe:** `implementiere`/Synonyme → volle Loops (Story → `reviewed`); `implementiere nur` → Lean Single-Pass (Story → `implemented`/`blocked`). Meldung: *„Story ist bereits geplant (`status: planned`). Lade Plan [plan-referenz] und starte [die volle Umsetzung | die schlanke Umsetzung ‚nur‘ ohne Reviewer]."* |
| `planned` + `plan`-Referenz | Plan-Trigger | Plan liegt bereits vor → Hinweis + Nachfrage, ob neu geplant werden soll (kein stilles Ueberschreiben). |
| `ready` | Plan-Trigger | Normaler Weg → Plan-only-Flow (immer lean/solo). |
| `ready` | Implement-Trigger (voll oder nur) | **STOP + Hinweis:** *„⚠️ Story `[ID]` hat `status: ready` und noch keinen Plan. `implementiere` plant nicht selbst. Bitte zuerst `plane [ID]` ausfuehren; danach `implementiere [ID]` bzw. `implementiere nur [ID]`."* Kein Auto-Planning, keine Weiterarbeit. |
| `ready` | From-existing-plan-Trigger | Expliziter Plan-Pfad vorhanden → Hard Gate prueft den Plan → Implementations-Flow (volle Loops). |
| `blocked` + `plan`-Referenz | Implement-Trigger (voll oder nur) | Erneuter Versuch erlaubt (ein Plan liegt vor) → wie `planned` behandeln. |
| alles andere (`offen`, `implemented`, `reviewed`, `blocked` ohne Plan, oder fehlend) | beliebig | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Story hat Status `[wert]` — erwartet wird `ready` (Plan-Trigger) bzw. `planned`/`blocked` mit Plan-Referenz (Implement-Trigger). Fuer eine neue Anforderung zuerst /requirement-definition bis `ready` schaerfen."* Keine Weiterarbeit. |

### Schritt 3 — Abhaengigkeiten pruefen

Nur relevant wenn die Story ein `depends_on`-Feld im Frontmatter hat.

Fuer jede referenzierte Story-ID in `depends_on`: die jeweilige Story-Datei lesen und `status`
pruefen.

| Befund | Reaktion |
|--------|----------|
| Alle `depends_on`-Stories sind fertig umgesetzt (`status` in {`implemented`, `reviewed`, `done`, `accepted`}) | Weiter — keine Blockierung |
| Mindestens eine `depends_on`-Story hat anderen Status (z. B. `ready`, `planned`, `blocked`) | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Diese Story hat eine unerfüllte Abhängigkeit. [STORY-XXX] hat Status `[wert]` — erwartet wird `implemented` oder `reviewed`. Die abhängige Story muss zuerst vollständig umgesetzt sein."* Bei mehreren blockierenden Stories alle auflisten. Keine Weiterarbeit. |
| `depends_on`-Story-Datei nicht auffindbar | **STOP + REFUSE:** *„⛔ Abhängige Story [STORY-XXX] nicht gefunden — Pfad prüfen oder Abhängigkeit in der Story-Datei korrigieren."* |

### Schritt 4 — Story-Status nach Planung setzen

Nach erfolgreichem Abschluss des Planungs-Flows (Plan-Datei persistiert unter
`requests/plans/plan-<slug>.md`):

1. Story-Frontmatter aktualisieren:
   - `status: ready` → `status: planned`
   - Feld `plan` hinzufuegen: `plan: requests/plans/plan-<slug>.md`
2. Meldung: *„Plan persistiert. Story-Status auf `planned` gesetzt, Plan-Referenz eingetragen."*
3. **Kein Auto-Implement.** Nach `planned` STOPP — Planung und Umsetzung sind getrennte, explizite
   Schritte. Umsetzung erst auf expliziten Implement-Trigger (`implementiere [ID]` = volle Loops,
   `implementiere nur [ID]` = Lean Single-Pass).

### Schritt 5 — Story-Status nach Implementierung setzen

**Den Story-Status setzt ausschließlich der Session-Treiber.** Welcher Endstatus gesetzt wird, haengt vom Einstieg ab:

**A) Volles `implementiere` / From-existing-plan (volle Loops):** nach Abschluss von Schritt 7 (Closure) des Outer Loops. Das Outer-Verdikt-PM-Leaf faellt den Outer-Verdikt (OK/Gap), beruehrt aber das Story-Frontmatter nie.
1. Nur bei Outer-Verdikt `OK`: Story-Frontmatter `status: planned` → `status: reviewed` **und** Auto-Commit im Worktree — genau **ein** Code-Commit (s. `## Auto-Commit pro Story`).
2. Meldung: *„Implementierung inkl. Inner-Loop + Delivery-Inspection abgeschlossen. Story-Status auf `reviewed` gesetzt."*
3. Kein `OK` (Hard-Stop bei offenem 🔴 nach Cap): **kein** Statuswechsel — Story bleibt `planned` (nicht `reviewed`); **kein Auto-Commit** (Arbeit bleibt uncommitted im Worktree); Rest-Findings-Bericht + User-Eskalation (s. Implementations-Flow).

**B) `implementiere nur` (Lean Single-Pass):** kein Inner-Loop, keine Reviewer, keine Delivery-Inspection — der Session-Treiber setzt direkt nach dem Build/Test-Ergebnis.
1. Build/Test slice-scoped gruen (innerhalb von max. 5 Fix-Versuchen): `status: planned` → `status: implemented` **und** Auto-Commit im Worktree — genau **ein** Code-Commit (s. `## Auto-Commit pro Story`).
   Meldung: *„Schlanke Umsetzung abgeschlossen, Build/Test gruen. Story-Status auf `implemented` gesetzt (roh umgesetzt, nicht reviewed)."*
2. Build/Test nach 5 Fix-Versuchen weiterhin rot: `status: planned` → `status: blocked` (**kein** `implemented`, **kein Auto-Commit** — Aenderungen bleiben uncommitted).
   Meldung: *„⚠️ Build/Test bleibt nach 5 Fix-Versuchen rot. Story-Status auf `blocked` gesetzt — nicht `implemented`. [Letzter Fehler + Kurz-Diagnose]."*

**Status-Maschine (Story):** `offen` → `ready` → `planned` (durch `plane`) → `implemented` (durch `implementiere nur`, gruen) / `reviewed` (durch volles `implementiere`) / `blocked` (durch `implementiere nur`, rot nach 5 Fix-Versuchen) → `done`/`accepted` (setzt der Nutzer als PM manuell). `implemented` und `reviewed` sind garantiert gruene Zustaende.

---

## Worktree-Routing (schreibende Implement-Einstiege — nach dem Story-Gate)

Ersetzt den frueheren Branch-Guard (FEAT-001, D1–D4). Statt auf dem Default-Branch zu **stoppen**,
**routet** feature-delivery jeden Implement-Lauf in einen **eigenen git-Worktree je Feature** — so
laufen mehrere Features echt parallel und kollisionsfrei, waehrend die Session auf `master` als
ruhigem Heimathafen bleibt. **Kein master-STOPP mehr.**

**Reihenfolge:** Das **Story-Gate laeuft zuerst** (Schritt 1–3: Frontmatter gelesen, `type`/`status`/
`depends_on` validiert). **Erst danach** — und nur fuer die schreibenden Implement-Einstiege — routet
diese Phase anhand von `parent` + `slug` aus dem bereits gelesenen Frontmatter. Danach startet der
Implementations-Flow (Hard Gate → Scribes …) auf dem Worktree-Pfad.

**Betroffene Einstiege (routen):** `implementiere`/`implement`/`setze um`/`liefere`/`umsetzen`/
`feature-delivery`/`fix`, `implementiere nur` sowie From-existing-plan (`setze plan X um`/
`implementiere plan X`/`fuehre plan X aus`) — jeder Einstieg, der **Produkt-Code** schreibt.

**NICHT betroffen (routen nicht — bleiben, wo sie sind):**
- **`plane`/`plan`/`plane nur`/…** — schreibt nur die Plan-Datei nach `requests/` (ausserhalb des Repos,
  auf der Session-cwd). Kein Worktree, kein Branch-Wechsel, kein Commit (FEAT-001 D5). Auch auf dem
  Default-Branch kein STOPP.
- **Review-Trigger** (`code-inspection`, `delivery-inspection`) — arbeiten uncommitted-scoped bzw. gegen
  den Merge-Base und branch-unabhaengig; sie routen nicht.

### Namensableitung `feat-<nnn>-<slug>`
- `<nnn>` = **stabile Parent-`FEAT-NNN`** aus dem `parent`-Frontmatter der Story (dreistellig) — **nicht**
  die naechste freie Branch-Nummer (anders als der alte Branch-Guard). Beispiel: `parent: FEAT-042` → `042`.
- `<slug>` = **Feature-Slug** (`slug`-Frontmatter des Parent-Features; ersatzweise der Story-Slug).

### Pfade (verbindlich, absolut)
- `<project-root>` = Session-cwd — bleibt **unveraendert** (**kein** `EnterWorktree`).
- `<repo-dir>` = das git-Repo (`.git`) — **aus der CLAUDE.md-Projektmap lesen, nicht hardcoden**; liegt
  das Repo direkt auf Top-Level, ist `<repo-dir>` == `<project-root>`.
- Worktree-Ort = `<project-root>/worktrees/feat-<nnn>-<slug>/` (Geschwister zum Repo, ausserhalb des Repos).

### Reuse-Erkennung → wiederverwenden ODER anlegen
1. **Vorhandenen Worktree/Branch suchen:**
   ```
   git -C <repo-dir> worktree list
   git -C <repo-dir> branch --list "feat-<nnn>-*"
   ```
2. **`feat-<nnn>-*` existiert** (Branch und/oder Worktree) → **wiederverwenden**: der zugehoerige
   Worktree-Pfad wird CODE_ROOT. **Kein** neues `worktree add`. So landet eine zweite Story desselben
   Features im selben Worktree.
3. **Existiert nicht** → **anlegen** (nicht-destruktiv: nur ein neuer Worktree + Branch, kein Commit,
   kein Reset, kein Force):
   ```
   git -C <repo-dir> worktree add <project-root>/worktrees/feat-<nnn>-<slug> -b feat-<nnn>-<slug> HEAD
   ```

Routing laeuft **automatisch** (kein Bestaetigungs-Stopp — das Entfernen des master-STOPP ist der Zweck).

### CODE_ROOT weiterreichen
Der aufgeloeste Worktree-Pfad ist ab hier **CODE_ROOT**. **Alle** Produkt-Code-Operationen — Scribes,
Build, Test, Reviewer, Fix-Planer, jeder Sub-Agent, jeder dev-mcp-/codebase-analyzer-Call — laufen ueber
**Absolutpfade** auf CODE_ROOT (Threading-Regel im Detail:
[flows/implementation-flow.md → Worktree / CODE_ROOT](flows/implementation-flow.md)). `requests/` (Plan +
SecondBrain + Stories) bleibt auf `<project-root>` — **nur der Produkt-Code** liegt im Worktree.

**Transparenz:** Vor dem ersten Code-Write ankuendigen, welcher Worktree genutzt/angelegt wird:
`"Worktree-Routing: [nutze|lege an] worktrees/feat-<nnn>-<slug> (CODE_ROOT)."`

### Defensive: Story ohne `parent`
Laesst sich `feat-<nnn>-…` mangels `parent`-Frontmatter **nicht** ableiten:
**STOPP — Flow startet nicht, kein `worktree add`.** Meldung: *„⛔ Worktree-Routing nicht moeglich:
Story `[ID]` hat kein `parent`-Feld — der Feature-Branch `feat-<nnn>-<slug>` ist nicht ableitbar.
Bitte `parent: FEAT-NNN` in der Story ergaenzen (garantiert durch STORY-004 Feature-Zwang) und erneut
starten."* Kein Fallback-Branch, kein Raten der Nummer.

---

## Auto-Commit pro Story (schreibende Implement-Einstiege — nur bei Gruen)

Ergaenzt das Worktree-Routing (FEAT-001, D5). Nach **erfolgreicher** Implementierung einer Story erstellt
der **Session-Treiber** **genau einen** Code-Commit im Feature-Worktree (CODE_ROOT) — so entsteht pro
Story eine saubere, sofort review-/merge-bare Historie. **Kein Auto-Push, kein Auto-PR** — das
Zusammenfuehren bleibt manuell (FEAT-001 D8).

### Wann committet wird
- **Nur schreibende Implement-Einstiege** — volles `implementiere`/Synonyme, `implementiere nur`,
  From-existing-plan. **Nicht `plane`** (schreibt nur die Plan-Datei nach `requests/`, kein Code, kein
  Worktree → nichts zu committen).
- **Nur bei Gruen, ein Commit pro Story:**

  | Einstieg | Commit-Zeitpunkt | Story-Status beim Commit |
  |----------|------------------|--------------------------|
  | Volles `implementiere` / From-existing-plan | in der Closure, **nur** bei Outer-Verdikt `OK` | → `reviewed` |
  | `implementiere nur` | nach slice-scoped Build/Test gruen (≤ 5 Fix-Versuche) | → `implemented` |

### Wann NICHT committet wird (Negativfaelle)
- **`blocked` / rot:** `implementiere nur` rot nach 5 Fix-Versuchen → `blocked`; volles `implementiere`
  mit offenem 🔴 nach dem Max-5-Cap (Story bleibt `planned`) → **kein Commit.** Die Arbeit bleibt
  **uncommitted** im Worktree, damit der Nutzer den Zwischenstand roh sieht.
- **`plane`:** kein Worktree, kein Code → **kein Auto-Commit** (Abgrenzung, FEAT-001 D5).

### Was committet wird — nur Code, kein selektives Staging
`requests/` (Stories, Plaene, SecondBrain) liegt **ausserhalb** des Repos (auf `<project-root>`, nicht in
CODE_ROOT) → git im Worktree sieht Stories/Plaene **gar nicht**. Deshalb **kein selektives Staging noetig**
und **kein Risiko**, eine Story oder einen Plan mitzucommitten. Der Story-Status-Flip (→
`implemented`/`reviewed`) passiert in `requests/` (extern) und ist **nicht** Teil des Commits.

### Commit-Message — ohne interne IDs
Message ueber den [`commit-message`](../commit-message/SKILL.md)-Skill, gespeist aus **Story-Titel/-Name**:
- Der Titel **darf** eine DevOps-ID enthalten (z. B. `AB#12345`) — die bleibt erhalten.
- Die Message enthaelt **weder** die interne `STORY-NNN`- **noch** die `FEAT-NNN`-Nummer (harness-interne
  IDs gehoeren nicht in die Code-Historie). Der `commit-message`-Aufruf wird entsprechend parametrisiert
  (Titel nutzen, interne IDs ausschliessen) — **ohne** Aenderung am `commit-message`-Skill selbst.

### Ausfuehrung (nicht-destruktiv, auf CODE_ROOT)
```
git -C <CODE_ROOT> add -A
git -C <CODE_ROOT> commit -m "<commit-message aus Titel, ohne STORY-/FEAT-Nummer>"
```
`add -A` ist ungefaehrlich: der Worktree enthaelt nur Produkt-Code (`requests/` liegt ausserhalb). Kein
`push`, kein `--force`, kein Reset.

**Transparenz:** Nach dem Commit im Chat melden:
`"Auto-Commit auf feat-<nnn>-<slug>: <kurztitel> (nur Code, kein Push)."`

---

## Package-Feed-Gate (vor Phase 1+2 — nur bei Package-Install-Tasks)

**Auslöser** — Gate aktiviert wenn Task/Anforderung enthält:
- PyPI: `pip install`, `requirements.txt`, `pyproject.toml`, privater Feed
- NuGet: `dotnet add package`, `.csproj PackageReference`, NuGet-Feed-Referenz
- npm: `npm install`, `yarn add`, `pnpm add`, `package.json` mit privatem Registry

**Bei Auslöser: Orchestrator stellt Pflicht-Fragen — blockierend.**
Kein Plan wird erstellt bevor alle relevanten Felder beantwortet sind.

### PyPI-Checklist

1. Package-Quelle: PyPI-Standard / privater Feed / lokales .whl?
2. Falls privat: Feed-URL?
3. Credential-Typ: Token / Basic Auth?
4. Package-Existenz im Feed bestätigt (Test-Install oder Registry-Suche)?

⚠️ Hinweis: Privater PyPI-Feed → `--extra-index-url` verwenden, nicht `--index-url` (STORY-024).

### NuGet-Checklist

1. Feed-URL (JFrog Artifactory / Azure Artifacts / intern)?
2. Credential-Typ: API-Key / PAT?
3. nuget.config vorhanden oder generieren?
4. Package-Existenz im Feed bestätigt?

### npm-Checklist

1. Registry-URL (abweichend von registry.npmjs.org)?
2. .npmrc-Konfiguration vorhanden?
3. Token-Typ: npm token / PAT?
4. Package-Existenz im Registry bestätigt?

**Sobald alle Felder beantwortet:** weiter mit Phase 1+2.  
**Fehlende Antworten:** Orchestrator wartet — kein Plan ohne vollständige Checklist.

---

## Einstiege

### Plan-only (`plane`, `plan`, `plane nur`, `plane only`, `nur planen`, `erstelle einen Plan`)

**Immer lean/solo.** Der Orchestrator (`plan-agent`, Opus) plant solo — **keine Scouts, kein
Topic-Planer, kein Plan-Review-Loop, keine Reviewer-Subagents**. Plan persistiert als
`requests/plans/plan-<feature>.md`, Story-Status → `planned` (Frontmatter `status: planned` +
`plan`-Referenz, s. Story-Gate Schritt 4) → **STOPP**.

**Kein Auto-Implement.** `plane` kettet **nie** automatisch in den Implementations-Flow. Nutzer
reviewt die Datei und setzt bei Bedarf explizit mit From-existing-plan (`setze plan <X> um`) fort —
Planung und Umsetzung sind getrennte, explizite Schritte.

`plane nur` / `plane only` sind **bedeutungsgleiche Aliase** von `plane` — identisches Verhalten
(lean, stoppt).

*Warum:* Reiner Planungs-Use-Case ist real. `plane` erzeugt hier bewusst keinen Code — regelkonformer, nutzergetriggerter Ausstieg.

### Implementieren — volle Loops (`implementiere X`, `implement X`, `setze X um`, `liefere X`, `umsetzen`, `feature-delivery`, `fix`)

Setzt einen **existierenden** Plan um — **mit allen Schleifen**: Scribes → Build/Test → Inner-Loop
(max. 5 Runden, 7 Reviewer, PL/PM, SecondBrain) → Outer-Delivery-Inspection. Story-Status → `reviewed`
(bei Outer-Verdikt `OK`, s. Story-Gate Schritt 5 A).

**Plant nicht mehr selbst.** Voraussetzung ist ein vorhandener Plan → Story `status: planned` mit
`plan`-Referenz (Already-Planned-Path, Story-Gate Schritt 2). Auf `status: ready` **ohne** Plan →
**STOPP + Hinweis** *„erst `plane [ID]` ausfuehren"* — kein Auto-Planning (Story-Gate Schritt 2).

`implement` / `setze um` / `liefere` / `umsetzen` / `feature-delivery` / `fix` sind Synonyme —
identisches Verhalten wie `implementiere`.

*Warum:* Planung und Umsetzung sind entkoppelt; `implementiere` konsumiert nur einen fertigen Plan.

### Implementieren nur — Lean Single-Pass (`implementiere nur X`)

Schlanker **Scribe-Einzeldurchlauf**: wendet den vorhandenen Plan Slice fuer Slice an, faehrt
slice-scoped Build/Test **bis gruen (max. 5 Fix-Versuche)** — **keine** Reviewer, **keine** PL-Runden,
**kein** PM-Urteil, **kein** SecondBrain, **keine** Outer-Delivery-Inspection. Umgeht damit bewusst
die gesamte Zwei-Schleifen-Architektur.

- **Voraussetzung** wie beim vollen `implementiere`: Story `status: planned` mit Plan (auf `ready` ohne
  Plan → STOPP + „erst `plane`").
- **Erfolg** (Build/Test gruen ≤ 5 Versuche) → Story-Status → `implemented` (roh umgesetzt, nicht reviewed).
- **Rot nach 5 Fix-Versuchen** → STOPP; Story-Status → `blocked` (nicht `implemented`) + Meldung an den Nutzer.
- **Test-First-Scribe-Qualitaet (§8) bleibt voll** — nur die Review-Ebene entfaellt.

Ablauf-Detail: [flows/implementation-flow.md → Implementiere-nur-Einstieg](flows/implementation-flow.md).

*Warum:* Waehlbare Umsetzungstiefe pro Story; roher, schneller Durchlauf ohne Review-Overhead, wenn der
Nutzer als PM den Review spaeter selbst (oder gar nicht) anstoesst. Abgrenzung zu `implementiere lean impl`
(dort bleiben PL/PM/SecondBrain, nur die Reviewer-Zahl sinkt auf 3).

### From-existing-plan (`setze plan <X> um`, `implementiere plan <X>`, `fuehre plan <X> aus`)

Laedt `requests/plans/plan-<feature>.md` → ueberspringt Planungs-Flow → direkt in Implementations-Flow
(**volle Loops**, wie `implementiere`). Hard Gate (Readiness) prueft trotzdem die Umsetzbarkeit des
geladenen Plans. Story-Status → `reviewed` (bei Outer-Verdikt `OK`).

*Warum:* Schliesst Plan-only sauber ab; erbt den Zweck des frueheren End-to-End-Umsetzungspfads.

---

### Review-on-Demand — beratend (`code-inspection`, `delivery-inspection FEATURE-X`)

Zwei **beratende** Review-Trigger auf den aktuellen Arbeitsstand — **kein Auto-Fix, kein Status-Flip,
kein Auto-Implement, kein SecondBrain, keine PL/PM-Runden.** Reiner Befund; der Nutzer bleibt PM und
entscheidet nach dem Report selbst ueber Nachschaerfen oder Abnahme.

- **`code-inspection`** — Code-Qualitaet/Korrektheit ueber den Diff. **Kein Feature noetig.** 6
  `implement-review-*`-Agents (risk · design-principles · craft · auditor · guard · readiness) laufen
  parallel im Vordergrund **ohne Fix-Anwendung**.
- **`delivery-inspection FEATURE-X`** — Anforderungserfuellung. **Feature-Bezug PFLICHT und explizit**;
  ohne Feature-Argument → **STOPP** + Aufforderung, das Feature anzugeben (keine Pruefung). Laedt das
  Feature, folgt den referenzierten Stories, aggregiert deren ACs und prueft den Diff dagegen (Reuse des
  `delivery-inspection`-Skills, advisory single-pass — nur die 6 Reviewer, ohne Fix-Loop).
- **Default-Scope beider** = alle uncommitteten Aenderungen inkl. untracked (`git diff HEAD` +
  untracked-Liste), branch-unabhaengig. **Merge-Base-Alternative** (`git diff <merge-base>..HEAD`) bei
  bereits committetem Feature (uncommitted-Scope leer) oder auf explizite Anforderung.
- **Kein Worktree-Routing** (s. Worktree-Routing) — Review-Trigger routen nicht und stoppen nicht auf dem
  Default-Branch; ohne Delta nur Hinweis *„kein Feature-Delta"*.
- **Ausgabe:** Befund-Datei `Requests/reviews/<feature>-<inspection>-<n>.md` (nach Story bzw. Bereich
  gruppiert, `<n>` = laufender Zaehler je Feature+Inspection-Typ) **+ Chat-Kurzfassung**. **Kein**
  Story-Status geaendert, **kein** Auto-Fix. Nachschaerfen bleibt manuell: `implementiere STORY-X`.

Ablauf-Detail: [flows/review-flow.md](flows/review-flow.md).

*Warum:* PM-Abnahme-Use-Case nach mehreren schlank umgesetzten Stories — Reviewer schauen auf Abruf ueber den Gesamtstand, ohne selbst nachzuschaerfen oder Status zu flippen.

---

## Lean-Mode (`schlank planen`, `lean planen`, `kompakt planen`, `Solo-Planung`) — **Default**

| Aspekt | Regel |
|--------|-------|
| Wer entscheidet | **Default.** Aktiv ohne Zusatz. `schlank planen`/`lean planen` etc. bleiben als explizite Synonyme gueltig. |
| Was schrumpft | Nur Planung: Orchestrator (Opus) plant + prueft + reviewed in sich selbst — keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop. |
| Was bleibt voll | Voller Scribe, alle Gates, Test-First (§8/F1) — immer. Impl-Review: Standard 7 Reviewer. |
| `lean impl` (opt-in) | Reduziert Impl-Review auf 3 Reviewer (risk · craft · readiness) statt 7 — oder collapsed via `impl-quality-review-agent` (1 Agent, alle Lenses intern, 1 Approval statt 7 parallele). Scribes, Gates, Test-First bleiben voll. Aktivierung: `implementiere lean impl …` — explizit anfordern, kein Standard. Collapsed: `implementiere lean impl collapsed`. |
| Kombinierbar mit | Plan-Trigger (`plane`/`plan`/…). **NICHT** mit From-existing-plan (Plan liegt schon vor). |

*Framing:* Planung ist immer lean/solo — schnell und fokussiert. Für Tiefe sorgen der Plan-Coverage-Check (delivery-inspection auf den Plan) und das Uncertainty Audit, nicht ein separater Strong-Modus.

---

## Micro-Change-Modus (Fastpath)

Aktiviert durch zwei alternative Heuristiken:

**Heuristik A — Visual-Micro (alle vier Signale):**
1. Aenderung < 10 Zeilen gesamt
2. Genau eine Datei betroffen
3. Rein visuell (Zahl, Farbe, CSS, HTML-Attribut, Abstand) — kein Verhaltens-Delta
4. Kein neues Verhalten (keine neue Interaktion, kein Datenfluss-Delta)

**Heuristik B — Service-Micro (alle drei Signale):**
1. Aenderungen ausschliesslich in einem einzigen Service (ein Angular-Service/Component ODER ein .NET-Service)
2. Kein Schema-Change: keine Migration, kein neues Interface, kein neues DTO/Modell
3. Kein Cross-Service-Contract-Delta: keine API-Signatur-Aenderung, kein Shared-Model-Update

**Aktivierung:** Story hat `micro_change: true` (Heuristik A) oder `micro_change: service` (Heuristik B) im Frontmatter
**oder** Orchestrator erkennt alle Signale und kuendigt explizit an.

| Aspekt | Normal | Heuristik A (Visual) | Heuristik B (Service) |
|--------|--------|----------------------|-----------------------|
| Plan-File | Pflicht | entfaellt | entfaellt |
| Story-Status | `ready → planned → implemented` | `ready → implemented` | `ready → implemented` |
| Scribes | 1-10 Subagents | entfaellt — Session-Treiber editiert direkt | Scribe bleibt (Scope kann > 10 Zeilen sein) |
| Reviewer | 7 (oder scope-adjusted) | 1 Reviewer: risk | 2 Reviewer: risk · craft |
| Delivery-Inspection | Pflicht | entfaellt | entfaellt |
| Build + Test | Pflicht | Pflicht | Pflicht |
| Test-First §8/F1 | Pflicht | Pflicht | Pflicht |

**Grenze:** Trifft auch nur eines der Signale der aktiven Heuristik nicht zu → kein Fastpath; normaler Flow.
Scope-Einschaetzung "klingt klein" reicht nicht — alle Kriterien muessen messbar zutreffen.

**Transparenz-Pflicht:**
- Heuristik A: `"Micro-Change erkannt (Visual) — Fastpath aktiv: direkter Edit, 1 Reviewer (risk), kein Plan-File."`
- Heuristik B: `"Micro-Change erkannt (Service-Scope) — Fastpath aktiv: Scribe, 2 Reviewer (risk · craft), kein Plan-File."`

---

## Flows

→ **Planungs-Flow:** [flows/planning-flow.md](flows/planning-flow.md)
→ **Implementations-Flow:** [flows/implementation-flow.md](flows/implementation-flow.md)
→ **Review-on-Demand-Flow:** [flows/review-flow.md](flows/review-flow.md)

---

## References

- [../software-design-principles/SKILL.md](../software-design-principles/SKILL.md) — **Software-Design-Philosophie** (Nordstern): sauber · funktional · getestet · wartbar · nachhaltig — gilt automatisch für Planning und Implementation
- [references/principles-cleancode.md](references/principles-cleancode.md) — IODA · IOSP · SOLID · Clean Code · YAGNI · DRY · KISS · DDD-Leitplanken · Security · Fehlerbehandlung · Inter-Service-Kommunikation
- [references/subagent-prompts.md](references/subagent-prompts.md) — Auftrags-Vorlagen fuer alle Sub-Agents
- [references/archunit-baseline-template.cs](references/archunit-baseline-template.cs) — ArchUnitNET Regelklasse (Gate-2-Bootstrap)
- [references/eslint-baseline.json](references/eslint-baseline.json) — Angular ESLint Baseline (Gate-2-Bootstrap)
- [references/eslint-boundaries-template.js](references/eslint-boundaries-template.js) — Zone-Grenzen Template (optional, eslint-plugin-boundaries)

---

## Externe Skill-Referenzen

- [delivery-inspection](../delivery-inspection/SKILL.md) — Pruefung vor Auslieferung: 6 Reviewer pruefen Anforderungserfuellung (nach Impl-Fix-Loop, vor Closure)
- [test-design](../test-design/SKILL.md) — AAA · Namenskonvention · Magic Strings (Pflicht fuer Scribes, alle implement-review-Agents, Fix-Planer)
- [`dev-tooling`](../dev-tooling/SKILL.md) — MCP-Gateway: dev-mcp (Build, Test, Scaffolding, run_inspectcode, lint_angular_project), codebase-analyzer (Index, review_git_diff, statische Analyse), build-log-filter (ng serve, Shell-Fallback)

---

## Pflegehinweis

Trigger: `description` YAML + `when_to_use` aktuell halten. Flows: nur in `flows/planning-flow.md` und `flows/implementation-flow.md` aendern. Sub-Agent-Prompts: nur in `references/subagent-prompts.md`.

MDC-Selektor-Annotationsliste: Bei Angular Material Major Release auf neue MDC-Klassen prüfen → `flows/planning-flow.md` Abschnitt `## MDC-Selektor-Annotationsliste` aktualisieren.
