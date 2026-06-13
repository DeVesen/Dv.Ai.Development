# Operation: Describe-as-HTML (HTML + Mermaid Handoff)

Like describe-as-text but emits a single copy-paste-ready standalone HTML handoff document for a follow-up agent. Same Section A complexity note + Section B payload, watertight mode vs planning obligation rules, thread fidelity. Section B must embed Mermaid sequenceDiagram(s) for cross-layer/service flows discussed (FE↔BE, service A→B) and Mermaid classDiagram(s) for models/types with methods and notable functions when the thread supplies them.

## Before you respond

1. Read this file fully; for **Wasserdicht**, **Planning obligation**, **Section A** tier table, and **Section B** semantic headings, align with [op-describe-as-text.md](op-describe-as-text.md) (same priority order: Wasserdicht → planning-relevant → pure information).
2. Derive content **only** from the **current conversation** — same fidelity rules as describe-as-text (paths, code refs, no invented repo facts).
3. Mark gaps as **open questions** inside the HTML body.

## Mandatory Mermaid content (Section B / HTML body)

When the thread contains enough substance, include **dedicated subsections** with diagrams. Use **valid Mermaid syntax** inside `<pre class="mermaid">...</pre>` (see HTML shell).

### 1) Abläufe und Schnittstellen → `sequenceDiagram`

**Pflicht**, wenn die Unterhaltung **über Grenzen hinweg** kommunizierte oder skizzierte Abläufe enthält, z. B.:

- Frontend ↔ Backend / API
- Gateway ↔ downstream services
- Service A → Service B (interne Calls, Messages, HTTP, gleich welcher Kanal — aus dem Thread ableiten)

**Minimum:** ein `sequenceDiagram` mit **Participant-Namen**, die zur Unterhaltung passen (z. B. `participant FE as Angular UI`, `participant GW as Gateway`, …). Pfeile und Kurz-Labels (`->>` / `-->>`) sollen **nur** behaupten, was der Thread stützt; sonst **open question** im Text davor/danach.

**Optional:** mehrere Diagramme bei getrennten Flows (z. B. „Happy path" vs. „Fehlerpfad"), wenn der Thread das nahelegt.

**Wenn** der Thread **keinen** grenzüberschreitenden Ablauf hatte: kurzer Absatz **„Kein grenzüberschreitender Ablauf im Thread beschrieben — kein sequenceDiagram."** (kein Diagramm erfinden).

### 2) Modelle, Methoden, Funktionen → `classDiagram` (primär)

**Pflicht**, wenn die Unterhaltung **konkrete** Typen/Klassen/Interfaces **oder** benannte Methoden/Funktionen **mit Bezug** nannte (Sprache egal).

- **`classDiagram`:** Klassen/Interfaces als `class Name { ... }` mit **Methodensignaturen** soweit aus dem Thread bekannt (`+method(args)`); Felder/Properties nur wenn genannt.
- Mehrere zusammenhängende Typen: Beziehungen (`--|>`, `*--`, …) **nur** wenn der Thread eine Beziehung impliziert; sonst lose Klassen ohne falsche Vererbung.

**Alternative**, wenn der Thread **nur Prozeduren ohne OO-Modell** diskutiert hat: ein **`flowchart LR`** oder **`flowchart TD`** mit Knoten für die genannten **Funktionen** und deren caller/callee-Beziehung — aber **`classDiagram` bleibt bevorzugt**, sobald Modell-/Typnamen vorkommen.

**Wenn** keine Methoden/Typen im Thread: kurzer Absatz **„Keine konkreten Modelle oder Signaturen im Thread — kein Strukturdiagramm."**

### Diagramm-Qualität

- **Keine Halluzination:** keine zusätzlichen Services, Routen oder Methoden, die nicht im Thread vorkamen (Ausnahme: offensichtliche Platzhalter mit Klärhinweis in Begleittext).
- **`participant` / Klassennamen:** konsistent über alle Diagramme eines Dokuments.
- Sonderzeichen in Labels escapen oder verkürzen, sodass Mermaid parsbar bleibt.

## Mandatory response layout (assistant chat)

Same **two-part order** as describe-as-text:

### Section A — Short complexity note

Identical requirements to describe-as-text: coarse complexity, planning-overview tier **unless** Wasserdicht or non-planning handoff, disclaimer.

### Section B — Handoff as standalone HTML

Wrap the **entire HTML document** in **one** fenced code block with language tag **`html`**.

**Inside the HTML**, mirror the **semantic sections** from describe-as-text Section B as `<h2>` / `<section>` (German headings OK if user language is German):

1. Context
2. Goal (Ausgangslage / Ziel / Nutzen)
3. Code & Fundstellen
4. Beispiele aus der Unterhaltung
5. Referenzen (Skills, Regeln, Docs)
6. Acceptance criteria
7. Edge cases / open questions
8. Current vs desired behavior
9. **Planning obligation** — only when describe-as-text mandates it; never in Wasserdicht.

**Add two diagram sections** (with `<h2>`), placement recommended **after Goal** or **before Code & Fundstellen**:

- **`## Abläufe (Sequence)`** — `sequenceDiagram`(s) per rules above.
- **`## Modelle & Methoden (Struktur)`** — `classDiagram` or agreed fallback per rules above.

Use `<ul>`, `<li>`, `<p>`, `<code>` for body text. For **code references** from the thread, prefer plain text paths plus optional `<code>` — Cursor line refs may appear as monospace text.

## HTML shell (CDN Mermaid, copy-paste stable)

Use a minimal template like:

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Handoff — …</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  pre.mermaid { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  code { background: #f0f0f0; padding: 0.1em 0.35em; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <h1>…</h1>
  <!-- sections + pre.mermaid blocks -->
</main>
</body>
</html>
```

Adjust `lang` and `<title>` to the handoff. **Do not** rely on local npm or repo assets for Mermaid.

## Quality bar

Same as describe-as-text: executable handoff, thread fidelity, no invented code.

Additionally:

- Opening the HTML file in a **current browser** should render diagrams **without** extra tooling.
- Every **meaningful** cross-boundary flow from the thread maps to **sequenceDiagram** coverage or an explicit **why not**.
- Every **meaningful** model/signature discussion maps to **classDiagram** (or stated fallback) coverage or an explicit **why not**.
