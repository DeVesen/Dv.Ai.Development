# Ablage der Orchestratoren

Nur mit `--ablage <E>`. Der Aufruf kopiert Abschlussbericht und Bericht-Daten in die Ablage der Session-Kette je Slug, gemeinsam für den Haupt-Checkout und alle Worktrees; `--neu` beginnt die Ablage der Etappe neu. Die Ausgabe zeigst du nicht; endet der Aufruf mit Fehler, folgt der Bericht trotzdem.

## spec-review-orchestrator
`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`, dazu `--datei` für `<BF1>`, `<BF2>` und `<FK>` je nur wenn vorhanden.

## plan-orchestrator
`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`, dazu `--datei` für `<BF1>`, `<BF2>` und `<FK>` je nur wenn vorhanden.

## implementation-orchestrator
`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --plan "<P>" --neu --datei "<AB>" --datei "<BR>" --datei "<FK>"`, dazu `--datei` für `<BF1>` und `<BF2>` je nur wenn die Runde lief.
