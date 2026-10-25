#!/usr/bin/env node
'use strict';

// Glossar-Konformität einer Spec: meldet verworfene Synonyme (Spalte „Nicht verwenden“ des Glossars) außerhalb von W-Einträgen als 🟡.
// Ausgabe: `TERME hinweise=<n> glossare=<m>` und je Hinweis eine Zeile. Das Glossar ist eine Datei oder ein Ordner mit Markdown-Dateien.
// Exit 0 auch mit Hinweisen (Kandidaten, keine Fehler), 2 bei falschem Aufruf oder unlesbarer Spec.

const fs = require('node:fs');
const { glossaryFiles, discardedTerms, termFindings } = require('./lib/glossary-terms');

const USAGE = 'Aufruf: node spec-terms.js <spec.md> <glossar-datei-oder-ordner>\n';

function main() {
  const [spec, glossary, ...rest] = process.argv.slice(2);
  if (!spec || !glossary || rest.length > 0) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  let text;
  try {
    text = fs.readFileSync(spec, 'utf8');
  } catch {
    process.stderr.write(`Spec nicht lesbar: ${spec}\n`);
    process.exit(2);
  }
  const files = glossaryFiles(glossary);
  const findings = termFindings(text, discardedTerms(files));
  const lines = findings.map((entry) => `GELB ${entry.location}: ${entry.consequence}`);
  process.stdout.write(`${[`TERME hinweise=${findings.length} glossare=${files.length}`, ...lines].join('\n')}\n`);
}

if (require.main === module) main();
