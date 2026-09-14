# Durchgerechnetes Beispiel: BAR (Voranmelde-App)

| Abteilung | Bestehende Features |
|---|---|
| `anmeldung` | `number-blocks`, `my-articles` (Selbstverwaltung), `articles` (Admin-Übersicht) |
| `verkaeuferverwaltung` | `sellers` (Verwaltung), `profile`, `register`, `set-password` (Selbstverwaltung) |
| `stammdaten` | `brands`, `categories`, `seller-types` |
| `betrieb` | `settings` |
| `export` | `export` — Abteilung und Feature fallen hier zusammen |
| außerhalb | `login` (Zugang) |
| außerhalb | `home` (Sichtkomposition — liest über mehrere Abteilungen hinweg) |
| außerhalb | `countdown-embed` (öffentliche Exposition — liest nur bei Betrieb, aber ohne Login und ohne AppShell) |
| außerhalb | `not-found` (rein technisch, kein Backend-Bezug) |

`register` und `set-password` bei `verkaeuferverwaltung` statt bei „Zugang" ist eine Lesart,
keine feststehende Tatsache — beide legen den Verkäufer-Datensatz selbst an/aktivieren, statt
nur einen bestehenden zu prüfen wie `login`.

**`countdown-embed` ist kein zweiter Fall von Home, auch wenn beide „außerhalb" stehen.** Home
liest quer über mehrere Abteilungen — echte Sichtkomposition. Countdown-Embed liest nur eine
einzige Abteilung (Betrieb, die Basar-Termine), ganz normal über eine Anlaufstelle — nur ohne
Login und ohne AppShell, weil die Route öffentlich ist und sich per `<iframe>` einbetten lässt.
Das ist eine Zugriffs-/Darstellungsfrage, keine Abteilungsfrage. Genau diese Kategorie —
öffentlich lesbar, dünn, keine eigene Akte — hat BARs Backend bereits als eigenen `Public/`-
Ordner, getrennt von `Settings`/Betrieb.

**Die Abteilungsebene ist reine Navigationshilfe, keine technische Notwendigkeit** — die
ESLint-Grenze verbietet Cross-Feature-Imports unabhängig von der Ordnertiefe. Bei wenigen
Features lohnt sie sich nicht; bei BARs 16 Features schon. Login, Home, Countdown-Embed und
Not-Found liegen dabei **innerhalb** von `features/`, nur ohne Abteilungs-Unterordner — sie
sind keine eigene Ebene neben `features/`, nur Features ohne Abteilung:

```
src/app/
├── core/                              ← auth, theme, shell
├── shared/                            ← dumme UI, kein Abteilungsbezug
│
└── features/
      ├── anmeldung/
      │     ├── number-blocks/
      │     ├── my-articles/
      │     └── articles/
      │
      ├── verkaeuferverwaltung/
      │     ├── sellers/
      │     ├── profile/
      │     ├── register/
      │     └── set-password/
      │
      ├── stammdaten/
      │     ├── brands/
      │     ├── categories/
      │     └── seller-types/
      │
      ├── betrieb/
      │     └── settings/
      │
      ├── export/
      │     └── export/
      │
      ├── login/               ← Zugang
      ├── home/                ← Sichtkomposition
      ├── countdown-embed/     ← öffentliche Exposition (Betrieb-Daten, ohne Login/Shell)
      └── not-found/           ← rein technisch
```

Jedes Feature bleibt innen wie im SKILL.md beschrieben (`<name>.routes.ts`,
`<name>-api.service.ts`, `pages/`) — die Abteilungsebene ändert nur, wo der Ordner liegt,
nicht was drin ist.
