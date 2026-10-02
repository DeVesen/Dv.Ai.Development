# Operation: Projektstruktur & Konventionen

Feature-First-Ordnerstruktur, Import-Grenzen, Component-Typen, Naming, Extraktion.

**Vollständige Referenz:** [feature-first-layout.md](feature-first-layout.md)

**Auch laden:** Facade-/State-Regeln → [signal-architecture.md](signal-architecture.md). Feature-Routen → [define-routes.md](define-routes.md).

---

## Überblick

- **Gruppierung nach Feature, nicht nach Dateityp.** `features/[name]/` mit `pages/` (routet) und `components/` (nicht routet) als Geschwister.
- **Import-Grenze:** `features/[a]` importiert **nie** aus `features/[b]`. Gemeinsames wandert nach `services/` (Rolle `core`), `models/` oder `components/` (Rolle `shared/ui`, erst ab ≥2 Nutzern).
- **Facade:** `[feature].service.ts` besitzt State und API-Zugriff; Pages delegieren.
- **Routing:** ab 2 Routen eigenes `[feature].routes.ts` + `loadChildren`.
- **Naming versionsabhängig:** ab v20 ohne `.component`-Dateisuffix — Angular-Version vor Anlage prüfen; Bestandsschema im Projekt hat Vorrang.

Struktur-Baum, Path-Aliase, ESLint-Enforcement, Naming-Tabellen, Feature-Checklist, Anti-Patterns → [feature-first-layout.md](feature-first-layout.md).

---

## Guidance-Priorität (Kurz)

Projekt-Bestand → `AGENTS.md` → Language-Guidance → dieses Dokument → offizieller Style Guide.
