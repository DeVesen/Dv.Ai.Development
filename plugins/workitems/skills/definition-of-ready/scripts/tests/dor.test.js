'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const { loadCatalog } = require('../lib/catalog');
const { validate, aggregate, render } = require('../dor-verdict');
const { lint } = require('../dor-lint');

const scripts = path.join(__dirname, '..');
const catalog = loadCatalog();

function verdicts(overrides = {}) {
  return catalog.criteria.map((criterion) => ({
    id: criterion.id,
    urteil: 'erfüllt',
    begruendung: 'belegt',
    fundstelle: 'spec.md Z. 1',
    ...overrides[criterion.id],
  }));
}

function input(overrides = {}, extra = {}) {
  return { art: 'Spec', umfang: 'Einzel', quellen: ['spec.md'], hatUI: true, urteile: verdicts(overrides), ...extra };
}

const notApplicable = { urteil: 'nicht zutreffend', begruendung: 'kein UI', bestaetigt: true };

function readyInput() {
  return input({ 'UX-06': notApplicable });
}

test.describe('catalog', () => {
  test('liest 4 Blöcke mit stabilen IDs in Katalogreihenfolge', () => {
    const counts = Object.fromEntries(
      ['PF', 'UX', 'LM', 'PN'].map((key) => [key, catalog.criteria.filter((c) => c.block === key).length]),
    );
    assert.deepEqual(counts, { PF: 11, UX: 6, LM: 5, PN: 6 });
    assert.equal(catalog.criteria[0].id, 'PF-01');
    assert.equal(catalog.criteria.at(-1).id, 'PN-06');
  });

  test('erkennt genau die zwei doppelten Kriterien', () => {
    assert.deepEqual(catalog.duplicates, [
      { a: 'PF-10', b: 'LM-01' },
      { a: 'PF-11', b: 'LM-05' },
    ]);
    assert.equal(catalog.criteria.find((c) => c.id === 'LM-01').duplicateOf, 'PF-10');
  });

  test('markiert UI-Flags im UX-Block', () => {
    const flags = Object.fromEntries(
      catalog.criteria.filter((c) => c.block === 'UX').map((c) => [c.id, [c.uiOnly, c.alwaysChecked, c.onlyWithoutUi]]),
    );
    assert.deepEqual(flags['UX-01'], [true, false, false]);
    assert.deepEqual(flags['UX-04'], [false, true, false]);
    assert.deepEqual(flags['UX-06'], [false, false, true]);
  });

  test('gleiche Eingabe gibt gleiche Ausgabe', () => {
    assert.deepEqual(loadCatalog(), loadCatalog());
  });
});

test.describe('verdict: Validierung', () => {
  test('gültige Eingabe hat keine Fehler', () => {
    assert.deepEqual(validate(readyInput(), catalog).errors, []);
  });

  test('fehlendes Kriterium wird gemeldet', () => {
    const bad = readyInput();
    bad.urteile = bad.urteile.filter((u) => u.id !== 'PF-03');
    assert.ok(validate(bad, catalog).errors.includes('PF-03: nicht bewertet'));
  });

  test('doppelte und unbekannte IDs werden gemeldet', () => {
    const bad = readyInput();
    bad.urteile.push({ ...bad.urteile[0] }, { id: 'XX-01', urteil: 'erfüllt', begruendung: 'x', fundstelle: 'y' });
    const { errors } = validate(bad, catalog);
    assert.ok(errors.includes('PF-01: mehrfach bewertet'));
    assert.ok(errors.includes('XX-01: unbekannte Kriterien-ID'));
  });

  test('Urteil "Ready" ist ungültig', () => {
    const bad = readyInput();
    bad.urteile[0].urteil = 'Ready';
    assert.match(validate(bad, catalog).errors[0], /PF-01: urteil "Ready" ungültig/);
  });

  test('gelieferter Gesamturteil-Wert wird abgelehnt', () => {
    const bad = { ...readyInput(), gesamturteil: 'Ready' };
    assert.ok(validate(bad, catalog).errors.some((e) => e.startsWith('gesamturteil')));
  });

  test('nicht zutreffend ohne Bestätigung ist ungültig', () => {
    const bad = input({ 'UX-06': { ...notApplicable, bestaetigt: false } });
    assert.ok(validate(bad, catalog).errors.some((e) => e.startsWith('UX-06: nicht zutreffend')));
  });

  test('Data Flow bleibt ohne UI Pflicht', () => {
    const bad = input({ 'UX-04': notApplicable }, { hatUI: false });
    assert.ok(validate(bad, catalog).errors.some((e) => e.startsWith('UX-04: Data-Flow')));
  });

  test('bewusste Abweichung braucht alle vier Risikofelder', () => {
    const bad = input({
      'UX-06': notApplicable,
      'PF-01': { urteil: 'bewusst abgewichen', begruendung: 'Zeitdruck', abweichung: { was: 'x', warum: 'y' } },
    });
    assert.ok(validate(bad, catalog).errors.includes('PF-01: abweichung braucht verantwortlich, massnahme'));
  });

  test('erfüllt braucht Fundstelle oder Nachweis', () => {
    const bad = input({ 'UX-06': notApplicable, 'PF-01': { fundstelle: undefined } });
    assert.ok(validate(bad, catalog).errors.includes('PF-01: erfüllt braucht fundstelle oder nachweis'));
  });

  test('Paket verlangt Artefaktnamen in der Fundstelle', () => {
    const paket = input(
      { 'UX-06': notApplicable, 'PF-01': { fundstelle: 'Zeile 4' } },
      { umfang: 'Paket', quellen: ['workitem.md', 'spec.md'] },
    );
    const { errors } = validate(paket, catalog);
    assert.ok(errors.some((e) => e.startsWith('PF-01: fundstelle muss im Paket')));
  });

  test('Einzel und Paket prüfen die Anzahl der Quellen', () => {
    assert.ok(validate({ ...readyInput(), quellen: ['a', 'b'] }, catalog).errors.some((e) => e.includes('genau eine')));
    assert.ok(validate({ ...readyInput(), umfang: 'Paket' }, catalog).errors.some((e) => e.includes('mindestens zwei')));
  });

  test('UI-Widersprüche erzeugen Warnungen, keine Fehler', () => {
    const { errors, warnings } = validate(readyInput(), catalog);
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.startsWith('UX-06')) === false);
    const noUi = validate(input({}, { hatUI: false }), catalog);
    assert.ok(noUi.warnings.some((w) => w.startsWith('UX-01')));
  });
});

