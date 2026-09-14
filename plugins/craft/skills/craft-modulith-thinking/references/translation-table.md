# Rückübersetzung — Unternehmensbild ↔ Fachbegriff

| Unternehmensbild | Fachbegriff | Vertiefung |
|---|---|---|
| Unternehmen | Modulith | `craft-architecture-styles` — Deployment-Achse |
| Fachabteilung | Bounded Context | `craft-design-principles` → `references/ddd.md` |
| Aktenablage der Abteilung | eigenes Schema / eigener DbContext | `craft-architecture-styles/references/deployment.md` |
| Anlaufstelle der Abteilung | Port / Contracts-Projekt | `craft-design-principles/references/ddd.md` (Repository) |
| Verbindungsstelle über den Abteilungen | Context-Mapping-Schicht (ACL, Open Host Service, Published Language) | `craft-design-principles/references/ddd.md` |
| zentrale Koordination vs. eigenständige Reaktion | Orchestrierung vs. Choreografie (In-Process Domain Events) | `craft-architecture-styles/references/data-flow.md` |
| Telefon / E-Mail / Kundenportal | Transport-Adapter (REST, tRPC, SignalR) | — kein Bestandteil der Abteilung |
| Abteilung zieht aus | Modul-Extraktion zu Microservice | `craft-architecture-styles/references/deployment.md` |
| Akte | Aggregate | `craft-design-principles/references/ddd.md` |
| Aktenverantwortlicher | Aggregate Root | `craft-design-principles/references/ddd.md` |
| Beleg innerhalb der Akte | Entity (nicht-Root) | `craft-design-principles/references/ddd.md` |
| reine Angabe | Value Object | `craft-design-principles/references/ddd.md` |
| Logbucheintrag | Domain Event | `craft-design-principles/references/ddd.md` |
| Vorzimmer | Application-Schicht | `craft-design-principles/references/ddd.md` |
| Sachbearbeiter | Domain | `craft-design-principles/references/ddd.md` |
| Registratur | Repository / Infrastructure | `craft-design-principles/references/ddd.md` |
| Fachreferent ohne eigene Akte | Domain Service | `craft-design-principles/references/ddd.md` |
| Konzern | Verbund mehrerer eigenständiger Moduliths/Systeme | — kein einzelner Fachbegriff |
| Tochterunternehmen | eigenständiges System mit eigenem Deployment | `craft-architecture-styles/references/deployment.md` |
| Austauschformat zwischen zwei Firmen | Published Language (Context Mapping) | `craft-design-principles/references/ddd.md` |
| Zimmer innerhalb der Abteilung | kompilierbare Einheit mit eigener Referenzgrenze | `craft-dotnet-modulith-bridge` (`.csproj`) · `craft-angular-modulith-bridge` (kein 1:1-Äquivalent) |
