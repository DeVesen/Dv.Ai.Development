# Dependency injection — delegated

Use **Angular Developer** references for `inject()`, providers, tokens, and injector hierarchy:

- [di-fundamentals.md](../../angular-developer/references/di-fundamentals.md)
- [creating-services.md](../../angular-developer/references/creating-services.md)
- [defining-providers.md](../../angular-developer/references/defining-providers.md)
- [injection-context.md](../../angular-developer/references/injection-context.md)
- [hierarchical-injectors.md](../../angular-developer/references/hierarchical-injectors.md)

**This skill:** API access from the UI goes **through the feature facade** (or helpers it composes); global cross-cutting services live under `src/app/services/` with `providedIn: 'root'` unless scoped by route — [SKILL.md](../SKILL.md).