test.describe('verdict: Aggregation und Ausgabe', () => {
  test('alles erfüllt oder nicht zutreffend gibt "bereit für den Review"', () => {
    const result = aggregate(readyInput(), catalog);
    assert.equal(result.gesamt, 'bereit für den Review');
    assert.deepEqual(result.gaps, []);
  });

  test('jede Lücke macht das Gesamturteil "nicht bereit"', () => {
    for (const urteil of ['nicht erfüllt', 'nicht prüfbar']) {
      const result = aggregate(input({ 'UX-06': notApplicable, 'PF-02': { urteil, begruendung: 'fehlt' } }), catalog);
      assert.equal(result.gesamt, 'nicht bereit');
      assert.deepEqual(result.gaps.map((g) => g.criterion.id), ['PF-02']);
    }
  });

  test('bewusste Abweichung hält "nicht bereit" und steht unter Abweichungen', () => {
    const deviated = input({
      'UX-06': notApplicable,
      'PF-02': {
        urteil: 'bewusst abgewichen',
        begruendung: 'Zeitdruck',
        abweichung: { was: 'Nutzen fehlt', warum: 'Termin', verantwortlich: 'PO', massnahme: 'Nachtrag Sprint 3' },
      },
    });
    const out = render(deviated, catalog, []);
    assert.match(out, /\*\*Gesamturteil:\*\* nicht bereit/);
    assert.match(out, /verantwortlich: PO; Maßnahme: Nachtrag Sprint 3/);
  });

  test('fehlende Fundstelle steht als "Fundstelle: keine" in der Ausgabe', () => {
    const gap = input({ 'UX-06': notApplicable, 'PF-02': { urteil: 'nicht erfüllt', fundstelle: undefined } });
    assert.match(render(gap, catalog, []), /\| PF-02 \|[^\n]*Fundstelle: keine/);
  });

  test('Ausgabe nennt nie "Ready" als Urteil und weist auf den Review hin', () => {
    const out = render(readyInput(), catalog, []);
    assert.doesNotMatch(out, /Gesamturteil:\*\* Ready/);
    assert.ok(out.trimEnd().endsWith('„Ready“ vergibt erst der Review durch Mensch oder Team.'));
    assert.match(out, /PF-10 und LM-01 stehen inhaltlich doppelt/);
  });

  test('gleiche Eingabe gibt byte-gleiche Ausgabe', () => {
    assert.equal(render(readyInput(), catalog, []), render(readyInput(), catalog, []));
  });
});

