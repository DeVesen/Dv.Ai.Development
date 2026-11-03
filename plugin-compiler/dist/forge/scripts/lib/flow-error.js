'use strict';

// Fehler im Ablauf; review-flow.js meldet ihn als `dv-forge review-flow: <grund>` mit Exit 1.
class FlowError extends Error {}

module.exports = { FlowError };
