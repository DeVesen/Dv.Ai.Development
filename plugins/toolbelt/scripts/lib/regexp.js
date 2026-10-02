'use strict';

// Gemeinsame Hilfe für reguläre Ausdrücke aus freiem Text.

// Maskiert alle Sonderzeichen, damit `text` in einem RegExp wörtlich passt.
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegExp };
