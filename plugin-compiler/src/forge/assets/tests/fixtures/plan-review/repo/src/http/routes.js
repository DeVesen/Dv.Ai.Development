'use strict';

function registerRoutes(app, orderService) {
  app.get('/health', (request, response) => response.json({ ok: true }));
}

module.exports = { registerRoutes };
