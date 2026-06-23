/**
 * eslint-plugin-boundaries — Zonen-Template für Angular-Projekte
 *
 * WICHTIG: Zonen sind projektspezifisch — vor Aktivierung an die tatsächliche
 * Ordnerstruktur anpassen. Nicht blind übernehmen.
 *
 * Voraussetzung: npm install --save-dev eslint-plugin-boundaries
 * Einbinden: In .eslintrc.json unter "plugins": ["boundaries"] und dieses
 * Template als separates overrides-Element oder eigene .eslintrc.js einhängen.
 *
 * Hinweis: eslint-plugin-boundaries prüft nur Import-Statements, nicht
 * Inhalt/Benennung/DI. Ob eine Klasse namens *ApiService wirklich nur HttpClient
 * injiziert oder ob ein Feature-Service HttpClient direkt nutzt — das prüft
 * erst analyze_angular_architecture (dev-mcp, Strang 3, nachgelagert).
 *
 * Zonierung (Vorlage):
 *
 *   src/app/
 *   ├── core/
 *   │   └── api/          ← ApiServices (nur HttpClient, keine Logik)
 *   ├── shared/
 *   │   ├── components/   ← Dumb/Presentational Components
 *   │   ├── pipes/
 *   │   └── utils/
 *   └── features/
 *       └── <feature>/
 *           ├── pages/       ← Smart/Container Components
 *           ├── components/  ← Feature-spezifische Dumb Components
 *           └── services/    ← Feature-Services (nutzen ApiServices, kein HttpClient direkt)
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  plugins: ['boundaries'],

  settings: {
    'boundaries/elements': [
      {
        // ApiServices — HttpClient-Wrapper, keine fachliche Logik
        type: 'core-api',
        pattern: 'src/app/core/api/**/*',
      },
      {
        // Shared Dumb Components — rein presentational, keine Services
        type: 'shared-components',
        pattern: 'src/app/shared/components/**/*',
      },
      {
        // Shared Pipes
        type: 'shared-pipes',
        pattern: 'src/app/shared/pipes/**/*',
      },
      {
        // Shared Utils — pure Funktionen, keine Abhängigkeiten
        type: 'shared-utils',
        pattern: 'src/app/shared/utils/**/*',
      },
      {
        // Feature-Services — orchestrieren ApiServices, keine direkte HttpClient-Nutzung
        // capture[0] = Feature-Name für Cross-Feature-Prüfung
        type: 'feature-services',
        pattern: 'src/app/features/*/services/**/*',
        capture: ['featureName'],
      },
      {
        // Feature-Seiten / Smart/Container Components
        // capture[0] = Feature-Name
        type: 'feature-pages',
        pattern: 'src/app/features/*/pages/**/*',
        capture: ['featureName'],
      },
      {
        // Feature-spezifische Dumb Components
        // capture[0] = Feature-Name
        type: 'feature-components',
        pattern: 'src/app/features/*/components/**/*',
        capture: ['featureName'],
      },
    ],

    // Importmuster für interne Aliase — an tsconfig paths anpassen
    'boundaries/ignore': ['**/*.spec.ts', '**/*.spec.js'],
  },

  rules: {
    // -----------------------------------------------------------------------
    // Regel 1 — ApiService-Placement
    // ApiServices in core/api/. Feature-Services und Smart-Komponenten (pages)
    // dürfen sie importieren. Dumb-Components dürfen es NICHT (→ Regel 2).
    // -----------------------------------------------------------------------
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // core-api darf nur system-/library-Imports (kein from-Element)
          {
            from: 'core-api',
            allow: [],
          },
          // shared-components: keine Services, kein core-api — rein präsentational
          {
            from: 'shared-components',
            allow: ['shared-utils', 'shared-pipes'],
          },
          // shared-pipes: keine Services
          {
            from: 'shared-pipes',
            allow: ['shared-utils'],
          },
          // shared-utils: keine Abhängigkeiten auf andere Zonen
          {
            from: 'shared-utils',
            allow: [],
          },
          // feature-services: dürfen core-api, shared-utils, shared-pipes importieren
          // Kein Cross-Feature-Import (→ Regel 3)
          {
            from: 'feature-services',
            allow: ['core-api', 'shared-utils', 'shared-pipes'],
          },
          // feature-pages (Smart Components): dürfen core-api, feature-services
          // des GLEICHEN Features, shared-* und feature-components des eigenen Features
          {
            from: 'feature-pages',
            allow: [
              'core-api',
              'shared-components',
              'shared-pipes',
              'shared-utils',
              // Nur gleiche feature-services (gleicher featureName-capture)
              ['feature-services', { featureName: '${from.featureName}' }],
              ['feature-components', { featureName: '${from.featureName}' }],
            ],
          },
          // feature-components (Dumb): kein Service-Import, kein core-api
          // Nur shared-* erlaubt — Regel 2: Dumb-Components ohne Service-Import
          {
            from: 'feature-components',
            allow: ['shared-components', 'shared-pipes', 'shared-utils'],
          },
        ],
      },
    ],
  },

  overrides: [
    {
      // Spec-Dateien: gelockerte Regeln für Tests
      files: ['**/*.spec.ts'],
      rules: {
        'boundaries/element-types': 'off',
      },
    },
  ],
};

/*
 * Enthaltene Start-Regeln (bewusst klein gehalten):
 *
 * 1. ApiService-Placement:
 *    ApiServices liegen in core/api/; Feature-Services und Smart-Komponenten
 *    (pages) dürfen sie importieren. Dumb-Components nicht.
 *
 * 2. Dumb-Components ohne Service-Import:
 *    Typen in */components dürfen nicht aus */services oder core/api importieren.
 *    Nur shared-utils, shared-pipes, shared-components erlaubt.
 *
 * 3. Cross-Feature-Verbot:
 *    features/a darf nicht aus features/b importieren (gleicher featureName-
 *    Capture erzwingt Feature-Isolation). Jedes Feature ist sein eigener
 *    Bounded Context (principles-cleancode.md, DDD-A).
 *
 * 4. shared kennt keine Features:
 *    shared/* importiert nicht aus features/*. Getrennt durch die
 *    element-type-Regeln: shared-Zonen haben keinen Zugriff auf feature-Zonen.
 *
 * Grenze dieser Konfiguration:
 *    Nur Import-Statements werden geprüft. Ob ein *ApiService tatsächlich
 *    nur HttpClient injiziert oder ob ein Feature-Service HttpClient direkt
 *    nutzt — das sieht eslint-plugin-boundaries nicht. Diese Lücke schließt
 *    erst analyze_angular_architecture (dev-mcp, Strang 3, nachgelagert).
 */
