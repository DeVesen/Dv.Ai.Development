'use strict';

// Liest den DoR-Katalog und gibt die Kriterien mit stabilen IDs als JSON aus.
// Aufruf: node dor-catalog.js [--catalog <pfad>]

const { loadCatalog, DEFAULT_CATALOG } = require('./lib/catalog');

function catalogPathFrom(argv) {
  const index = argv.indexOf('--catalog');
  return index === -1 ? DEFAULT_CATALOG : argv[index + 1];
}

function main(argv) {
  try {
    const catalog = loadCatalog(catalogPathFrom(argv));
    process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`FEHLER: ${error.message}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main };
