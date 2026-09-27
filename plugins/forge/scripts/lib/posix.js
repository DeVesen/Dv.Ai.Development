'use strict';

function toPosix(value) {
  return String(value).replace(/\\/g, '/');
}

module.exports = { toPosix };