test.describe('verdict: CLI', () => {
  function run(payload) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dor-')), 'urteile.json');
    fs.writeFileSync(file, JSON.stringify(payload));
    return spawnSync('node', [path.join(scripts, 'dor-verdict.js'), file], { encoding: 'utf8' });
  }

  test('gültige Eingabe: Exit 0 und Markdown', () => {
    const result = run(readyInput());
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\*\*Gesamturteil:\*\* bereit für den Review/);
  });

  test('ungültige Eingabe: Exit 1 und Fehlerliste auf stderr', () => {
    const bad = readyInput();
    bad.urteile = bad.urteile.slice(1);
    const result = run(bad);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /FEHLER: PF-01: nicht bewertet/);
  });
});

test.describe('lint', () => {
  const rules = (text) => lint(text).befunde.map((b) => b.regel);

  test('sauberes AC ohne Befunde zu AC-Regeln', () => {
    const text = '- **AC-01** Gegeben eine Liste mit 3 Einträgen, wenn der Anwender exportiert, dann erhält er 3 Zeilen.';
    const found = rules(text).filter((r) => r !== 'stichwort-fehlt');
    assert.deepEqual(found, []);
  });

  test('AC ohne wenn/dann und unscharfes Wort', () => {
    const text = '- **AC-01** Der Export funktioniert korrekt und sollte schnell sein.';
    const found = rules(text);
    assert.ok(found.includes('ac-form'));
    assert.equal(found.filter((r) => r === 'unscharfes-wort').length, 3);
  });

  test('AC-IDs: einstellig und Lücke', () => {
    const text = [
      '- **AC-1** Gegeben a, wenn b, dann c.',
      '- **AC-03** Gegeben a, wenn b, dann c.',
    ].join('\n');
    const found = rules(text);
    assert.ok(found.includes('ac-id-format'));
    assert.ok(found.includes('ac-id-folge'));
  });

  test('Platzhalter werden mit Zeile gemeldet', () => {
    const result = lint('Titel\nTODO klären\n');
    const hit = result.befunde.find((b) => b.regel === 'platzhalter');
    assert.equal(hit.zeile, 2);
  });

  test('Implementierungsdetail im AC', () => {
    const text = '- **AC-01** Gegeben a, wenn b, dann speichert der OrderService in `orders.cs`.';
    assert.ok(rules(text).includes('implementierungsdetail'));
  });

  test('Gherkin-Szenario ohne Dann', () => {
    const text = 'Szenario: Export\n  Gegeben eine Liste\n  Wenn ich exportiere\n';
    assert.deepEqual(
      lint(text).befunde.filter((b) => b.regel === 'gherkin-unvollstaendig').map((b) => b.hinweis),
      ['Szenario ohne Dann/Then'],
    );
  });

  test('Stichworte und Wikilinks', () => {
    const result = lint('Scope: Export. Nicht-Ziele: Import. Risiken: keine. Test: manuell. [[Konzept]]');
    const missing = result.stichworte.filter((s) => !s.gefunden).map((s) => s.name);
    assert.deepEqual(missing, ['Quelle', 'Ansprechpartner', 'Abhängigkeiten', 'Akzeptanzkriterien']);
    assert.equal(result.statistik.wikilinks, 1);
  });

  test('"ungeklärt" ist ein offener Punkt, Stichworte nennen die Fundzeile', () => {
    const result = lint('Scope: Export\n- **AC-01** Gegeben a, wenn b, dann c. · ungeklärt');
    assert.deepEqual(result.befunde.filter((b) => b.regel === 'offener-punkt').map((b) => b.zeile), [2]);
    assert.equal(result.stichworte.find((s) => s.name === 'Scope').zeile, 1);
  });

  test('Punkte unter "## Akzeptanzkriterien" ohne AC-Kennung werden geprüft', () => {
    const text = [
      '## Akzeptanzkriterien',
      '- Der Export funktioniert korrekt.',
      '- Der Export sollte schnell sein.',
      '- Der OrderExportService schreibt nach `export/orders.csv`.',
      '- Gegeben eine Liste, wenn ich exportiere, dann erhalte ich eine Datei.',
    ].join('\n');
    const result = lint(text);
    const byRule = (rule) => result.befunde.filter((b) => b.regel === rule);
    assert.equal(result.statistik.acAbschnittPunkte, 4);
    assert.deepEqual(byRule('ac-form').map((b) => b.zeile), [2, 3, 4]);
    assert.equal(byRule('unscharfes-wort').length, 3);
    assert.ok(byRule('implementierungsdetail').length >= 1);
    assert.equal(result.stichworte.find((s) => s.name === 'Akzeptanzkriterien').gefunden, true);
  });

  test('gleiche Eingabe gibt gleiche Ausgabe', () => {
    const text = 'TODO\n- **AC-02** Der Export sollte schnell sein.';
    assert.deepEqual(lint(text), lint(text));
  });
});
