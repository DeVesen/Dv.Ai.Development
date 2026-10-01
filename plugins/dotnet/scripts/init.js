#!/usr/bin/env node
'use strict';

// Init für dv-dotnet: Hinweisblock in der CLAUDE.md, auf Wunsch Hook-Schalter und MCP-Server.
// Die Fragen stellt der Skill init; den Ablauf hält lib/project-setup.js, hier steht nur der Stack.

const setup = require('./lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };

function initProject(args) {
  return setup.initProject(args, STACK);
}

if (require.main === module) setup.runInit(STACK, process.argv.slice(2));

module.exports = { parseArgs: setup.parseArgs, initProject };
